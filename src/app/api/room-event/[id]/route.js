import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import Room from "@/models/room";
import { auth } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { pushEventToGoogle, removeEventFromGoogle } from "@/lib/googleCalendar";
import moment from "moment";

// Immediate, awaited event sync may hit the Google API for several participants.
export const maxDuration = 60;

// Every participant an event could touch (for cleanup across old + new members).
const partsOf = (e) => [...(e?.teacher_email ?? []), ...(e?.host ?? []), ...(e?.attendees ?? [])];

async function checkAuthorized(session, eventId) {
  if (!session?.user) return { authorized: false, isPrivileged: false, event: null };

  const event = await CalendarEvent.findById(eventId).populate("room");
  if (!event) return { authorized: false, isPrivileged: false, event: null };

  if (session.user.isAdmin) return { authorized: true, isPrivileged: true, event };

  // Creator or host can also act on their own events (non-privileged)
  const isCreator = (event.teacher_email ?? []).includes(session.user.email);
  const isHost = (event.host ?? []).includes(session.user.email);
  return { authorized: isCreator || isHost, isPrivileged: false, event };
}

export const PUT = async (request, { params }) => {
  const session = await auth();

  try {
    const { id } = params;
    const body = await request.json();

    await connectToDb();
    const { authorized, isPrivileged, event } = await checkAuthorized(session, id);
    if (!authorized) return NextResponse.json({ success: false }, { status: 401 });

    const update = {};
    if (body.title !== undefined) update.title = body.title;
    if (body.note !== undefined) update.tags = body.note ? [body.note] : [];
    if (body.host !== undefined) update.host = body.host;
    if (body.attendees !== undefined) update.attendees = body.attendees;

    const timeChanged = body.start !== undefined || body.end !== undefined;
    // Normalise both sides to "" when empty so a no-room event edited with an
    // empty roomId (e.g. a note-only change) is NOT seen as a room change — that
    // would wrongly force re-approval.
    const curRoom = event.room?._id ? String(event.room._id) : (event.room ? String(event.room) : "");
    const newRoom = body.roomId ? String(body.roomId) : "";
    const roomChanged = body.roomId !== undefined && newRoom !== curRoom;

    if (body.start) update.start = new Date(body.start);
    if (body.end) update.end = new Date(body.end);
    // Room is optional: an explicit empty roomId clears it (event with no room).
    if (body.roomId !== undefined) update.room = body.roomId || null;

    // Don't allow moving an event into the past (or an invalid window).
    if (timeChanged) {
      const s = update.start ?? event.start;
      const e = update.end ?? event.end;
      const sd = new Date(s), ed = new Date(e);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime()) || ed <= sd) {
        return NextResponse.json({ success: false, message: "Khoảng thời gian không hợp lệ." }, { status: 400 });
      }
      // Admins may set past times (backfill); everyone else is blocked.
      if (!session.user.isAdmin && sd.getTime() < Date.now()) {
        return NextResponse.json({ success: false, message: "Không thể đặt phòng cho thời gian trong quá khứ." }, { status: 400 });
      }
    }

    // Non-privileged users editing time or room → back to pending
    if (!isPrivileged && (timeChanged || roomChanged)) {
      update.status = "pending";
    }

    const updated = await CalendarEvent.findByIdAndUpdate(id, update, { new: true }).populate("room");

    // Notify people newly added as host/attendee (they weren't invited before)
    // so the event lands on their calendar with a heads-up.
    try {
      const before = new Set([...(event.host ?? []), ...(event.attendees ?? [])]);
      const added = [...(updated.host ?? []), ...(updated.attendees ?? [])].filter(
        (e) => e && e !== session.user.email && !before.has(e)
      );
      if (added.length) {
        const when = `${moment(updated.start).format("DD/MM HH:mm")}–${moment(updated.end).format("HH:mm")}`;
        await notify([...new Set(added)], {
          type: "info",
          title: "Bạn được mời tham dự",
          message: `"${updated.title}" tại ${updated.room?.title || "phòng"} — ${when}`,
          link: "/booking",
          event: updated._id,
        });
      }
    } catch (e) {
      console.error("notify(edit-invite) failed:", e);
    }

    // Reflect the edit in participants' Google Calendars: clear the old copy
    // everywhere (covers dropped members, room/time change, or going back to
    // pending), then re-push to the current approved participants.
    try {
      await removeEventFromGoogle(id, partsOf(event));
      await pushEventToGoogle(updated.toObject());
    } catch (e) {
      console.error("gcal push (edit) failed:", e?.message);
    }

    return NextResponse.json({ success: true, event: updated });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};

export const PATCH = async (request, { params }) => {
  const session = await auth();

  try {
    const { id } = params;
    const { status } = await request.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
    }

    await connectToDb();
    const { authorized, event } = await checkAuthorized(session, id);

    if (!authorized) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // Idempotent: already in the requested state (double-click, retry, a second
    // approver, or a duplicate request) → don't re-run side effects or re-send
    // the decision notification. This is what caused two identical "đã được
    // duyệt" notifications for a single approval.
    if (event.status === status) {
      return NextResponse.json({ success: true, event, alreadyInState: true }, { status: 200 });
    }

    // Re-check conflicts at approval time: a slot free when the request was made
    // may have been taken since. Refuse to approve into an occupied slot.
    if (status === "approved" && event?.start && event?.end && event?.room) {
      const roomId = event.room?._id ?? event.room;
      const clash = await CalendarEvent.findOne({
        _id: { $ne: event._id },
        room: roomId,
        status: "approved",
        isCancelled: { $ne: true },
        start: { $lt: event.end },
        end: { $gt: event.start },
      }).lean();
      if (clash) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot approve: the room is already booked by "${clash.title}" at this time.`,
            conflict: { title: clash.title, start: clash.start, end: clash.end },
          },
          { status: 409 }
        );
      }
    }

    // Only transition if it isn't already in the target state — makes two
    // concurrent approvals race-safe: only the one that actually flips the
    // status proceeds to notify; the loser no-ops.
    const updated = await CalendarEvent.findOneAndUpdate(
      { _id: id, status: { $ne: status } },
      { status },
      { new: true }
    ).populate("room");

    if (!updated) {
      // Someone else just set the same status (race) — no-op, don't re-notify.
      return NextResponse.json({ success: true, alreadyInState: true }, { status: 200 });
    }

    // Notify the requester of the decision.
    try {
      const recipients = [...(event.teacher_email ?? []), ...(event.host ?? [])];
      const when = `${moment(updated.start).format("DD/MM HH:mm")}–${moment(updated.end).format("HH:mm")}`;
      await notify(recipients, {
        type: status === "approved" ? "approved" : "rejected",
        title: status === "approved" ? "Yêu cầu mượn phòng đã được duyệt" : "Yêu cầu mượn phòng bị từ chối",
        message: `"${updated.title}" · ${updated.room?.title || "phòng"} · ${when}`,
        link: "/booking?tab=event_booking",
        event: updated._id,
      });
    } catch (e) {
      console.error("notify(decision) failed:", e);
    }

    // Approving one request frees no one else: auto-reject any OTHER pending
    // requests that overlap the same room/time (they can never be approved now)
    // and notify their owners, so they don't linger unresolved.
    if (status === "approved") {
      try {
        const roomId = updated.room?._id ?? updated.room;
        const losers = await CalendarEvent.find({
          _id: { $ne: updated._id },
          room: roomId,
          status: "pending",
          isCancelled: { $ne: true },
          start: { $lt: updated.end },
          end: { $gt: updated.start },
        }).lean();
        if (losers.length) {
          await CalendarEvent.updateMany(
            { _id: { $in: losers.map((l) => l._id) } },
            { $set: { status: "rejected" } }
          );
          for (const l of losers) {
            const recips = [...(l.teacher_email ?? []), ...(l.host ?? [])];
            const when = `${moment(l.start).format("DD/MM HH:mm")}–${moment(l.end).format("HH:mm")}`;
            await notify(recips, {
              type: "rejected",
              title: "Yêu cầu mượn phòng bị từ chối (trùng lịch)",
              message: `"${l.title}" · ${updated.room?.title || "phòng"} · ${when} — phòng đã được duyệt cho một yêu cầu khác.`,
              link: "/booking?tab=event_booking",
              event: l._id,
            });
          }
          // Losers were rejected — make sure they're not on anyone's Google.
          for (const l of losers) {
            try {
              await removeEventFromGoogle(l._id, partsOf(l));
            } catch (e) {
              console.error("gcal remove (loser) failed:", e?.message);
            }
          }
        }
      } catch (e) {
        console.error("auto-reject conflicting pendings failed:", e);
      }
    }

    // Approve → push it to participants' Google; reject → remove it.
    try {
      if (status === "approved") await pushEventToGoogle(updated.toObject());
      else await removeEventFromGoogle(updated._id, partsOf(updated));
    } catch (e) {
      console.error("gcal push (decision) failed:", e?.message);
    }

    return NextResponse.json({ success: true, event: updated }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};

export const DELETE = async (request, { params }) => {
  const session = await auth();

  try {
    const { id } = params;
    await connectToDb();

    const { authorized, event } = await checkAuthorized(session, id);
    if (!authorized) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await CalendarEvent.findByIdAndDelete(id);

    // Notify the owner/host when someone ELSE (admin/manager) deletes their
    // event — so a booking never disappears silently.
    try {
      const owners = [...(event.teacher_email ?? []), ...(event.host ?? [])].filter(
        (e) => e && e !== session.user.email
      );
      if (owners.length) {
        const when = `${moment(event.start).format("DD/MM HH:mm")}–${moment(event.end).format("HH:mm")}`;
        await notify(owners, {
          type: "deleted",
          title: "Sự kiện mượn phòng đã bị xoá",
          message: `"${event.title}" · ${event.room?.title || "phòng"} · ${when} đã bị quản trị viên/quản lý phòng xoá.`,
          link: "/booking?tab=event_booking",
        });
      }
    } catch (e) {
      console.error("notify(delete) failed:", e);
    }

    // Remove it from participants' Google Calendars.
    try {
      await removeEventFromGoogle(id, partsOf(event));
    } catch (e) {
      console.error("gcal remove (delete) failed:", e?.message);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import Room from "@/models/room";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { syncEmailsInBackground } from "@/lib/googleCalendar";
import moment from "moment";

export const GET = async (request) => {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("room");
    const managed = searchParams.get("managed");

    await connectToDb();

    if (managed === "true") {
      // Room manager: return all events for rooms they manage
      if (!session?.user) {
        return NextResponse.json([], { status: 401 });
      }
      const managedRooms = await Room.find({ managers: session.user.email }, "_id");
      const roomIds = managedRooms.map((r) => r._id);
      const events = await CalendarEvent.find({
        room: { $in: roomIds },
        type: { $ne: "class" },
      })
        .populate("room")
        .sort({ start: 1 });
      return NextResponse.json(events);
    }

    const mine = searchParams.get("mine");
    if (mine === "true") {
      // Return all events where the current user is a teacher, host, or attendee
      if (!session?.user) {
        return NextResponse.json([], { status: 401 });
      }
      const email = session.user.email;
      const events = await CalendarEvent.find({
        type: { $ne: "class" },
        $or: [
          { teacher_email: email },
          { host: email },
          { attendees: email },
        ],
      })
        .populate("room")
        .sort({ start: -1 });
      return NextResponse.json(events);
    }

    if (!roomId) return NextResponse.json([], { status: 400 });

    const events = await CalendarEvent.find({
      room: roomId,
      type: { $ne: "class" },
    })
      .populate("room")
      .sort({ start: 1 });

    return NextResponse.json(events);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

export const POST = async (request) => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
  }

  try {
    await connectToDb();
    const { roomId, title, start, end, note, host, attendees } = await request.json();

    if (!roomId || !title || !start || !end) {
      return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
    }

    const isAdmin = session.user.isAdmin;

    // Check if user is a manager of this room
    let isManager = false;
    if (!isAdmin) {
      const room = await Room.findById(roomId);
      if (!room) {
        return NextResponse.json({ success: false, message: "Room not found" }, { status: 404 });
      }
      isManager = Array.isArray(room.managers) && room.managers.includes(session.user.email);
      // Regular authenticated users can still submit (goes to pending); only admins/managers get auto-approved
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    // Reject invalid / past time windows — can't book a room for a time that has
    // already passed.
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      return NextResponse.json(
        { success: false, message: "Khoảng thời gian không hợp lệ." },
        { status: 400 }
      );
    }
    // Admins may backfill past bookings; everyone else is blocked.
    if (!isAdmin && startDate.getTime() < Date.now()) {
      return NextResponse.json(
        { success: false, message: "Không thể đặt phòng cho thời gian trong quá khứ." },
        { status: 400 }
      );
    }

    // Check for conflicts: approved events that overlap
    const conflict = await CalendarEvent.findOne({
      room: roomId,
      status: "approved",
      start: { $lt: endDate },
      end: { $gt: startDate },
    }).populate("room");

    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          message: "Time slot conflict with existing approved booking",
          conflict: {
            title: conflict.title,
            start: conflict.start,
            end: conflict.end,
          },
        },
        { status: 409 }
      );
    }

    // Auto-approve for admin or room managers
    const autoApprove = isAdmin || isManager;
    const newEvent = new CalendarEvent({
      title,
      type: "custom",
      status: autoApprove ? "approved" : "pending",
      start: startDate,
      end: endDate,
      room: roomId,
      teacher_email: [session.user.email],
      tags: note ? [note] : [],
      host: Array.isArray(host) && host.length ? host : [],
      attendees: Array.isArray(attendees) && attendees.length ? attendees : [],
    });

    await newEvent.save();

    // Notify the invited people (host + attendees) so the meeting/event shows on
    // their personal calendar and they get a heads-up. Exclude the creator.
    try {
      const invited = [
        ...(newEvent.host ?? []),
        ...(newEvent.attendees ?? []),
      ].filter((e) => e && e !== session.user.email);
      if (invited.length) {
        const room = await Room.findById(roomId, "title").lean();
        const when = `${moment(startDate).format("DD/MM HH:mm")}–${moment(endDate).format("HH:mm")}`;
        await notify(invited, {
          type: "info",
          title: autoApprove ? "Bạn được mời tham dự" : "Bạn được mời tham dự (chờ duyệt)",
          message: `"${title}" tại ${room?.title || "phòng"} — ${when}`,
          link: "/booking",
          event: newEvent._id,
        });
      }
    } catch (e) {
      console.error("notify(invite) failed:", e);
    }

    // Notify room managers + admins when a request needs approval.
    if (!autoApprove) {
      try {
        const room = await Room.findById(roomId, "title managers").lean();
        const admins = await User.find({ isAdmin: true }, "email").lean();
        const recipients = [
          ...(room?.managers ?? []),
          ...admins.map((a) => a.email),
        ].filter((e) => e && e !== session.user.email);
        await notify(recipients, {
          type: "approval",
          title: "Yêu cầu mượn phòng cần duyệt",
          message: `${session.user.email} yêu cầu mượn ${room?.title || "phòng"} — ${moment(startDate).format("DD/MM HH:mm")}–${moment(endDate).format("HH:mm")}: "${title}"`,
          link: "/room-manager",
          event: newEvent._id,
        });
      } catch (e) {
        console.error("notify(create) failed:", e);
      }
    }

    // If the event is already approved, push it to the participants' linked
    // Google Calendars right away (no-op for anyone not connected).
    if (autoApprove) {
      syncEmailsInBackground([session.user.email, ...(newEvent.host ?? []), ...(newEvent.attendees ?? [])]);
    }

    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import Room from "@/models/room";
import { auth } from "@/lib/auth";

async function checkAuthorized(session, eventId) {
  if (!session?.user) return { authorized: false, isPrivileged: false, event: null };

  const event = await CalendarEvent.findById(eventId).populate("room");
  if (!event) return { authorized: false, isPrivileged: false, event: null };

  if (session.user.isAdmin) return { authorized: true, isPrivileged: true, event };

  const room = event.room;
  const isManager = room && Array.isArray(room.managers) && room.managers.includes(session.user.email);
  if (isManager) return { authorized: true, isPrivileged: true, event };

  // Creator or host can also act on their own events
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
    const roomChanged = body.roomId !== undefined && String(body.roomId) !== String(event.room?._id ?? event.room);

    if (body.start) update.start = new Date(body.start);
    if (body.end) update.end = new Date(body.end);
    if (body.roomId) update.room = body.roomId;

    // Non-privileged users editing time or room → back to pending
    if (!isPrivileged && (timeChanged || roomChanged)) {
      update.status = "pending";
    }

    const updated = await CalendarEvent.findByIdAndUpdate(id, update, { new: true }).populate("room");
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

    const updated = await CalendarEvent.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    ).populate("room");

    if (!updated) {
      return NextResponse.json({ success: false, message: "Event not found" }, { status: 404 });
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

    const { authorized } = await checkAuthorized(session, id);
    if (!authorized) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    await CalendarEvent.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import Room from "@/models/room";
import { auth } from "@/lib/auth";

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
    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
};

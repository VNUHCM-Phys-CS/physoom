"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import "@/models/course"; // ensure Course schema is registered for populate
import { auth } from "@/lib/auth";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const rooms = searchParams.get('rooms'); // comma-separated room IDs
    let filter = {};
    if (type) {
        if (type.includes(',')) filter.type = { $in: type.split(',') };
        else filter.type = type;
    }
    if (rooms) {
        filter.room = { $in: rooms.split(',') };
    }

    await connectToDb();
    const events = await CalendarEvent.find(filter)
        .populate("course")
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
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const data = await request.json();
    
    const newEvent = new CalendarEvent({
       title: data.title,
       type: data.type,
       status: data.status || 'approved',
       start: new Date(data.start),
       end: new Date(data.end),
       room: data.room || undefined,
       course: data.course || undefined,
       teacher_email: data.teacher_email || []
    });
    
    await newEvent.save();
    return NextResponse.json({ success: true, event: newEvent }, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

export const PUT = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const data = await request.json();
    const { _id, ...updateData } = data;
    
    if (updateData.start) updateData.start = new Date(updateData.start);
    if (updateData.end) updateData.end = new Date(updateData.end);

    const updatedEvent = await CalendarEvent.findByIdAndUpdate(_id, updateData, { new: true });
    return NextResponse.json({ success: true, event: updatedEvent }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

export const DELETE = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const { id, ids } = await request.json();
    if (ids && Array.isArray(ids)) {
        await CalendarEvent.deleteMany({ _id: { $in: ids } });
    } else if (id) {
        await CalendarEvent.findByIdAndDelete(id);
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

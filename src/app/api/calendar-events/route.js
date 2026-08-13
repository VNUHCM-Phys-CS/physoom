"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import "@/models/room";   // ensure Room schema is registered for populate
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
    const targetIds = ids && Array.isArray(ids) ? ids : id ? [id] : [];
    if (!targetIds.length) {
      return NextResponse.json({ success: false, message: "Thiếu id" }, { status: 400 });
    }

    // Guard: never delete a term that still has courses linked to it — that
    // would orphan every course/schedule in that term. Reassign/clear those
    // courses' term first.
    const terms = await CalendarEvent.find({ _id: { $in: targetIds }, type: "term" }, "_id title").lean();
    for (const term of terms) {
      const n = await Course.countDocuments({ term: term._id });
      if (n > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Không thể xoá học kỳ "${term.title}" vì còn ${n} môn thuộc học kỳ này. Hãy chuyển/gỡ học kỳ của các môn đó trước.`,
            blockedTerm: String(term._id),
            courseCount: n,
          },
          { status: 409 }
        );
      }
    }

    await CalendarEvent.deleteMany({ _id: { $in: targetIds } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

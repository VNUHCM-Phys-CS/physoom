"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import { createEvents } from "ics";

export const GET = async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const teacher_email = searchParams.get('teacher_email');

    if (!teacher_email) {
      return NextResponse.json({ error: "Missing teacher_email parameter" }, { status: 400 });
    }

    await connectToDb();
    const events = await CalendarEvent.find({ 
      teacher_email: teacher_email,
      status: 'approved',
      isCancelled: false
    }).populate('course room').lean();

    if (!events.length) {
      return NextResponse.json({ message: "No events found" }, { status: 404 });
    }

    const icsEvents = events.map(e => {
       const start = new Date(e.start);
       const end = new Date(e.end);
       return {
         title: e.title + (e.course ? ` - ${e.course.title}` : ''),
         description: `Course: ${e.course?.title || 'N/A'}\nRoom: ${e.room?.title || 'N/A'}\nTeacher: ${e.teacher_email.join(', ')}`,
         start: [start.getFullYear(), start.getMonth() + 1, start.getDate(), start.getHours(), start.getMinutes()],
         end: [end.getFullYear(), end.getMonth() + 1, end.getDate(), end.getHours(), end.getMinutes()],
         location: e.room?.title || '',
       };
    });

    const { error, value } = createEvents(icsEvents);

    if (error) {
      console.log(error);
      return NextResponse.json({ error: "Failed to generate ICS" }, { status: 500 });
    }

    const headers = new Headers();
    headers.set('Content-Type', 'text/calendar');
    headers.set('Content-Disposition', `attachment; filename="schedule_${teacher_email}.ics"`);

    return new NextResponse(value, { status: 200, headers });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

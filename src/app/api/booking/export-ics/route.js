"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import "@/models/course"; // register schemas for .populate('course room')
import "@/models/room";
import User from "@/models/user";
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
       const name = e.course?.title || e.title || 'Event';
       // Use UTC parts + utc input type so the times are correct in any
       // calendar app regardless of the server's timezone.
       const toUtcParts = (d) => [
         d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(),
       ];
       return {
         title: e.room?.title ? `${name} · ${e.room.title}` : name,
         description: `Course: ${e.course?.title || 'N/A'}\nRoom: ${e.room?.title || 'N/A'}\nTeacher: ${(e.teacher_email || []).join(', ')}`,
         start: toUtcParts(start),
         startInputType: 'utc',
         end: toUtcParts(end),
         endInputType: 'utc',
         location: e.room?.title || '',
       };
    });

    const { error, value } = createEvents(icsEvents);

    if (error) {
      console.log(error);
      return NextResponse.json({ error: "Failed to generate ICS" }, { status: 500 });
    }

    // Give the calendar a meaningful name (else Google/Apple show the raw feed
    // URL as the calendar title). Include the lecturer's name when known.
    const u = await User.findOne({ email: teacher_email }, "name").lean();
    const escapeIcs = (s) => String(s || "").replace(/([\\,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
    const calName = escapeIcs(u?.name ? `Physoom – ${u.name}` : `Physoom – ${teacher_email}`);
    const calDesc = escapeIcs("Lịch giảng dạy · Physoom");
    const injected =
      `X-WR-CALNAME:${calName}\r\n` +
      `X-WR-CALDESC:${calDesc}\r\n` +
      `X-WR-TIMEZONE:Asia/Ho_Chi_Minh\r\n`;
    let icsValue = /PRODID:[^\r\n]*\r?\n/.test(value)
      ? value.replace(/(PRODID:[^\r\n]*\r?\n)/, `$1${injected}`)
      : value.replace(/(BEGIN:VCALENDAR\r?\n)/, `$1${injected}`);

    const headers = new Headers();
    headers.set('Content-Type', 'text/calendar');
    headers.set('Content-Disposition', `attachment; filename="schedule_${teacher_email}.ics"`);

    return new NextResponse(icsValue, { status: 200, headers });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

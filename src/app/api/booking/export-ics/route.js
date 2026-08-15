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
       // Class/cohort code(s) — e.g. 24VLH2_TN, 25CVD — so the event shows which
       // class it belongs to, not just the course title.
       const cls = Array.isArray(e.course?.class_id)
         ? e.course.class_id.filter(Boolean).join(", ")
         : (e.course?.class_id || "");
       // Use UTC parts + utc input type so the times are correct in any
       // calendar app regardless of the server's timezone.
       const toUtcParts = (d) => [
         d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(),
       ];
       const titleParts = [name, cls, e.room?.title].filter(Boolean);
       return {
         // STABLE uid per occurrence — the `ics` lib otherwise assigns a random
         // uid each generation, so every refresh looks like new events to
         // Google/Apple (duplicates/churn). Anchoring to the DB id keeps them
         // matched across refreshes.
         uid: `${e._id}@physoom.vercel.app`,
         title: titleParts.join(" · "),
         description:
           `Môn: ${e.course?.title || 'N/A'}\n` +
           `Lớp: ${cls || 'N/A'}\n` +
           `Phòng: ${e.room?.title || 'N/A'}\n` +
           `Giảng viên: ${(e.teacher_email || []).join(', ')}`,
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
    // charset so Vietnamese names render; inline (not attachment) so the same
    // URL works cleanly as a subscription feed. A short cache lets calendar
    // clients revalidate without hammering the DB, but not so long it goes stale.
    headers.set('Content-Type', 'text/calendar; charset=utf-8');
    headers.set('Content-Disposition', `inline; filename="physoom_${teacher_email}.ics"`);
    headers.set('Cache-Control', 'public, max-age=3600');

    return new NextResponse(icsValue, { status: 200, headers });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

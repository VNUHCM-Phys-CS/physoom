"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import User from "@/models/user";
import "@/models/room"; // register Room for populate
import { auth } from "@/lib/auth";
import moment from "moment";

// Availability data for the meeting planner.
// Returns, for the requested week, each teacher's busy intervals (weekday +
// minutes-from-midnight + campus). The client computes free/busy per meeting
// slot (campus/duration/travel-buffer) so the controls feel instant.
//
// body: { weekStart: ISO date (any day in the target week), teacherEmails?: [] }
export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    await connectToDb();
    const { weekStart, teacherEmails } = await request.json();

    // Week = Monday..Sunday of the given date, in Vietnam local time (UTC+7).
    const base = weekStart ? moment(weekStart) : moment();
    const monday = base.clone().utcOffset(420).startOf("isoWeek");
    // Convert VN-local midnight to the equivalent instant to bound the query.
    const VN = 7 * 60 * 60 * 1000;
    const rangeStart = new Date(Date.UTC(monday.year(), monday.month(), monday.date(), 0, 0, 0) - VN);
    const rangeEnd = new Date(rangeStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Teachers in scope.
    const teacherFilter = { teacher_id: { $exists: true, $nin: [null, ""] } };
    if (Array.isArray(teacherEmails) && teacherEmails.length) {
      teacherFilter.email = { $in: teacherEmails };
    }
    let teachers = await User.find(teacherFilter, "email name teacher_id").lean();
    if (!teachers.length) {
      // fall back to everyone with an email (some deployments don't fill MSCB)
      teachers = await User.find({}, "email name teacher_id").lean();
    }
    const emailSet = new Set(teachers.map((t) => t.email?.toLowerCase()).filter(Boolean));

    // All confirmed commitments in the week.
    const events = await CalendarEvent.find({
      start: { $gte: rangeStart, $lt: rangeEnd },
      status: "approved",
      isCancelled: { $ne: true },
    })
      .populate("room", "location title")
      .lean();

    const busy = {}; // email -> [{ day, a, b, campus, label }]
    for (const e of events) {
      const s = moment(e.start).utcOffset(420);
      const en = moment(e.end).utcOffset(420);
      const day = s.isoWeekday() - 1; // Mon=0 … Sun=6
      const a = s.hour() * 60 + s.minute();
      const b = en.hour() * 60 + en.minute();
      const campus = e.location || e.room?.location || "NVC";
      const label = e.title || e.room?.title || "";
      // Everyone tied to the event is busy: the teacher(s), host(s), attendees.
      const owners = [
        ...(e.teacher_email ?? []),
        ...(e.host ?? []),
        ...(e.attendees ?? []),
      ];
      for (const raw of owners) {
        const email = String(raw || "").toLowerCase();
        if (!emailSet.has(email)) continue;
        (busy[email] ||= []).push({ day, a, b, campus, label });
      }
    }

    return NextResponse.json(
      {
        weekStart: rangeStart,
        teachers: teachers.map((t) => ({ email: t.email, name: t.name || t.email })),
        busy,
      },
      { status: 200 }
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

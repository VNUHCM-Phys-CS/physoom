"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import mongoose from "mongoose";
import { includes } from "lodash";
import { auth } from "@/lib/auth";
import moment from "moment";
import { defaultGridLT, defaultGridNVC } from "@/lib/ulti";

/**
 * Convert a JS Date to minutes from midnight
 */
function dateToMinutes(date) {
  const d = new Date(date);
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * JS day of week (0=Sun) → booking weekday convention (2=Mon…7=Sat, 8=Sun)
 */
function jsWeekdayToBooking(jsDay) {
  if (jsDay === 0) return 8; // Sunday
  return jsDay + 1; // Mon=2 … Sat=7
}

/**
 * Maps minutes from midnight back to a grid label (Tiết)
 */
function minutesToLabel(minutes, gridData) {
  for (let slot of gridData) {
    // Check if minutes fall within start and end (with small buffer for floating point)
    if (minutes >= slot.timeData[0] - 1 && minutes < slot.timeData[1] - 1) {
      return slot.label;
    }
    // Check if exactly at the end
    if (Math.abs(minutes - slot.timeData[1]) < 2) return slot.label;
  }
  return Math.floor(minutes / 45); // Fallback
}

const weekdayNames = { 2: "Thứ 2", 3: "Thứ 3", 4: "Thứ 4", 5: "Thứ 5", 6: "Thứ 6", 7: "Thứ 7", 8: "Chủ nhật" };

/**
 * Generate weekly occurrence DateTimes, skipping holidays.
 */
function getOccurrences(start_date, end_date, weekday, start_minutes, end_minutes, holidays = []) {
  // weekday: 2=Mon, 3=Tue … 7=Sat, 8=Sun
  const targetJsDay = weekday === 8 ? 0 : weekday - 1;

  // Number of sessions the term intends. end_date is computed as
  // start_date + (duration-1) weeks, so this recovers `duration` regardless of
  // how start_date's weekday lines up with the class weekday.
  const targetCount = Math.max(
    1,
    Math.round(moment(end_date).diff(moment(start_date), "days") / 7) + 1
  );

  const isHolidayDay = (day) =>
    holidays.some((h) =>
      day.isBetween(
        moment(h.start).startOf("day"),
        moment(h.end).endOf("day"),
        undefined,
        "[]"
      )
    );

  // Vietnam is a fixed UTC+7 (no DST). Build occurrence instants explicitly in
  // VN local time so class times are correct regardless of the server's
  // timezone (Vercel runs in UTC). Take the calendar Y/M/D from the day and
  // add the minutes-from-midnight as VN local time.
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnInstant = (day, minutes) =>
    new Date(Date.UTC(day.year(), day.month(), day.date(), 0, 0, 0) - VN_OFFSET_MS + minutes * 60000);

  // Advance to the first class weekday on/after start_date.
  let current = moment(start_date).startOf("day");
  while (current.day() !== targetJsDay) current.add(1, "days");

  // Keep the number of sessions: a week that lands on a holiday is skipped and
  // compensated by extending into the following week(s). A safety cap prevents
  // an infinite loop if holidays were ever misconfigured to span everything.
  const occurrences = [];
  const MAX_WEEKS = targetCount + 26;
  let scanned = 0;
  while (occurrences.length < targetCount && scanned < MAX_WEEKS) {
    const occDay = current.clone().startOf("day");
    if (!isHolidayDay(occDay)) {
      occurrences.push({
        start: vnInstant(occDay, start_minutes),
        end: vnInstant(occDay, end_minutes),
      });
    }
    current.add(1, "weeks");
    scanned++;
  }
  return occurrences;
}

export const POST = async (request) => {
  const session = await auth();
  const user = session?.user;
  try {
    await connectToDb();
    let data = await request.json();

    const isAdmin = user && user.isAdmin;

    if (!isAdmin) {
      if (user && data[0] && includes(data[0].teacher_email, user.email)) {
        data = [data[0]];
      } else {
        return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
      }
    }

    const holidays = await CalendarEvent.find({ type: 'holiday', status: 'approved' }).lean();
    const allConflicts = [];
    const allCreated = [];

    for (let d of data) {
      const courseId = d.course?._id || d.course;
      const roomId = d.room?._id || d.room;
      const status = isAdmin ? 'approved' : 'pending';
      const series_id = d.series_id || new mongoose.Types.ObjectId().toString();

      const { weekday, start_time, end_time } = d.time_slot;

      // Require term dates — no arbitrary defaults
      const start_date = d.time_slot.start_date;
      const end_date = d.time_slot.end_date;
      if (!start_date || !end_date) {
        allConflicts.push({
          course: courseId,
          reason: "Missing start_date or end_date. Please select a term."
        });
        continue;
      }

      // minutes are already stored as minutes-from-midnight
      const start_minutes = start_time;
      const end_minutes = end_time;

      // Location comes from the booking payload or room
      const location = d.room?.location || d.location || "NVC";
      const grid = location === "LT" ? defaultGridLT : defaultGridNVC;

      // Is this an overwrite? A course that already has a schedule on this
      // weekday is being re-scheduled (e.g. a re-import), not newly booked —
      // this must be reported as "ghi đè", NOT as a room/overlap conflict.
      const prevCount = await CalendarEvent.countDocuments({
        course: courseId,
        type: 'class',
        weekday,
      });
      const isOverwrite = prevCount > 0;

      // Delete old occurrences if we are replacing a series
      if (d.series_id) {
        await CalendarEvent.deleteMany({ series_id: d.series_id });
      } else {
        // Fallback or new booking: delete existing classes for this course
        // that overlap with the same weekday (to allow multi-day schedules)
        await CalendarEvent.deleteMany({
          course: courseId,
          type: 'class',
          weekday: weekday
        });
      }

      // Generate occurrences
      const occurrences = getOccurrences(start_date, end_date, weekday, start_minutes, end_minutes, holidays);

      if (occurrences.length === 0) {
        allConflicts.push({ course: courseId, reason: "No valid occurrences (all fall on holidays?)" });
        continue;
      }

      // Class conflict: other courses sharing this class's id must not overlap
      // (a class of students can't sit two subjects at once).
      let classConflictCourseIds = [];
      let classIds = Array.isArray(d.course?.class_id)
        ? d.course.class_id
        : (d.course?.class_id ? [d.course.class_id] : null);
      if (!classIds) {
        const c = await Course.findById(courseId, "class_id").lean();
        classIds = Array.isArray(c?.class_id) ? c.class_id : (c?.class_id ? [c.class_id] : []);
      }
      if (classIds?.length) {
        const others = await Course.find(
          { class_id: { $in: classIds }, _id: { $ne: courseId } },
          "_id"
        ).lean();
        classConflictCourseIds = others.map((c) => c._id);
      }

      // Conflict detection across all occurrences
      const courseConflicts = [];
      const validOccurrences = [];

      // Block against both approved and pending bookings so two requests can't
      // silently claim the same room/teacher slot (which would collide once
      // both get approved). Rejected/cancelled events don't block.
      const BLOCKING = { $in: ['approved', 'pending'] };

      for (const occ of occurrences) {
        const roomOverlap = await CalendarEvent.findOne({
          room: roomId,
          course: { $ne: courseId }, // ignore the course's own events (overwrite, not conflict)
          status: BLOCKING,
          isCancelled: { $ne: true },
          start: { $lt: occ.end },
          end: { $gt: occ.start }
        }).lean();

        if (roomOverlap) {
          const dayStr = weekdayNames[roomOverlap.weekday] || `Thứ ${roomOverlap.weekday}`;
          const sLabel = minutesToLabel(roomOverlap.time_slot?.start_time || 0, grid.data);
          const eLabel = minutesToLabel(roomOverlap.time_slot?.end_time || 0, grid.data);
          courseConflicts.push({
            at: occ.start,
            reason: `Room conflict with "${roomOverlap.title}" on ${dayStr} (Tiết ${sLabel}-${eLabel})`
          });
          continue;
        }

        if (d.teacher_email?.length) {
          const teacherOverlap = await CalendarEvent.findOne({
            teacher_email: { $in: d.teacher_email },
            course: { $ne: courseId }, // ignore the course's own events (overwrite, not conflict)
            status: BLOCKING,
            isCancelled: { $ne: true },
            start: { $lt: occ.end },
            end: { $gt: occ.start }
          }).lean();

          if (teacherOverlap) {
            const dayStr = weekdayNames[teacherOverlap.weekday] || `Thứ ${teacherOverlap.weekday}`;
            const sLabel = minutesToLabel(teacherOverlap.time_slot?.start_time || 0, grid.data);
            const eLabel = minutesToLabel(teacherOverlap.time_slot?.end_time || 0, grid.data);
            courseConflicts.push({
              at: occ.start,
              reason: `Teacher conflict with "${teacherOverlap.title}" on ${dayStr} (Tiết ${sLabel}-${eLabel})`
            });
            continue;
          }
        }

        if (classConflictCourseIds.length) {
          const classOverlap = await CalendarEvent.findOne({
            course: { $in: classConflictCourseIds },
            type: 'class',
            status: BLOCKING,
            isCancelled: { $ne: true },
            start: { $lt: occ.end },
            end: { $gt: occ.start }
          }).lean();

          if (classOverlap) {
            const dayStr = weekdayNames[classOverlap.weekday] || `Thứ ${classOverlap.weekday}`;
            const sLabel = minutesToLabel(classOverlap.time_slot?.start_time || 0, grid.data);
            const eLabel = minutesToLabel(classOverlap.time_slot?.end_time || 0, grid.data);
            courseConflicts.push({
              at: occ.start,
              reason: `Class conflict with "${classOverlap.title}" on ${dayStr} (Tiết ${sLabel}-${eLabel})`
            });
            continue;
          }
        }

        validOccurrences.push(occ);
      }

      if (courseConflicts.length > 0) {
        allConflicts.push({
          course: courseId,
          conflictCount: courseConflicts.length,
          totalOccurrences: occurrences.length,
          examples: courseConflicts.slice(0, 3)
        });
      }

      if (validOccurrences.length === 0) {
        continue; // Skip entirely conflicted series
      }

      // Build event docs — store weekday + time_slot for grid queries
      const eventDocs = validOccurrences.map(occ => ({
        title: d.course?.title || "Course Booking",
        type: 'class',
        status,
        start: occ.start,
        end: occ.end,
        course: courseId,
        room: roomId,
        teacher_email: d.teacher_email || [],
        series_id,
        original_start: occ.start,
        weekday,
        location,
        time_slot: {
          start_time: start_minutes,
          end_time: end_minutes
        }
      }));

      await CalendarEvent.insertMany(eventDocs);
      allCreated.push({
        course: courseId,
        series_id,
        created: validOccurrences.length,
        overwritten: isOverwrite, // replaced this course's own previous schedule
      });
    }

    revalidateTag("booking");
    return NextResponse.json(
      { success: true, created: allCreated, conflicts: allConflicts },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 400 });
  }
};

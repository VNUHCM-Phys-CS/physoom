"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import Room from "@/models/room"; // register Room schema for .populate("room")
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import { classGroupRegex } from "@/lib/classGroup";

/**
 * Transforms a deduplicated representative CalendarEvent into the Booking-compatible
 * shape expected by CalendarByRoom, BookingMulti, BookingSingle, etc.
 * Shape: { _id, series_id, time_slot, teacher_email, course, room, status }
 */
function toBookingShape(ceDoc) {
  return {
    _id: ceDoc.series_id || ceDoc._id,
    series_id: ceDoc.series_id,
    teacher_email: ceDoc.teacher_email || [],
    course: ceDoc.course,  // populated
    room: ceDoc.room,       // populated
    status: ceDoc.status,
    isConfirm: ceDoc.status === 'approved',
    time_slot: {
      weekday: ceDoc.weekday,
      start_time: ceDoc.time_slot?.start_time,
      end_time: ceDoc.time_slot?.end_time,
      start_date: ceDoc.start,
      end_date: ceDoc.end,
    },
    location: ceDoc.location
  };
}

/**
 * GET /api/booking — returns all bookings as deduplicated series
 */
export const GET = async (request) => {
  try {
    await connectToDb();

    // Get one representative CalendarEvent per series_id (classes, exams, holidays, etc.)
    const series = await CalendarEvent.aggregate([
      { $match: { 
          type: { $in: ['class', 'exam', 'personal', 'custom', 'other', 'holiday'] }, 
          isCancelled: { $ne: true } 
      } },
      { $sort: { start: 1 } },
      { $group: { _id: "$series_id", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

    // Populate course and room
    await CalendarEvent.populate(series, [
      { path: 'course', model: 'Course' },
      { path: 'room',   model: 'Room' }
    ]);

    revalidateTag("booking");
    return NextResponse.json(series.map(toBookingShape));
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 400 });
  }
};

/**
 * POST /api/booking — filtered query, returns deduplicated series
 * Accepts { filter, isApproximate }
 * Supported filter keys: course, teacher_email, room, "course.class_id"
 */
export const POST = async (request) => {
  try {
    await connectToDb();
    let { filter, isApproximate } = await request.json();

    // Build CalendarEvent match: Include classes, exams, holidays, and other schedule items
    const ceFilter = { 
      type: { $in: ['class', 'exam', 'personal', 'custom', 'other', 'holiday'] }, 
      isCancelled: { $ne: true } 
    };

    // Map Booking filter keys → CalendarEvent equivalents
    if (filter) {
      if (filter.course) {
        ceFilter.course = typeof filter.course === 'string'
          ? new mongoose.Types.ObjectId(filter.course)
          : filter.course;
      }
      if (filter.room) {
        ceFilter.room = typeof filter.room === 'string'
          ? new mongoose.Types.ObjectId(filter.room)
          : filter.room;
      }
      if (filter.teacher_email) {
        ceFilter.teacher_email = filter.teacher_email;
      }
      if (filter.status) {
        ceFilter.status = filter.status;
      }
      // class_id filter — resolve via Course lookup then filter by course ObjectId
      if (filter['course.class_id']) {
        let class_id = filter['course.class_id'];
        if (!Array.isArray(class_id)) class_id = [class_id];

        let query = { class_id };
        if (isApproximate) {
          // Same grouping rule as calendar-events/fetch. See @/lib/classGroup.
          query = { $or: class_id.map((id) => ({ class_id: classGroupRegex(id) })) };
        }
        const courses = await Course.find(query, ['_id']).lean();
        ceFilter.course = { $in: courses.map(c => c._id) };
      }
    }

    // Aggregate: one representative doc per series_id
    const series = await CalendarEvent.aggregate([
      { $match: ceFilter },
      { $sort: { start: 1 } },
      { $group: { _id: "$series_id", doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

    await CalendarEvent.populate(series, [
      { path: 'course', model: 'Course' },
      { path: 'room',   model: 'Room' }
    ]);

    revalidateTag("booking");
    return NextResponse.json(series.map(toBookingShape));
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 400 });
  }
};

/**
 * DELETE /api/booking — deletes all CalendarEvents for the given series
 * Accepts { ids } — array of series_id strings
 */
export const DELETE = async (request) => {
  const session = await auth();
  const user = session?.user;
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      const { ids } = await request.json();

      // ids here may be either series_id strings or _id strings coming from old UI
      // Try deleting by series_id first, then by _id as fallback
      await CalendarEvent.deleteMany({
        $or: [
          { series_id: { $in: ids } },
        ]
      });

      revalidateTag("booking");
      return NextResponse.json({ success: true }, { status: 201 });
    } else {
      return NextResponse.json({ success: false }, { status: 401 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

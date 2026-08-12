"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const session = await auth();
  const user = session?.user;
  if (!user || !user.isAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDb();
    const { id, series_id, start, end, classIds, mode } = await request.json();

    if (!mode) {
      return NextResponse.json({ success: false, message: "Missing deletion mode" }, { status: 400 });
    }

    let result;
    if (mode === 'single') {
      // Delete only the specific instance
      result = await CalendarEvent.deleteOne({ _id: id });
    } else if (mode === 'future') {
      // Delete from this point forward in the series
      if (!series_id || !start) {
        return NextResponse.json({ success: false, message: "Missing series_id or start date for future deletion" }, { status: 400 });
      }
      result = await CalendarEvent.deleteMany({ 
        series_id, 
        start: { $gte: new Date(start) } 
      });
    } else if (mode === 'series') {
      // Delete the entire series
      if (!series_id) {
        return NextResponse.json({ success: false, message: "Missing series_id for series deletion" }, { status: 400 });
      }
      result = await CalendarEvent.deleteMany({ series_id });
    } else if (mode === 'course') {
      // Delete ALL series for a given course (clears the course's "Planned" status entirely)
      if (!id) {
        return NextResponse.json({ success: false, message: "Missing course id for course deletion" }, { status: 400 });
      }
      result = await CalendarEvent.deleteMany({ course: id, type: 'class' });
    } else if (mode === 'class') {
      // Delete ALL class schedules for the given class code(s), across EVERY
      // course document that shares those class ids — including duplicate/old
      // course docs left behind by earlier imports. This lets a re-import fully
      // REPLACE the schedule of the classes it contains, independent of any
      // stale leftover data (which used to cause phantom "trùng lịch").
      // Optionally scoped to a term window [start, end] so importing one term
      // does not wipe another term's schedule for the same class code.
      const ids = Array.isArray(classIds) ? classIds : classIds ? [classIds] : [];
      if (!ids.length) {
        return NextResponse.json({ success: false, message: "Missing classIds for class deletion" }, { status: 400 });
      }
      const courses = await Course.find({ class_id: { $in: ids } }, "_id").lean();
      const courseIds = courses.map((c) => c._id);
      const q = { course: { $in: courseIds }, type: 'class' };
      if (start && end) {
        q.start = { $gte: new Date(start), $lte: new Date(end) };
      }
      result = await CalendarEvent.deleteMany(q);
    } else {
      return NextResponse.json({ success: false, message: "Invalid deletion mode" }, { status: 400 });
    }

    revalidateTag("booking");
    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted using ${mode} mode`,
      count: result.deletedCount 
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Internal Error" }, { status: 500 });
  }
};

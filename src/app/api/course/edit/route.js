"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import CalendarEvent from "@/models/calendarEvent";
import { auth } from "@/lib/auth";
import { dayVN, fetchHolidays, regenerateCourseSchedule } from "@/lib/reschedule";

export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;

  try {
    await connectToDb();
    const data = await request.json();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const ids = data.map((d) => d._id);
    const oldCourses = await Course.find({ _id: { $in: ids } });
    const oldById = new Map(oldCourses.map((c) => [c._id.toString(), c]));

    // Detect, per course, whether the teacher and/or the start date changed —
    // only when the payload actually carries that field (lock/unlock etc. send
    // just {_id, isLock} and must NOT be read as a teacher/date change).
    const plans = []; // { id, teachers, newStart, teacherChanged, startChanged, locked }
    for (const d of data) {
      const old = oldById.get(String(d._id));
      if (!old) continue;
      const teacherChanged =
        d.teacher_email !== undefined &&
        JSON.stringify([...(old.teacher_email || [])].sort()) !==
          JSON.stringify([...(d.teacher_email || [])].sort());
      const startChanged =
        d.start_date !== undefined && dayVN(d.start_date) !== dayVN(old.start_date);
      if (teacherChanged || startChanged) {
        plans.push({
          id: d._id,
          teachers: d.teacher_email !== undefined ? d.teacher_email : old.teacher_email || [],
          newStart: d.start_date !== undefined ? new Date(d.start_date) : old.start_date,
          teacherChanged,
          startChanged,
          locked: !!old.isLock,
        });
      }
    }

    // Update the course docs first. `warnings` is system-managed — never let the
    // edit form overwrite it; instead clear teacher-related warnings once a
    // teacher exists.
    const bulkOps = data.map((d) => {
      const { _id, warnings, ...u } = d;
      const old = oldById.get(String(_id));
      const finalTeachers = Array.isArray(d.teacher_email) ? d.teacher_email : old?.teacher_email || [];
      const update = { $set: u };
      if (finalTeachers.filter(Boolean).length > 0) {
        update.$pull = { warnings: { $regex: /^(Thiếu giảng viên|GV chưa có)/ } };
      }
      return { updateOne: { filter: { _id }, update } };
    });
    if (bulkOps.length) await Course.bulkWrite(bulkOps);

    // Reflect the change in the actual schedule — reusing the importer's
    // occurrence logic — so the timetable updates immediately (no manual redo).
    const holidays = await fetchHolidays();
    for (const p of plans) {
      // A locked course is frozen: don't touch its schedule (unlock to change).
      if (p.locked) continue;
      if (p.startChanged && p.newStart) {
        // Dates moved → rebuild the whole series from the new start.
        await regenerateCourseSchedule(p.id, p.newStart, p.teachers, holidays);
      } else if (p.teacherChanged) {
        // Only the teacher changed → update it in place; keep the schedule.
        await CalendarEvent.updateMany(
          { course: p.id, type: "class" },
          { $set: { teacher_email: p.teachers } }
        );
      }
    }

    revalidateTag("course");
    revalidateTag("booking");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import CalendarEvent from "@/models/calendarEvent";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;

  try {
    await connectToDb();
    const data = await request.json();

    if (!user || !user.isAdmin) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    // 1. Lấy courses cũ
    const ids = data.map((d) => d._id);
    const oldCourses = await Course.find({ _id: { $in: ids } });

    // 2. Tìm những course có thay đổi teacher_email.
    //    CHỈ xét khi payload THỰC SỰ gửi teacher_email — các thao tác như
    //    khoá/mở khoá (chỉ gửi {_id, isLock}) không đụng giảng viên, không được
    //    hiểu nhầm là "xoá GV" (trước đây gây xoá sạch lịch lớp của môn).
    const changedIds = [];
    for (const d of data) {
      if (d.teacher_email === undefined) continue;
      const oldCourse = oldCourses.find((c) => c._id.toString() === d._id);
      if (
        oldCourse &&
        JSON.stringify([...oldCourse.teacher_email].sort()) !==
          JSON.stringify([...(d.teacher_email || [])].sort())
      ) {
        changedIds.push(d._id);
      }
    }

    // 3. If teacher changed — delete and re-generate calendar events
    if (changedIds.length > 0) {
      await CalendarEvent.deleteMany({ course: { $in: changedIds }, type: 'class' });
      console.log(`Deleted CalendarEvents of courses: ${changedIds.join(", ")}`);
    }

    // 4. Update đồng loạt.
    // `warnings` is a system-managed field — never let the edit form overwrite
    // it. Instead, once a course has a teacher, auto-clear the teacher-related
    // import warnings so the ⚠ flag disappears after the user fixes it.
    const bulkOps = data.map((d) => {
      const { _id, warnings, ...u } = d;
      const oldCourse = oldCourses.find((c) => c._id.toString() === _id);
      const finalTeachers = Array.isArray(d.teacher_email)
        ? d.teacher_email
        : oldCourse?.teacher_email || [];
      const update = { $set: u };
      if (finalTeachers.filter(Boolean).length > 0) {
        update.$pull = {
          warnings: { $regex: /^(Thiếu giảng viên|GV chưa có)/ },
        };
      }
      return { updateOne: { filter: { _id }, update } };
    });

    const result = await Course.bulkWrite(bulkOps);
    console.log(`${result.modifiedCount} documents were updated.`);

    revalidateTag("course");
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

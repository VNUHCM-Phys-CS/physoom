"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import Booking from "@/models/booking";
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

    // 2. Tìm những course có thay đổi teacher_email
    const changedIds = [];
    for (const d of data) {
      const oldCourse = oldCourses.find((c) => c._id.toString() === d._id);
      if (
        oldCourse &&
        JSON.stringify([...oldCourse.teacher_email].sort()) !==
          JSON.stringify([...(d.teacher_email || [])].sort())
      ) {
        changedIds.push(d._id);
      }
    }

    // 3. Nếu có course thay đổi teacher -> xoá booking hàng loạt
    if (changedIds.length > 0) {
      await Booking.deleteMany({ course: { $in: changedIds } });
      console.log(`Deleted bookings of courses: ${changedIds.join(", ")}`);
    }

    // 4. Update đồng loạt
    const bulkOps = data.map((d) => {
      const { _id, ...u } = d;
      return {
        updateOne: {
          filter: { _id },
          update: { $set: u },
        },
      };
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

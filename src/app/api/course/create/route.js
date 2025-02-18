"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      let data = await request.json();
      if (!Array.isArray(data)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid input format, expected an array.",
          },
          { status: 400 }
        );
      }
      const bulkOps = data.map((d) => ({
        updateOne: {
          filter: {
            course_id: d.course_id,
            class_id: Array.isArray(d.class_id) ? d.class_id : [d.class_id],
            course_id_extend: d.course_id_extend,
          },
          update: { $set: d },
          upsert: true,
        },
      }));
      const course = await Course.bulkWrite(bulkOps);

      revalidateTag("course");
      return NextResponse.json(
        { success: true, course },
        {
          status: 201,
        }
      );
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { success: false },
      {
        status: 400,
      }
    );
  }
};

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
  let data = await request.json();
  const { course_id, class_id, _id } = data;
  if (!course_id || !class_id) {
    return NextResponse.json(
      {
        isValid: false,
        message: "Both course_id and class_id are required.",
      },
      { status: 400 }
    );
  }
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      const existingCourse = await Course.findOne({ course_id, class_id });
      if (existingCourse && (!_id || existingCourse._id.toString() !== _id)) {
        return NextResponse.json(
          {
            isValid: false,
            message: "Combination of course_id and class_id already exists.",
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ isValid: true });
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

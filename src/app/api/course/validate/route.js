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
  if (!Array.isArray(class_id) || class_id.length === 0) {
    throw new Error("class_id must be an array with at least one element.");
  }
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      const existingCourse = await Course.findOne({
        course_id,
        class_id: { $all: class_id },
        course_id_extend: data.course_id_extend,
      }).lean();
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

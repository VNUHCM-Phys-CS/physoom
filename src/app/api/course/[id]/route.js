"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Course from "@/models/course";
import Booking from "@/models/booking";
import { auth } from "@/lib/auth";

export const PUT = async (req, { params }) => {
  const { id } = params;
  const token = await auth();
  const user = token?.user;

  try {
    await connectToDb();

    if (user && user.isAdmin) {
      let courseData = await req.json();

      // Update the course information
      const updatedCourse = await Course.findByIdAndUpdate(
        id,
        { $set: courseData },
        { new: true, runValidators: true }
      );

      if (!updatedCourse) {
        return NextResponse.json(
          { message: "Course not found." },
          { status: 404 }
        );
      }

      // Update booking emails if email in course data is changed
      if (courseData.email) {
        await Booking.updateMany(
          { course: updatedCourse._id },
          { $set: { teacher_email: courseData.email } }
        );
      }

      return NextResponse.json(updatedCourse, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
  } catch (error) {
    console.error("Failed to update course:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        {
          message:
            "Combination of course_id, class_id and course_id_extend must be unique.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
};

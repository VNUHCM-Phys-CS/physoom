"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";

export const GET = async (request) => {
    try {
      connectToDb();
      const course = await Course.countDocuments();
      revalidateTag("admin-course");
      return NextResponse.json(course);
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
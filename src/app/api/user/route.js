"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";

export const GET = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      await connectToDb();
      const emails = await Course.aggregate([
        { $unwind: '$teacher_email' }, // Flatten the teacher_email array
        { $group: { _id: '$teacher_email' } }, // Group by each email to get unique ones
        { $project: { _id: 0, email: '$_id' } } // Project the result as 'email'
      ]);
      revalidateTag("user");
      return NextResponse.json(emails.map(item => item.email));
    } else {
      return NextResponse.json(
        [],
        {
          status: 401,
        }
      );
    }
  } catch (err) {
    console.log(err);
    // revalidateTag("room");
    return NextResponse.json(
      [],
      {
        status: 400,
      }
    );
  }
};
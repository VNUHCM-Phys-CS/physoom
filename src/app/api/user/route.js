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
      // Distinct teacher emails used across courses, joined to the User
      // collection so the caller can show the teacher's name too.
      const rows = await Course.aggregate([
        { $unwind: '$teacher_email' },
        { $group: { _id: '$teacher_email' } },
        { $lookup: { from: 'users', localField: '_id', foreignField: 'email', as: 'u' } },
        { $project: { _id: 0, email: '$_id', name: { $arrayElemAt: ['$u.name', 0] } } },
        { $sort: { email: 1 } },
      ]);
      revalidateTag("user");
      return NextResponse.json(rows);
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
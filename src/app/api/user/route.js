"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { getToken } from "next-auth/jwt";

export const GET = async (request) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  // check user
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      connectToDb();
      const emails = await Course.distinct('teacher_email');
      revalidateTag("user");
      console.log(emails)
      return NextResponse.json(emails);
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
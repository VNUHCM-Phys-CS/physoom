"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { getToken } from "next-auth/jwt";

export const GET = async (request) => {
  try {
    connectToDb();
    const course = await Course.find();
    revalidateTag("course");
    return NextResponse.json(course);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      [],
      {
        status: 400,
      }
    );
  }
};

export const POST = async (request) => {
  try {
    connectToDb();
    let { filter } = await request.json();
    const course = await Course.find(filter ?? {});
    revalidateTag("course");
    return NextResponse.json(course);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      [],
      {
        status: 400,
      }
    );
  }
};

export const DELETE = async (request) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  // check user
  const user = token?.user;
  try {
    connectToDb();
    if (user && user.isAdmin) {
      let { ids } = await request.json();
      const result = await Course.deleteMany({
        _id: { $in: ids },
      });
      revalidateTag("course");
      return NextResponse.json(
        { success: true },
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

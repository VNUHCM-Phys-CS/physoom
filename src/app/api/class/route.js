"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

export const GET = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      await connectToDb();
      const classlist = await Course.distinct('class_id').lean();
      // const ob = {};
      // classlist.forEach(c=>{
      //   ob[c.replace(/[ABC]$/, '')] = true;
      // })
      // // remove A,B
      revalidateTag("class");
      return NextResponse.json(classlist);
      // return NextResponse.json(Object.keys(ob));
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
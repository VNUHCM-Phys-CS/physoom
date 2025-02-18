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
      const classlist = await Course.aggregate([
        { $project: { class_id: 1 } }, // only include the class_id field
        { $unwind: "$class_id" }, // unwind the array into separate documents
        { $group: { _id: "$class_id" } }, // group by unique class_id values
        { $project: { _id: 0, class_id: "$_id" } }, // format the result
      ]);
      // const ob = {};
      // classlist.forEach(c=>{
      //   ob[c.replace(/[ABC]$/, '')] = true;
      // })
      // // remove A,B
      revalidateTag("class");
      return NextResponse.json(classlist);
      // return NextResponse.json(Object.keys(ob));
    } else {
      return NextResponse.json([], {
        status: 401,
      });
    }
  } catch (err) {
    console.log(err);
    // revalidateTag("room");
    return NextResponse.json([], {
      status: 400,
    });
  }
};

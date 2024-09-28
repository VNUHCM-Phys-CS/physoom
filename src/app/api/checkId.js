"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import User from "@/models/user";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
    const token = await auth();
    // check user
    const user = token?.user;
    try {
      await connectToDb();
      let { teacher_id } = await request.json();
      const userInfo = await User.findOne({teacher_id,email:user.email});
      revalidateTag("course");
      return NextResponse.json({checked:true});
    } catch (err) {
      console.log(err);
      return NextResponse.json(
        {checked:false},
        {
          status: 400,
        }
      );
    }
  };
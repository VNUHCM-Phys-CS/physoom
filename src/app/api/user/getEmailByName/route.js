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
    if (user && user.isAdmin) {
      await connectToDb();
      const { names } = await request.json();

      if (!names || !Array.isArray(names)) {
        return NextResponse.json(
          { success: false, message: "Invalid names array" },
          { status: 400 }
        );
      }
      revalidateTag("user");
      // Query the User model for users with the specified names
      const users = await User.find({ name: { $in: names } }).select(
        "email name"
      );

      // If no users are found, return an empty array
      if (!users.length) {
        return NextResponse.json({ success: true, users: [] }, { status: 200 });
      }
      return NextResponse.json({ success: true, users }, { status: 200 });
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

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import { auth } from "@/lib/auth";

export const GET = async () => {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });

  try {
    await connectToDb();
    const users = await User.find({}, "email name").lean();
    return NextResponse.json(users);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

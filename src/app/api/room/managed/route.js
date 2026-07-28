"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Room from "@/models/room";
import { auth } from "@/lib/auth";

export const GET = async (request) => {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json([], { status: 401 });
  }

  try {
    await connectToDb();
    const rooms = await Room.find({ managers: session.user.email });
    return NextResponse.json(rooms);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Room from "@/models/room";

// Otherwise this GET is prerendered at build time and never reflects rooms
// whose bookable status changes afterwards.
export const dynamic = "force-dynamic";

export const GET = async () => {
  try {
    await connectToDb();
    const rooms = await Room.find({ isBookable: true });
    return NextResponse.json(rooms);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

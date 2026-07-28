"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Room from "@/models/room";

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

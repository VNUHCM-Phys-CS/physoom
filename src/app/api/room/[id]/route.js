"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Room from "@/models/room";

import { auth } from "@/lib/auth";

export const PUT = async (req, { params }) => {
  const { id } = params;
  const token = await auth();
  const user = token?.user;

  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  try {
    await connectToDb();

    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    if (!user.isAdmin) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    let roomData = await req.json();

    const updatedRoom = await Room.findByIdAndUpdate(
      id,
      { $set: roomData },
      { new: true, runValidators: true }
    );

    if (!updatedRoom) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    console.error("Failed to update Room:", error);

    if (error.code === 11000) {
      return NextResponse.json(
        { message: "Combination of title and location must be unique." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
};

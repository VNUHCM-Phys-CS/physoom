"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Room from "@/models/room";
import Booking from "@/models/booking";
import { auth } from "@/lib/auth";

export const PUT = async (req, { params }) => {
  const { id } = params;
  const token = await auth();
  const user = token?.user;

  try {
    await connectToDb();

    if (user && user.isAdmin) {
      let roomData = await req.json();

      // Update the Room information
      const updatedRoom = await Room.findByIdAndUpdate(
        id,
        { $set: roomData },
        { new: true, runValidators: true }
      );

      if (!updatedRoom) {
        return NextResponse.json(
          { message: "Room not found." },
          { status: 404 }
        );
      }

      return NextResponse.json(updatedRoom, { status: 200 });
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
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

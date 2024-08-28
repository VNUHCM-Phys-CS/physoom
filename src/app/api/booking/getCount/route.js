"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Booking from "@/models/booking";

export const GET = async (request) => {
    try {
      await connectToDb();
      const booking = await Booking.countDocuments();
      revalidateTag("admin-booking");
      return NextResponse.json(booking);
    } catch (err) {
      console.log(err);
      return NextResponse.json(
        { success: false },
        {
          status: 400,
        }
      );
    }
  };
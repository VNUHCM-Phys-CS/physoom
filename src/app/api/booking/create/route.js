"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import Booking from "@/models/booking";

export const POST = async (request) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  // check user
  const user = token?.user;
  try {
    connectToDb();
    if (user && user.isAdmin) {
      let data = await request.json();
      const bulkOps = data.map((d) => ({
        updateOne: {
          filter: { title: d.title },
          update: { $set: d },
          upsert: true,
        },
      }));
      const booking = await Booking.bulkWrite(bulkOps);
      revalidateTag("booking");
      return NextResponse.json(
        { success: true },
        {
          status: 201,
        }
      );
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
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

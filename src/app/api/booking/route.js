"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Booking from "@/models/booking";
import { getToken } from "next-auth/jwt";

export const GET = async (request) => {
  try {
    connectToDb();
    const booking = await Booking.find()
      .populate("course")
      .populate("room")
      .exec();
    revalidateTag("booking");
    return NextResponse.json(booking);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      [],
      {
        status: 400,
      }
    );
  }
};

export const POST = async (request) => {
  try {
    connectToDb();
    let { filter } = await request.json();
    const booking = await Booking.find(filter ?? {})
      .populate("course")
      .populate("room")
      .exec();
    revalidateTag("booking");
    return NextResponse.json(booking);
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      [],
      {
        status: 400,
      }
    );
  }
};

export const DELETE = async (request) => {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  // check user
  const user = token?.user;
  try {
    connectToDb();
    if (user && user.isAdmin) {
      let { ids } = await request.json();
      const result = await Booking.deleteMany({
        _id: { $in: ids },
      });
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

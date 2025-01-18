"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import Room from "@/models/room";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  let data = await request.json();
  const { title, location, _id } = data;
  if (!title || !location) {
    return NextResponse.json(
      {
        isValid: false,
        message: "Both title and location are required.",
      },
      { status: 400 }
    );
  }
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      const existingRoom = await Room.findOne({ title, location });
      if (existingRoom && (!_id || existingRoom._id.toString() !== _id)) {
        return NextResponse.json(
          {
            isValid: false,
            message: "Combination of title and location already exists.",
          },
          { status: 200 }
        );
      }

      return NextResponse.json({ isValid: true });
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

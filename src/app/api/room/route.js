"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Room from "@/models/room";
import { getToken } from "next-auth/jwt";

export const GET = async (request) => {
  try {
    connectToDb();
    const rooms = await Room.find();
    console.log("here");
    revalidateTag("room");
    return NextResponse.json(rooms);
  } catch (err) {
    console.log(err);
    // revalidateTag("room");
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
    const room = await Room.find(filter ?? {});
    revalidateTag("room");
    return NextResponse.json(room);
  } catch (err) {
    console.log(err);
    revalidateTag("room");
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
      const result = await Room.deleteMany({
        _id: { $in: ids },
      });
      revalidateTag("room");
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
    revalidateTag("room");
    return NextResponse.json(
      { success: false },
      {
        status: 400,
      }
    );
  }
};

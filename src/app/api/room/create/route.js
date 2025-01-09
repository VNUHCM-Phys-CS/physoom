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
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      let data = await request.json();
      const bulkOps = await Promise.all(
        data.map(async (room) => {
          // Check if the room exists in the database
          const existingRoom = await Room.findOne({ title: room.title });

          // Set the limit only if the room does not exist in the database
          if (!existingRoom && !room.limit) {
            room.limit = 200; // Set default limit for new rooms
          }

          return {
            updateOne: {
              filter: { title: room.title },
              update: { $set: room },
              upsert: true,
            },
          };
        })
      );
      const room = await Room.bulkWrite(bulkOps);
      revalidateTag("room");
      return NextResponse.json(
        { success: true, data: room },
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

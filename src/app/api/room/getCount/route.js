"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Room from "@/models/room";

export const GET = async (request) => {
    try {
      connectToDb();
      const course = await Room.countDocuments();
      revalidateTag("admin-room");
      return NextResponse.json(course);
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
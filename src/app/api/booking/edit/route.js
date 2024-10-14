"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Booking from "@/models/booking";
import { auth } from "@/lib/auth";

export const POST = async (request, res) => {
  const token = await auth();
  const user = token?.user;
  try {
    await connectToDb();
    let data = await request.json();
    if (user && user.isAdmin) {
      const bulkOps = data.map((d) => {
        const { course, ...u } = d;
        return {
          updateOne: {
            filter: { course },
            update: { $set: u },
          },
        };
      });
      console.log(JSON.stringify(bulkOps));
      await Booking.bulkWrite(bulkOps)
        .then((result) => {
          console.log(`${result.modifiedCount} documents were updated.`);
        })
        .catch((error) => {
          console.error("Error updating documents:", error);
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

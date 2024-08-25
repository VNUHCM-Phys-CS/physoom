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
  console.log("---------------hi");
  try {
    connectToDb();
    let data = await request.json();
    if (user && user.isAdmin) {
      const bulkOps = data.map((d) => {
        const u = { ...d };
        u.course = d.course._id;
        u.room = d.room._id;
        return {
          updateOne: {
            filter: { course: u.course },
            update: { $set: u },
            upsert: true,
          },
        };
      });
      const booking = await Booking.bulkWrite(bulkOps);
      revalidateTag("booking");
      return NextResponse.json(
        { success: true },
        {
          status: 201,
        }
      );
    } else if (user && user.email === data[0].teacher_email) {
      // single update
      console.log(data);
      const bulkOps = [data[0]].map((d) => {
        const u = { ...d };
        u.course = d.course._id;
        u.room = d.room._id;
        return {
          updateOne: {
            filter: { course: u.course },
            update: { $set: u },
            upsert: true,
          },
        };
      });
      const booking = await Booking.bulkWrite([bulkOps[0]]);
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

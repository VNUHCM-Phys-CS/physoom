"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import Booking from "@/models/booking";
import {includes} from "lodash"
import { authConfig } from "@/lib/auth.config";

export const POST = async (request,res) => {
  const token = await getServerSession(request, res, authConfig);
  // const token = await getToken({
  //   req: request,
  //   secret: process.env.NEXTAUTH_SECRET,
  // });
  // check user
  const user = token?.user;
  try {
    await connectToDb();
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
    } else if (user && includes(data[0].teacher_email,user.email)) {
      // single update
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

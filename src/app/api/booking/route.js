"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Booking from "@/models/booking";
import Course from "@/models/course";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";

export const GET = async (request) => {
  try {
    await connectToDb();
    const booking = await Booking.find()
      .populate("course")
      .populate("room")
      .exec();
    revalidateTag("booking");
    return NextResponse.json(booking);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], {
      status: 400,
    });
  }
};

export const POST = async (request) => {
  try {
    await connectToDb();
    let { filter, isApproximate } = await request.json();
    let class_id = (filter ?? {})["course.class_id"];
    if (class_id) {
      if (!Array.isArray(class_id)) {
        class_id = [class_id];
      }
      let query = { class_id };
      if (isApproximate) {
        const regexFilters = class_id.map((id) => {
          if (id.includes("_")) {
            // If it contains "_", match only the class itself and its base class
            return {
              $or: [
                { class_id: { $regex: `^${id}$`, $options: "i" } }, // Match exact class_id like 22CVD1_A
                {
                  class_id: { $regex: `^${id.split("_")[0]}$`, $options: "i" },
                }, // Match base class like 22CVD1
              ],
            };
          } else {
            // If it's a base class, match base class and versions like 22CVD1, 22CVD1_A, 22CVD1_B...
            return {
              class_id: { $regex: `^${id}(_[A-Za-z0-9])?$`, $options: "i" },
            };
          }
        });
        query = { $or: regexFilters };
      }
      console.log(class_id);
      const course = await Course.find(query, ["_id"]).lean();
      const booking = await Booking.find({
        course: { $in: course.map((d) => d._id) },
      })
        .populate("course")
        .populate("room")
        .exec();
      revalidateTag("booking");
      return NextResponse.json(booking);
    } else {
      const booking = await Booking.find(filter ?? {})
        .populate("course")
        .populate("room")
        .exec();
      revalidateTag("booking");
      return NextResponse.json(booking);
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json([], {
      status: 400,
    });
  }
};

export const DELETE = async (request, res) => {
  const session = await auth();
  // const token = await getToken({
  //   req: request,
  //   secret: process.env.NEXTAUTH_SECRET,
  // });
  // check user
  const user = session?.user;
  try {
    await connectToDb();
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

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Booking from "@/models/booking";
import Course from "@/models/course";
import _ from "lodash";

const defaultLoc = false
export const GET = async (request) => {
  try {
    connectToDb();
    const bookings = await Booking.find().lean();
    const courseNum = await Course.countDocuments({});
    revalidateTag("viz-booking");
    const byLocation = _.mapValues(_.groupBy(bookings, "isConfirm"), (group) =>
      _.size(group)
    );
    Object.keys(byLocation).forEach((k) => {
      if (k === "undefined") {
        byLocation[defaultLoc] = (byLocation[defaultLoc] ?? 0)+byLocation[k];
        delete byLocation[k];
      }
    });
    byLocation['Success'] = byLocation[true]??0;
    byLocation['In process'] = byLocation[false]??0;
    byLocation['Pending'] = courseNum - bookings.length;
    delete byLocation[true];
    delete byLocation[false];
    return NextResponse.json({
      values: Object.values(byLocation),
      labels: Object.keys(byLocation),
      count: bookings.length,
    });
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

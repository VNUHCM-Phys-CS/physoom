"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";

export const GET = async (request) => {
  try {
    await connectToDb();

    const courseNum = await Course.countDocuments({});

    // For each course, determine its overall status:
    // "approved" if it has at least one approved event,
    // "pending" if it has pending but no approved.
    const perCourse = await CalendarEvent.aggregate([
      { $match: { type: "class", isCancelled: { $ne: true } } },
      {
        $group: {
          _id: "$course",
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pending:  { $sum: { $cond: [{ $eq: ["$status", "pending"] },  1, 0] } },
        },
      },
      {
        $project: {
          status: {
            $cond: [
              { $gt: ["$approved", 0] }, "approved",
              { $cond: [{ $gt: ["$pending", 0] }, "pending", "other"] },
            ],
          },
        },
      },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byStatus = {};
    perCourse.forEach((s) => { byStatus[s._id] = s.count; });

    const bookedCount = Object.values(byStatus).reduce((a, b) => a + b, 0);
    const unbookedCount = Math.max(0, courseNum - bookedCount);

    revalidateTag("viz-booking");
    return NextResponse.json({
      values: [byStatus["approved"] || 0, byStatus["pending"] || 0, unbookedCount],
      labels: ["Success", "In process", "Pending"],
      count: courseNum,
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

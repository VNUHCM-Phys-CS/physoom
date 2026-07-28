"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import { auth } from "@/lib/auth";

/**
 * POST /api/booking/edit
 * Bulk-update time_slot fields on CalendarEvents by series_id.
 * Accepts: [{ course: <courseId>, time_slot: {...}, teacher_email: [...], ... }]
 */
export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    await connectToDb();
    let data = await request.json();
    if (user && user.isAdmin) {
      const bulkOps = data.map((d) => {
        const { course, time_slot, teacher_email, ...rest } = d;
        const update = {};
        if (time_slot !== undefined) update.time_slot = time_slot;
        if (teacher_email !== undefined) update.teacher_email = teacher_email;
        // Spread any other top-level fields except course
        Object.assign(update, rest);
        return {
          updateMany: {
            filter: { course },
            update: { $set: update },
          },
        };
      });
      await CalendarEvent.bulkWrite(bulkOps)
        .then((result) => {
          console.log(`${result.modifiedCount} CalendarEvent documents updated.`);
        })
        .catch((error) => {
          console.error("Error updating CalendarEvents:", error);
        });
      revalidateTag("booking");
      return NextResponse.json({ success: true }, { status: 201 });
    } else {
      return NextResponse.json({ success: false }, { status: 401 });
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

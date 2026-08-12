"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import "@/models/room"; // register Room schema for .populate("room")

export const POST = async (request) => {
  try {
    await connectToDb();
    let { filter, isApproximate } = await request.json();

    // Safety: never dump the whole collection. An empty filter usually means a
    // missing class_id that JSON.stringify dropped — return nothing instead.
    if (!filter || Object.keys(filter).length === 0) {
      return NextResponse.json([]);
    }

    let class_id = filter["course.class_id"];
    
    // First, find relevant courses if class_id is specified
    if (class_id) {
      if (!Array.isArray(class_id)) {
        class_id = [class_id];
      }
      let query = { class_id };
      if (isApproximate) {
        // Group sub-sections that only differ by a trailing letter right after a
        // digit: e.g. 25VLH_DKD1A / 25VLH_DKD1B belong to the same class as
        // 25VLH_DKD1. But 25VLH, 25VLH_DKD1 and 25VLH_DKD2 are DIFFERENT classes
        // and must stay separate. So the "group base" is the id with any single
        // trailing letter (that follows a digit) stripped, and we match that
        // base optionally followed by one more letter.
        const regexFilters = class_id.map((id) => {
          const base = String(id).replace(/(\d)[A-Za-z]$/, "$1");
          const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          return { class_id: { $regex: `^${esc}[A-Za-z]?$`, $options: "i" } };
        });
        query = { $or: regexFilters };
      }
      
      const courses = await Course.find(query, ["_id"]).lean();
      
      const events = await CalendarEvent.find({
        course: { $in: courses.map((d) => d._id) }
      })
      .populate("course")
      .populate("room")
      .exec();
      
      return NextResponse.json(events);
      
    } else {
      // Normal filtering (e.g. { teacher_email: '...' })
      const events = await CalendarEvent.find(filter ?? {})
      .populate("course")
      .populate("room")
      .exec();
      
      return NextResponse.json(events);
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

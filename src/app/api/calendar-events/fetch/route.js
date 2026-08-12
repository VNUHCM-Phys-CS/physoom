"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import "@/models/room"; // register Room schema for .populate("room")
import { classGroupRegex } from "@/lib/classGroup";

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
        // Merge only trailing sub-section letters (_A/_B/_C or glued) into their
        // group; keep 25VLH, _DKD1, _DKD2 distinct. See @/lib/classGroup.
        query = { $or: class_id.map((id) => ({ class_id: classGroupRegex(id) })) };
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

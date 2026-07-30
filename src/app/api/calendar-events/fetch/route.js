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
    let class_id = (filter ?? {})["course.class_id"];
    
    // First, find relevant courses if class_id is specified
    if (class_id) {
      if (!Array.isArray(class_id)) {
        class_id = [class_id];
      }
      let query = { class_id };
      if (isApproximate) {
        const regexFilters = class_id.map((id) => {
          if (id.includes("_")) {
            return {
              $or: [
                { class_id: { $regex: `^${id}$`, $options: "i" } },
                { class_id: { $regex: `^${id.split("_")[0]}$`, $options: "i" } },
              ],
            };
          } else {
            return {
              class_id: { $regex: `^${id}(_[A-Za-z0-9])?$`, $options: "i" },
            };
          }
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

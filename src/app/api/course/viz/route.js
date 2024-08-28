"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import _ from "lodash";

export const GET = async (request) => {
  try {
    connectToDb();
    const courses = await Course.find().lean();
    revalidateTag("viz-course");
    const byLocation = _.mapValues(_.groupBy(courses, "credit"), (group) =>
      _.size(group)
    );
    return NextResponse.json({
      values: Object.values(byLocation),
      labels: Object.keys(byLocation),
      count: courses.length,
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

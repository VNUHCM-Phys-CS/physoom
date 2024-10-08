"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Room from "@/models/room";
import { defaultLoc } from "@/lib/ulti";
import _ from "lodash";

export const GET = async (request) => {
  try {
    await connectToDb();
    const rooms = await Room.find().lean();
    revalidateTag("viz-room");
    const byLocation = _.mapValues(_.groupBy(rooms, "location"), (group) =>
      _.size(group)
    );
    Object.keys(byLocation).forEach((k) => {
      if (k === "undefined") {
        byLocation[defaultLoc] = (byLocation[defaultLoc] ?? 0)+byLocation[k];
        delete byLocation[k];
      }
    });
    return NextResponse.json({
      values: Object.values(byLocation),
      labels: Object.keys(byLocation),
      count: rooms.length,
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

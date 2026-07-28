"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";

export const GET = async (request) => {
  try {
    await connectToDb();
    // Count unique series (one per booking)
    const count = await CalendarEvent.distinct("series_id", { type: 'class', isCancelled: { $ne: true } });
    revalidateTag("admin-booking");
    return NextResponse.json(count.length);
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};
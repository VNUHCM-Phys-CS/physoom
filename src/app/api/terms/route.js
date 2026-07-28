import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";

export const GET = async (request) => {
  try {
    await connectToDb();
    const terms = await CalendarEvent.find({ type: 'term' }).sort({ start: 1 });
    return NextResponse.json(terms);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

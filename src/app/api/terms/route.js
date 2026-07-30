import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";

// Without this, Next.js prerenders this GET at build time (the route reads no
// request input) and serves the build-time result forever — which is empty,
// so newly created terms never show up.
export const dynamic = "force-dynamic";

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

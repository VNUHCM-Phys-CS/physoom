// Free/busy endpoint for Offisoom integration. Returns busy intervals per
// teacher email in a time range, from approved (non-cancelled) calendar events.
// Protected by a shared secret header. Additive — no existing behaviour changes.
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/mongodb";
import CalendarEvent from "@/models/calendarEvent";
import Room from "@/models/room";
import { locationList } from "@/models/ulti";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const secret = request.headers.get("x-offisoom-secret");
  const expected = process.env.OFFISOOM_SYNC_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const emails = (searchParams.get("emails") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const from = new Date(searchParams.get("from"));
  const to = new Date(searchParams.get("to"));
  if (!emails.length || isNaN(from) || isNaN(to)) {
    return NextResponse.json({ busy: {} });
  }

  await connectToDb();
  const events = await CalendarEvent.find(
    {
      teacher_email: { $in: emails },
      status: "approved",
      isCancelled: false,
      start: { $lt: to },
      end: { $gt: from },
    },
    "teacher_email start end title room"
  )
    .populate("room", "title location")
    .lean();

  // Physoom stores campuses as LT / NVC; the faculty calls them CS2 / CS1.
  // locationList.alternative is the authority for that pairing.
  const campusCode = Object.fromEntries(
    Object.entries(locationList.alternative || {}).map(([cs, loc]) => [loc, cs.toUpperCase()])
  );

  const busy = {};
  for (const e of events) {
    for (const em of e.teacher_email || []) {
      const k = String(em).toLowerCase();
      if (!emails.includes(k)) continue;
      (busy[k] ||= []).push({
        start: e.start,
        end: e.end,
        title: e.title || "Lớp",
        room: e.room?.title || "",
        campus: e.room?.location || "", // LT | NVC
        campusCode: campusCode[e.room?.location] || "", // CS2 | CS1
      });
    }
  }
  return NextResponse.json({ busy });
};

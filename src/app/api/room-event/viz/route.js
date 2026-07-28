"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";

/**
 * GET /api/room-event/viz
 * Aggregate custom room-event bookings by approval status for the dashboard.
 */
export const GET = async () => {
  try {
    await connectToDb();

    const perStatus = await CalendarEvent.aggregate([
      { $match: { type: "custom", isCancelled: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const byStatus = {};
    perStatus.forEach((s) => { byStatus[s._id] = s.count; });

    const approved = byStatus["approved"] || 0;
    const pending = byStatus["pending"] || 0;
    const rejected = byStatus["rejected"] || 0;
    const count = approved + pending + rejected;

    return NextResponse.json({
      values: [approved, pending, rejected],
      labels: ["Approved", "Pending", "Rejected"],
      count,
      approved,
      pending,
      rejected,
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncUserToGoogle } from "@/lib/googleCalendar";

// A full re-sync makes many Google API calls — allow more time than the default.
export const maxDuration = 60;

// Manual "sync now" — push the current user's schedule to their Google calendar.
export const POST = async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const result = await syncUserToGoogle(email);
    if (result?.skipped) {
      return NextResponse.json({ success: false, skipped: result.skipped }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("gcal sync failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "Sync failed" }, { status: 500 });
  }
};

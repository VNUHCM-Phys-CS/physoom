import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncUserToGoogle } from "@/lib/googleCalendar";

// A full re-sync makes many Google API calls — allow more time than the default.
export const maxDuration = 60;

// Manual "sync now" — push the current user's schedule to their Google calendar.
// Paginated: the client sends { offset, limit } and loops until `done`, so a full
// term never exceeds the serverless time limit in one request and the UI can show
// progress. Called with no body → syncs everything in one pass (back-compat).
export const POST = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const offset = Number.isFinite(body?.offset) ? Math.max(0, body.offset) : 0;
    const limit = Number.isFinite(body?.limit) ? Math.max(1, body.limit) : undefined;
    const result = await syncUserToGoogle(email, limit ? { offset, limit } : {});
    if (result?.skipped) {
      return NextResponse.json({ success: false, skipped: result.skipped }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("gcal sync failed:", e?.message);
    return NextResponse.json({ success: false, message: e?.message || "Sync failed" }, { status: 500 });
  }
};

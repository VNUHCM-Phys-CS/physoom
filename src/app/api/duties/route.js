// Read-only overlay of the current user's duty shifts (ca trực) from Offisoom.
// Physoom does NOT own this data — it proxies Offisoom via the shared helper
// (src/lib/duties.js), which is also used by the Google Calendar sync. Best-
// effort: not configured / unreachable → empty list, never breaks the calendar.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchUserDuties, dutiesConfigured } from "@/lib/duties";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ duties: [] }, { status: 401 });

  if (!dutiesConfigured()) return NextResponse.json({ duties: [], configured: false });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const duties = await fetchUserDuties(email, { from, to });
  return NextResponse.json({ duties });
};

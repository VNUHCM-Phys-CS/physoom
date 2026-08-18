// Read-only overlay of the current user's duty shifts (ca trực) from Offisoom.
// Physoom does NOT own this data — it proxies Offisoom's existing free/busy
// endpoint (same shared secret used the other direction) and returns the shifts
// as plain calendar intervals to draw on the personal calendar. Best-effort:
// if the integration isn't configured or Offisoom is unreachable, returns an
// empty list so the calendar never breaks. Additive — no existing behaviour changes.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ duties: [] }, { status: 401 });

  const base = (process.env.OFFISOOM_BASE_URL || "").replace(/\/$/, "");
  const secret = process.env.OFFISOOM_SYNC_SECRET;
  // Integration not configured → no duties, no error.
  if (!base || !secret) return NextResponse.json({ duties: [], configured: false });

  const { searchParams } = new URL(request.url);
  const now = Date.now();
  const from = searchParams.get("from") || new Date(now - 14 * 864e5).toISOString();
  const to = searchParams.get("to") || new Date(now + 120 * 864e5).toISOString();

  // Location code → human label (Physoom owns the wording so LEAVE/TRIP don't
  // show up as a misleading "Trực LEAVE").
  const LABELS = {
    CS1: "Trực CS1",
    CS2: "Trực CS2",
    REMOTE: "Làm từ xa",
    TRIP: "Công tác",
    LEAVE: "Nghỉ phép",
  };

  try {
    const url = `${base}/api/integration/duties?emails=${encodeURIComponent(
      email
    )}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const res = await fetch(url, {
      headers: { "x-offisoom-secret": secret },
      cache: "no-store",
    });
    if (!res.ok) return NextResponse.json({ duties: [] });
    const data = await res.json();
    const list = data?.duties?.[String(email).toLowerCase()] || [];
    const duties = list
      .filter((d) => d?.start && d?.end)
      .map((d) => {
        const label = LABELS[d.location] || `Trực ${d.location || ""}`.trim();
        return {
          start: d.start,
          end: d.end,
          title: d.note ? `${label} · ${d.note}` : label,
          location: d.location || "",
        };
      });
    return NextResponse.json({ duties });
  } catch (e) {
    console.error("duties proxy failed:", e?.message);
    return NextResponse.json({ duties: [] }); // never break the calendar
  }
};

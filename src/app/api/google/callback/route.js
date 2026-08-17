import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectGoogle, syncUserToGoogle } from "@/lib/googleCalendar";

export const maxDuration = 60;

// OAuth callback: exchange the code, store the refresh token, then run an initial
// sync so the user's schedule appears immediately.
export const GET = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const back = (path) => NextResponse.redirect(`${(process.env.NEXTAUTH_URL || "").replace(/\/$/, "")}${path}`);

  if (!email || !code || (state && state !== email)) {
    return back("/booking?gcal=error");
  }
  try {
    await connectGoogle(code, email);
    // Initial full sync, awaited so the schedule appears right after connect.
    await syncUserToGoogle(email);
    return back("/booking?gcal=connected");
  } catch (e) {
    console.error("google connect failed:", e?.message);
    return back("/booking?gcal=error");
  }
};

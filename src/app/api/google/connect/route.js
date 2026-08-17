"use server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { googleAuthUrl, isGoogleConfigured } from "@/lib/googleCalendar";

// Start the Google OAuth consent flow to link the user's calendar.
export const GET = async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  if (!isGoogleConfigured()) {
    return NextResponse.json({ success: false, message: "Google Calendar chưa được cấu hình." }, { status: 501 });
  }
  return NextResponse.redirect(googleAuthUrl(email));
};

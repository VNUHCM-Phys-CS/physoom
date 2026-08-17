"use server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { disconnectGoogle } from "@/lib/googleCalendar";

// Unlink the user's Google Calendar (clears the stored refresh token).
export const POST = async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    await disconnectGoogle(email);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: e?.message }, { status: 500 });
  }
};

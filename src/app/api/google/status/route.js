"use server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectToDb } from "@/lib/mongodb";
import User from "@/models/user";
import { isGoogleConfigured } from "@/lib/googleCalendar";

export const GET = async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ configured: false, connected: false });
  await connectToDb();
  const user = await User.findOne({ email }, "google").lean();
  return NextResponse.json({
    configured: isGoogleConfigured(),
    connected: !!user?.google?.refreshToken,
    connectedAt: user?.google?.connectedAt || null,
  });
};

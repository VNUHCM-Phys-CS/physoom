"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ViewShare from "@/models/viewShare";

// Public endpoint — no auth required.
// GET /api/view-share/lookup?code=XXXXXX
export const GET = async (request) => {
  const code = new URL(request.url).searchParams.get("code")?.toUpperCase().trim();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  try {
    await connectToDb();
    const share = await ViewShare.findOne({ shortCode: code }).select("token").lean();
    if (!share) return NextResponse.json({ error: "Code not found" }, { status: 404 });
    return NextResponse.json({ token: share.token });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
};

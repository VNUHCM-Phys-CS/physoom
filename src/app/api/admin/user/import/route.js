"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import { auth } from "@/lib/auth";

// POST — bulk upsert users by email
// Body: [{ email, name, teacher_id, isAdmin }, ...]
export const POST = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const rows = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No data" }, { status: 400 });
    }

    const ops = rows
      .filter((r) => r.email?.trim())
      .map((r) => ({
        updateOne: {
          filter: { email: r.email.trim().toLowerCase() },
          update: {
            $set: {
              name: r.name?.trim() || undefined,
              teacher_id: r.teacher_id?.trim() || undefined,
              isAdmin: r.isAdmin === true || r.isAdmin === "true" || r.isAdmin === "1",
            },
          },
          upsert: true,
        },
      }));

    const result = await User.bulkWrite(ops);
    return NextResponse.json({
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
};

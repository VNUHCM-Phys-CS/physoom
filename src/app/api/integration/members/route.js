// Member/department roster for Offisoom integration. Returns the distinct
// departments (bộ môn) and each user's email, name, department and teacher_id.
// Protected by the shared secret header. Additive — no existing behaviour changes.
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/mongodb";
import User from "@/models/user";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const secret = request.headers.get("x-offisoom-secret");
  const expected = process.env.OFFISOOM_SYNC_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectToDb();
  const users = await User.find({ email: { $ne: null } }, "email name department teacher_id").lean();

  const members = users
    .filter((u) => u.email)
    .map((u) => ({
      email: String(u.email).toLowerCase(),
      name: u.name || "",
      department: u.department || "",
      teacher_id: u.teacher_id || "",
    }));

  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))].sort();

  return NextResponse.json({ departments, members });
};

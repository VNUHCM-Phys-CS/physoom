// Member/department roster for the sibling apps (Offisoom, ACADsoom). Returns
// the distinct departments (bộ môn) and each user's email, name, department,
// teacher_id, rank and degree.
//
// Two auth paths, on purpose:
//   x-offisoom-secret: <OFFISOOM_SYNC_SECRET>   bản cũ, giữ nguyên để Offisoom không gãy
//   x-<client>-secret: <CLIENT>_SYNC_SECRET     per-client, dùng ?client=acadsoom
//
// Physoom trả sự thật nó nắm — không suy diễn ngạch sang thang điểm hay định mức
// của Khoa; việc đó thuộc về app gọi.
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/mongodb";
import User from "@/models/user";
import { authIntegration } from "@/lib/ssoClients";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const { searchParams } = new URL(request.url);
  const asked = searchParams.get("client");

  // Không có ?client= và header cũ khớp → Offisoom bản cũ, cho qua như trước.
  const legacy =
    !asked &&
    process.env.OFFISOOM_SYNC_SECRET &&
    request.headers.get("x-offisoom-secret") === process.env.OFFISOOM_SYNC_SECRET;

  if (!legacy && !authIntegration(request, asked)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await connectToDb();
  const users = await User.find(
    { email: { $ne: null } },
    "email name department teacher_id rank degree"
  ).lean();

  const members = users
    .filter((u) => u.email)
    .map((u) => ({
      email: String(u.email).toLowerCase(),
      name: u.name || "",
      department: u.department || "",
      teacher_id: u.teacher_id || "",
      rank: u.rank || "",
      degree: u.degree || "",
    }));

  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))].sort();

  return NextResponse.json({ departments, members });
};

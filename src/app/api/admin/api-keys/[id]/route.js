import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ApiKeyEntry from "@/models/apiKeyEntry";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/scope";

async function requireSuper() {
  const session = await auth();
  return isSuperAdmin(session?.user) ? session : null;
}

const ALLOWED = ["app", "name", "provider", "environment", "location", "owner", "last4", "status", "rotateEveryDays", "lastRotatedAt", "notes"];
function pick(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  if (typeof out.last4 === "string") out.last4 = out.last4.slice(-6);
  if (out.rotateEveryDays !== undefined) out.rotateEveryDays = Math.max(0, Math.round(Number(out.rotateEveryDays) || 0));
  return out;
}

export const PATCH = async (request, { params }) => {
  if (!(await requireSuper())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await connectToDb();
  const body = await request.json().catch(() => ({}));
  const entry = await ApiKeyEntry.findByIdAndUpdate(params.id, { $set: pick(body) }, { new: true }).lean();
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ entry });
};

export const DELETE = async (_request, { params }) => {
  if (!(await requireSuper())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await connectToDb();
  await ApiKeyEntry.findByIdAndDelete(params.id);
  return NextResponse.json({ success: true });
};

import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ApiKeyEntry from "@/models/apiKeyEntry";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/scope";

// The API-key REGISTRY is super-admin only — it lists sensitive metadata about
// every app's keys (though never the secret values themselves).
async function requireSuper() {
  const session = await auth();
  return isSuperAdmin(session?.user) ? session : null;
}

// Whitelist the metadata fields — never persist anything secret-like even if the
// client sends it. There is intentionally NO "value"/"secret" field.
const ALLOWED = ["app", "name", "provider", "environment", "location", "owner", "last4", "status", "rotateEveryDays", "lastRotatedAt", "notes"];
function pick(body) {
  const out = {};
  for (const k of ALLOWED) if (body[k] !== undefined) out[k] = body[k];
  // last4 is an identifier only — hard-cap so a full secret can't be pasted in.
  if (typeof out.last4 === "string") out.last4 = out.last4.slice(-6);
  if (out.rotateEveryDays !== undefined) out.rotateEveryDays = Math.max(0, Math.round(Number(out.rotateEveryDays) || 0));
  return out;
}

export const GET = async () => {
  if (!(await requireSuper())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await connectToDb();
  const entries = await ApiKeyEntry.find({}).sort({ app: 1, name: 1 }).lean();
  return NextResponse.json({ entries });
};

export const POST = async (request) => {
  if (!(await requireSuper())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await connectToDb();
  const body = await request.json().catch(() => ({}));
  const data = pick(body);
  if (!data.app || !data.name) {
    return NextResponse.json({ error: "app và name là bắt buộc" }, { status: 400 });
  }
  const entry = await ApiKeyEntry.create(data);
  return NextResponse.json({ entry }, { status: 201 });
};

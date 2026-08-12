"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import { normalizeDepartment } from "@/lib/departments";

// Only the fields actually present in the row — so a partial file (e.g. just
// MSCB + bộ môn) never wipes existing name/isAdmin, etc.
function buildSet(r) {
  const s = {};
  const str = (v) => String(v ?? "").trim();
  if (str(r.name)) s.name = str(r.name);
  if (str(r.teacher_id)) s.teacher_id = str(r.teacher_id);
  if (r.isAdmin !== undefined && r.isAdmin !== "")
    s.isAdmin = r.isAdmin === true || r.isAdmin === "true" || r.isAdmin === "1";
  const dept = normalizeDepartment(r.department);
  if (dept) s.department = dept;
  if (str(r.rank)) s.rank = str(r.rank);
  if (str(r.degree)) s.degree = str(r.degree);
  return s;
}

// POST — bulk upsert users. Rows with an email upsert by email; rows with only
// a teacher_id (MSCB) update an existing matching user (no create without email).
// Body: [{ email?, name?, teacher_id?, isAdmin?, department?, rank?, degree? }, ...]
export const POST = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const rows = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: "No data" }, { status: 400 });
    }

    const ops = [];
    let skipped = 0;
    for (const r of rows) {
      const email = String(r.email ?? "").trim().toLowerCase();
      const mscb = String(r.teacher_id ?? "").trim();
      const $set = buildSet(r);
      if (email) {
        ops.push({ updateOne: { filter: { email }, update: { $set }, upsert: true } });
      } else if (mscb) {
        // No email → update a user already identified by this MSCB. teacher_id is
        // stored inconsistently (mostly Number, some String), so match both types.
        const tidVals = [mscb];
        const n = Number(mscb);
        if (!Number.isNaN(n) && String(n) === mscb) tidVals.push(n);
        ops.push({ updateOne: { filter: { teacher_id: { $in: tidVals } }, update: { $set }, upsert: false } });
      } else {
        skipped++;
      }
    }
    if (!ops.length) return NextResponse.json({ success: false, error: "No email or MSCB in any row" }, { status: 400 });

    // Use the raw driver: teacher_id is declared String in the schema but stored
    // mostly as Number, and Mongoose would cast our $in values to String, so a
    // Number-stored id would never match. The raw collection skips that casting.
    const result = await User.collection.bulkWrite(ops);
    return NextResponse.json({
      success: true,
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      matched: result.matchedCount,
      skipped,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
};

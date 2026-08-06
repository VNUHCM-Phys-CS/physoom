"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import TeacherAlias from "@/models/teacherAlias";
import { auth } from "@/lib/auth";

const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
const strip = (s) =>
  norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// Save learned name→email resolutions so future imports skip the prompt.
// body: { mappings: [{ name, email }] }
export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    await connectToDb();
    const { mappings } = await request.json();
    if (!Array.isArray(mappings)) {
      return NextResponse.json(
        { success: false, message: "Invalid mappings array" },
        { status: 400 }
      );
    }

    const ops = [];
    for (const m of mappings) {
      const key = strip(m?.name);
      const email = String(m?.email ?? "").trim();
      if (!key || !email) continue;
      ops.push({
        updateOne: {
          filter: { key },
          update: { $set: { key, email, name: String(m?.name ?? "").trim() } },
          upsert: true,
        },
      });
    }
    if (ops.length) await TeacherAlias.bulkWrite(ops, { ordered: false });

    return NextResponse.json(
      { success: true, saved: ops.length },
      { status: 200 }
    );
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

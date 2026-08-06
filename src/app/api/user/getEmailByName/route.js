"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import User from "@/models/user";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      await connectToDb();
      const { names } = await request.json();

      if (!names || !Array.isArray(names)) {
        return NextResponse.json(
          { success: false, message: "Invalid names array" },
          { status: 400 }
        );
      }
      revalidateTag("user");

      // Robust name→email matching.
      // 1) Normalise (trim + collapse whitespace + lowercase, keep diacritics).
      // 2) Fallback: strip Vietnamese diacritics so tone-mark placement variants
      //    match (e.g. "Thùy" vs "Thuỳ", "Thủy" vs "Thuỷ"). The strip fallback
      //    is only applied when it maps to exactly ONE user, to avoid mixing up
      //    genuinely different names (e.g. "Thủy" vs "Thúy").
      // Also pass through values that are already emails.
      const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const strip = (s) =>
        norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

      const all = await User.find({}, "email name").lean();
      const byNorm = new Map();
      const byStrip = new Map(); // strip(name) -> array of users
      all.forEach((u) => {
        if (!u.name) return;
        byNorm.set(norm(u.name), u);
        const k = strip(u.name);
        if (!byStrip.has(k)) byStrip.set(k, []);
        byStrip.get(k).push(u);
      });

      const users = [];
      const unmatched = [];
      const seen = new Set();
      const add = (raw, email) => {
        if (email && !seen.has(email.toLowerCase())) {
          users.push({ name: raw, email });
          seen.add(email.toLowerCase());
        }
      };

      for (const raw of names) {
        const value = String(raw ?? "").trim();
        if (!value) continue;
        if (value.includes("@")) { add(raw, value); continue; }

        let u = byNorm.get(norm(value));
        if (!u) {
          const group = byStrip.get(strip(value));
          const emails = group ? new Set(group.map((g) => g.email)) : null;
          if (emails && emails.size === 1) u = group[0]; // unambiguous
        }
        if (u?.email) add(raw, u.email);
        else unmatched.push(raw);
      }

      // Return unmatched names too so the importer can flag those courses.
      return NextResponse.json({ success: true, users, unmatched }, { status: 200 });
    } else {
      return NextResponse.json([], {
        status: 401,
      });
    }
  } catch (err) {
    console.log(err);
    // revalidateTag("room");
    return NextResponse.json([], {
      status: 400,
    });
  }
};

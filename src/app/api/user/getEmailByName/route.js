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

      // Robust name→email matching. Exact `$in` matching drops teachers whenever
      // the Excel name differs by case or spacing, so normalise (trim + collapse
      // whitespace + lowercase, keep diacritics) and match against all users.
      // Also pass through values that are already emails.
      const norm = (s) =>
        String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

      const all = await User.find({}, "email name").lean();
      const byNorm = new Map();
      all.forEach((u) => {
        if (u.name) byNorm.set(norm(u.name), u);
      });

      const users = [];
      const seen = new Set();
      for (const raw of names) {
        const value = String(raw ?? "").trim();
        if (!value) continue;
        // Already an email → use directly.
        if (value.includes("@")) {
          if (!seen.has(value.toLowerCase())) {
            users.push({ name: raw, email: value });
            seen.add(value.toLowerCase());
          }
          continue;
        }
        const u = byNorm.get(norm(value));
        if (u?.email && !seen.has(u.email.toLowerCase())) {
          users.push({ name: raw, email: u.email });
          seen.add(u.email.toLowerCase());
        }
      }

      return NextResponse.json({ success: true, users }, { status: 200 });
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

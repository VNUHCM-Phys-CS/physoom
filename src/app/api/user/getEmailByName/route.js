"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import User from "@/models/user";
import TeacherAlias from "@/models/teacherAlias";
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
      // 1) Learned aliases (resolved ambiguities saved from a previous import).
      // 2) Normalise (trim + collapse whitespace + lowercase, keep diacritics).
      // 3) Fallback: strip Vietnamese diacritics so tone-mark placement variants
      //    match (e.g. "Thùy" vs "Thuỳ", "Thủy" vs "Thuỷ").
      //    - If the strip maps to exactly ONE user → auto-resolve.
      //    - If it maps to MULTIPLE users → return as `ambiguous` with the full
      //      candidate list so the importer can ask the user to pick.
      // Also pass through values that are already emails.
      const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
      const strip = (s) =>
        norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

      const all = await User.find({}, "email name teacher_id").lean();
      const byEmail = new Map();
      const byNorm = new Map();
      const byStrip = new Map(); // strip(name) -> array of users
      all.forEach((u) => {
        if (u.email) byEmail.set(u.email.toLowerCase(), u);
        if (!u.name) return;
        byNorm.set(norm(u.name), u);
        const k = strip(u.name);
        if (!byStrip.has(k)) byStrip.set(k, []);
        byStrip.get(k).push(u);
      });

      // Learned aliases keyed by stripped name. Self-healing: ignore any alias
      // whose target email no longer exists (user deleted/changed) so a stale
      // alias never injects an invalid teacher.
      const aliasDocs = await TeacherAlias.find({}).lean();
      const aliasByStrip = new Map();
      aliasDocs.forEach((a) => {
        if (a.key && a.email && byEmail.has(a.email.toLowerCase()))
          aliasByStrip.set(a.key, a.email);
      });

      const users = [];
      const unmatched = [];
      const ambiguous = []; // [{ name, candidates: [{name,email,teacher_id}] }]
      const seen = new Set(); // dedup by REQUESTED name, not by email
      const seenAmbig = new Set();
      // Return one entry per requested name (keyed on the raw name the caller
      // sent) so the importer's name→email map covers EVERY spelling. Deduping
      // by email here would drop tone-mark/case variants that resolve to the
      // same person, silently leaving those courses without a teacher.
      const add = (raw, email) => {
        // Key on the EXACT requested string — the importer looks names up
        // verbatim, so case/whitespace variants that normalise equal must each
        // keep their own entry.
        const key = String(raw);
        if (email && !seen.has(key)) {
          users.push({ name: raw, email });
          seen.add(key);
        }
      };
      const info = (u) => ({
        name: u?.name ?? "",
        email: u?.email ?? "",
        teacher_id: u?.teacher_id ?? "",
      });

      for (const raw of names) {
        const value = String(raw ?? "").trim();
        if (!value) continue;
        if (value.includes("@")) { add(raw, value); continue; }

        // 1) learned alias
        const aliasEmail = aliasByStrip.get(strip(value));
        if (aliasEmail) { add(raw, aliasEmail); continue; }

        // 2) exact (diacritic-sensitive) normalised match
        let u = byNorm.get(norm(value));
        if (u?.email) { add(raw, u.email); continue; }

        // 3) diacritic-stripped fallback
        const group = byStrip.get(strip(value));
        if (!group || group.length === 0) { unmatched.push(raw); continue; }
        const emails = new Set(group.map((g) => g.email));
        if (emails.size === 1) {
          add(raw, group[0].email); // unambiguous
        } else {
          // multiple different people → let the user choose
          const key = norm(value);
          if (!seenAmbig.has(key)) {
            seenAmbig.add(key);
            ambiguous.push({ name: raw, candidates: group.map(info) });
          }
        }
      }

      // Return unmatched + ambiguous so the importer can flag / prompt.
      return NextResponse.json(
        { success: true, users, unmatched, ambiguous },
        { status: 200 }
      );
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

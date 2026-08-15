"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getToken } from "next-auth/jwt";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

export const POST = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      let data = await request.json();
      if (!Array.isArray(data)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid input format, expected an array.",
          },
          { status: 400 }
        );
      }
      // Empty payload (e.g. an import filtered down to nothing) — bulkWrite([])
      // would throw, so short-circuit.
      if (data.length === 0) {
        return NextResponse.json({ success: true, course: {}, failed: 0, writeErrors: [] }, { status: 201 });
      }
      // Coerce numeric fields so a stray string ("2,5", "2.5 tiết", "") can't
      // throw a CastError. credit allows one decimal (e.g. 2.5); duration and
      // population are integers.
      const toNum = (v) => {
        if (v === undefined || v === null || v === "") return undefined;
        const n = Number(String(v).replace(",", ".").replace(/[^\d.]/g, ""));
        return Number.isFinite(n) ? n : undefined;
      };
      const clean = (d) => {
        const out = { ...d };
        const credit = toNum(d.credit);
        const duration = toNum(d.duration);
        const population = toNum(d.population);
        // Do NOT fabricate credit/duration — a row with an invalid "Số tiết"
        // must fail to create so the importer reports it (and the admin fixes
        // the Excel) rather than silently scheduling a made-up duration.
        if (credit !== undefined) out.credit = Math.round(credit * 10) / 10;
        else delete out.credit;
        if (duration !== undefined) out.duration = Math.round(duration);
        else delete out.duration;
        out.population = population !== undefined ? Math.round(population) : 0;
        return out;
      };

      const bulkOps = data.map((d0) => {
        const d = clean(d0);
        return {
          updateOne: {
            filter: {
              course_id: d.course_id,
              class_id: Array.isArray(d.class_id) ? d.class_id : [d.class_id],
              course_id_extend: d.course_id_extend,
            },
            update: { $set: d },
            upsert: true,
          },
        };
      });

      // ordered:false → a bad row is skipped and reported instead of aborting
      // the whole import.
      let course, writeErrors = [];
      try {
        course = await Course.bulkWrite(bulkOps, { ordered: false });
      } catch (bulkErr) {
        course = bulkErr?.result;
        writeErrors = (bulkErr?.writeErrors || []).map((e) => ({
          index: e.index,
          message: e.errmsg || e.message,
        }));
      }

      revalidateTag("course");
      return NextResponse.json(
        { success: true, course, failed: writeErrors.length, writeErrors },
        {
          status: 201,
        }
      );
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { success: false },
      {
        status: 400,
      }
    );
  }
};

"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

// Append health warnings to courses (e.g. scheduling conflicts found during
// import) so they persist on the course "track" and show the ⚠ flag/filter.
// body: { items: [{ id, add: ["Trùng lịch: ..."] }] }
export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) {
      return NextResponse.json({ success: false }, { status: 401 });
    }
    await connectToDb();
    const { items } = await request.json();
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: "Invalid items array" },
        { status: 400 }
      );
    }

    const ops = [];
    for (const it of items) {
      const id = it?.id;
      const add = (Array.isArray(it?.add) ? it.add : []).filter(Boolean);
      if (!id || add.length === 0) continue;
      ops.push({
        updateOne: {
          filter: { _id: id },
          // $addToSet avoids duplicate lines when the same course has several
          // conflicting rows carrying the same reason.
          update: { $addToSet: { warnings: { $each: add } } },
        },
      });
    }
    if (ops.length) await Course.bulkWrite(ops, { ordered: false });

    revalidateTag("course");
    return NextResponse.json({ success: true, updated: ops.length }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

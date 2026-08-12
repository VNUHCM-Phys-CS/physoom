"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Course from "@/models/course";
import ClassGroupOverride from "@/models/classGroupOverride";
import { auth } from "@/lib/auth";
import { classGroupBase } from "@/lib/classGroup";

// GET: overview of every class group (base + sub-sections) with course/teacher
// counts, honouring manual overrides. Admin only.
export const GET = async () => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) return NextResponse.json([], { status: 401 });
    await connectToDb();

    const overrides = await ClassGroupOverride.find({}, "classId group").lean();
    const ovMap = new Map(overrides.map((o) => [o.classId, o.group]));

    const courses = await Course.find({}, "class_id teacher_email title").lean();
    const groups = {}; // groupKey -> { group, members:{cid:count}, courseCount, teachers:Set }
    for (const c of courses) {
      for (const cid of c.class_id ?? []) {
        if (!cid) continue;
        const g = ovMap.get(cid) || classGroupBase(cid);
        const bucket = (groups[g] ||= { group: g, members: {}, courseCount: 0, teachers: new Set() });
        bucket.members[cid] = (bucket.members[cid] || 0) + 1;
        bucket.courseCount += 1;
        (c.teacher_email ?? []).forEach((t) => t && bucket.teachers.add(t));
      }
    }

    const out = Object.values(groups)
      .map((g) => ({
        group: g.group,
        courseCount: g.courseCount,
        teacherCount: g.teachers.size,
        members: Object.keys(g.members)
          .sort()
          .map((cid) => ({
            classId: cid,
            courseCount: g.members[cid],
            overridden: ovMap.has(cid),
            ruleBase: classGroupBase(cid),
          })),
      }))
      .sort((a, b) => a.group.localeCompare(b.group));

    return NextResponse.json(out);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

// POST: set/replace an override { classId, group, note? }. Admin only.
export const POST = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) return NextResponse.json({ success: false }, { status: 401 });
    await connectToDb();
    const { classId, group, note } = await request.json();
    if (!classId || !group) return NextResponse.json({ success: false, error: "classId and group required" }, { status: 400 });
    const doc = await ClassGroupOverride.findOneAndUpdate(
      { classId },
      { classId, group, note },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true, override: doc });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

// DELETE: clear an override { classId } → back to the naming rule. Admin only.
export const DELETE = async (request) => {
  const token = await auth();
  const user = token?.user;
  try {
    if (!(user && user.isAdmin)) return NextResponse.json({ success: false }, { status: 401 });
    await connectToDb();
    const { classId } = await request.json();
    if (!classId) return NextResponse.json({ success: false }, { status: 400 });
    await ClassGroupOverride.deleteOne({ classId });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

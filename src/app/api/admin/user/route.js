"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import TeacherAlias from "@/models/teacherAlias";
import { auth } from "@/lib/auth";
import { normalizeDepartment } from "@/lib/departments";
import { isSuperAdmin } from "@/lib/scope";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

// Creating/editing/deleting users (which grants roles & scopes) is super-admin
// only — otherwise a scoped admin could escalate their own privileges.
async function requireSuper() {
  const session = await auth();
  if (!isSuperAdmin(session?.user)) return null;
  return session;
}

// GET — list all users
export const GET = async () => {
  if (!await requireAdmin()) return NextResponse.json([], { status: 401 });
  try {
    await connectToDb();
    const users = await User.find({}, "email name teacher_id isAdmin isSuperAdmin adminScope department rank degree").lean();
    return NextResponse.json(users);
  } catch (err) {
    console.error(err);
    return NextResponse.json([], { status: 500 });
  }
};

// POST — create single user
export const POST = async (request) => {
  if (!await requireSuper()) return NextResponse.json({ success: false, message: "Chỉ super admin" }, { status: 401 });
  try {
    await connectToDb();
    const data = await request.json();
    const user = await User.create({
      email: data.email?.trim().toLowerCase(),
      name: data.name?.trim() || undefined,
      teacher_id: data.teacher_id?.trim() || undefined,
      isAdmin: !!data.isAdmin,
      isSuperAdmin: !!data.isSuperAdmin,
      adminScope: Array.isArray(data.adminScope) ? data.adminScope.map((s) => String(s).trim()).filter(Boolean) : [],
      department: normalizeDepartment(data.department) || undefined,
      rank: data.rank?.trim() || undefined,
      degree: data.degree?.trim() || undefined,
    });
    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    const msg = err.code === 11000 ? "Email already exists" : err.message;
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
};

// PUT — update user by _id
export const PUT = async (request) => {
  if (!await requireSuper()) return NextResponse.json({ success: false, message: "Chỉ super admin" }, { status: 401 });
  try {
    await connectToDb();
    const { id, ...data } = await request.json();
    const update = {};
    if (data.name !== undefined)       update.name       = data.name?.trim() || undefined;
    if (data.teacher_id !== undefined) update.teacher_id = data.teacher_id?.trim() || undefined;
    if (data.isAdmin !== undefined)    update.isAdmin    = !!data.isAdmin;
    if (data.isSuperAdmin !== undefined) update.isSuperAdmin = !!data.isSuperAdmin;
    if (data.adminScope !== undefined) update.adminScope = Array.isArray(data.adminScope) ? data.adminScope.map((s) => String(s).trim()).filter(Boolean) : [];
    if (data.department !== undefined) update.department = normalizeDepartment(data.department) || undefined;
    if (data.rank !== undefined)       update.rank       = data.rank?.trim() || undefined;
    if (data.degree !== undefined)     update.degree     = data.degree?.trim() || undefined;
    // email is not editable (identity key)
    const user = await User.findByIdAndUpdate(id, update, { new: true });
    if (!user) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, user });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
};

// DELETE — remove user by _id
export const DELETE = async (request) => {
  if (!await requireSuper()) return NextResponse.json({ success: false, message: "Chỉ super admin" }, { status: 401 });
  try {
    await connectToDb();
    const { id } = await request.json();
    const removed = await User.findByIdAndDelete(id);
    // Drop any learned aliases that pointed at this user's email.
    if (removed?.email) {
      await TeacherAlias.deleteMany({
        email: new RegExp(`^${removed.email}$`, "i"),
      });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
};

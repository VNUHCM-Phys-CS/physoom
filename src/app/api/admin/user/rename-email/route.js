// Fix a wrong lecturer email everywhere at once (roster typos happen). Renames
// the identity email across User, Course.teacher_email, CalendarEvent
// (teacher_email/host/attendees) and TeacherAlias — case-insensitive match.
// Super-admin only. There's no safe way to do this from the normal user editor
// (email is the identity key), so it's a dedicated maintenance action.
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import Course from "@/models/course";
import CalendarEvent from "@/models/calendarEvent";
import TeacherAlias from "@/models/teacherAlias";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/scope";

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const POST = async (request) => {
  const session = await auth();
  if (!isSuperAdmin(session?.user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await connectToDb();

  let { oldEmail, newEmail } = await request.json().catch(() => ({}));
  oldEmail = String(oldEmail || "").trim().toLowerCase();
  newEmail = String(newEmail || "").trim().toLowerCase();
  if (!oldEmail || !newEmail || oldEmail === newEmail) {
    return NextResponse.json({ error: "Email cũ/mới không hợp lệ." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return NextResponse.json({ error: "Email mới sai định dạng." }, { status: 400 });
  }
  // Don't merge into a different existing account.
  const clash = await User.findOne({ email: newEmail }).lean();
  if (clash) {
    return NextResponse.json({ error: `Email ${newEmail} đã thuộc một user khác.` }, { status: 409 });
  }

  const rx = { $regex: `^${esc(oldEmail)}$`, $options: "i" };
  const af = { arrayFilters: [{ e: { $regex: `^${esc(oldEmail)}$`, $options: "i" } }] };

  const u = await User.updateOne({ email: rx }, { $set: { email: newEmail } });
  const c = await Course.updateMany({ teacher_email: rx }, { $set: { "teacher_email.$[e]": newEmail } }, af);
  const ev = await CalendarEvent.updateMany({ teacher_email: rx }, { $set: { "teacher_email.$[e]": newEmail } }, af);
  const evh = await CalendarEvent.updateMany({ host: rx }, { $set: { "host.$[e]": newEmail } }, af);
  const eva = await CalendarEvent.updateMany({ attendees: rx }, { $set: { "attendees.$[e]": newEmail } }, af);
  const al = await TeacherAlias.updateMany({ email: rx }, { $set: { email: newEmail } });

  return NextResponse.json({
    success: true,
    changed: {
      user: u.modifiedCount || 0,
      courses: c.modifiedCount || 0,
      events: ev.modifiedCount || 0,
      hosts: evh.modifiedCount || 0,
      attendees: eva.modifiedCount || 0,
      aliases: al.modifiedCount || 0,
    },
  });
};

// Class-assignment feed for ACADsoom (nhiệm vụ 1 — giảng dạy). Protected by the
// shared secret header. Additive — no existing behaviour changes.
//
// Physoom deliberately returns FACTS IT OWNS and does not convert anything to
// "tiết" or "giờ chuẩn": the multipliers for lớp chất lượng cao, thực hành,
// lớp đông… are the faculty's own rules and live in ACADsoom. Sending a
// pre-converted number from here would put the conversion in two places at once.
//
// GET /api/integration/courses
//   header  x-acadsoom-secret: <ACADSOOM_SYNC_SECRET>
//   ?from=&to=      ISO dates — lấy các học kỳ giao với khoảng này (cách dùng chính)
//   ?term=<id>      hoặc chỉ đích danh một học kỳ (CalendarEvent type "term")
//   ?emails=a,b     lọc theo giảng viên; bỏ trống = toàn bộ
import { NextResponse } from "next/server";
import { connectToDb } from "@/lib/mongodb";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import { authIntegration } from "@/lib/ssoClients";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const client = authIntegration(request, "acadsoom");
  if (!client) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const emails = (searchParams.get("emails") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  await connectToDb();

  // ── học kỳ ────────────────────────────────────────────────────────────────
  const termId = searchParams.get("term");
  const from = searchParams.get("from") ? new Date(searchParams.get("from")) : null;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")) : null;

  let termQuery = { type: "term" };
  if (termId) {
    termQuery._id = termId;
  } else if (from && to && !Number.isNaN(+from) && !Number.isNaN(+to)) {
    // Học kỳ giao với khoảng năm học bên ACADsoom.
    termQuery.start = { $lt: to };
    termQuery.end = { $gt: from };
  }
  const terms = await CalendarEvent.find(termQuery, "_id title start end").sort({ start: 1 }).lean();
  if (!terms.length) {
    return NextResponse.json({ terms: [], items: [], note: "không có học kỳ nào khớp" });
  }
  const termIds = terms.map((t) => t._id);
  const termById = new Map(terms.map((t) => [String(t._id), t]));

  // ── lớp được phân công ────────────────────────────────────────────────────
  const courseQuery = { term: { $in: termIds } };
  if (emails.length) courseQuery.teacher_email = { $in: emails };
  const courses = await Course.find(courseQuery).lean();
  if (!courses.length) {
    return NextResponse.json({ terms: termsOut(terms), items: [] });
  }

  // ── số buổi đã thực xếp lịch ──────────────────────────────────────────────
  // Đây là con số Physoom thực sự nắm: số buổi còn hiệu lực trên lịch và tổng
  // số phút. ACADsoom dùng nó để ra tiết thực, hoặc rơi về credit khi lớp chưa
  // xếp lịch.
  const scheduled = await CalendarEvent.aggregate([
    {
      $match: {
        course: { $in: courses.map((c) => c._id) },
        type: "class",
        isCancelled: { $ne: true },
      },
    },
    {
      $group: {
        _id: "$course",
        sessions: { $sum: 1 },
        minutes: {
          $sum: {
            $max: [
              0,
              { $subtract: ["$time_slot.end_time", "$time_slot.start_time"] },
            ],
          },
        },
        firstAt: { $min: "$start" },
        lastAt: { $max: "$end" },
      },
    },
  ]);
  const schedById = new Map(scheduled.map((s) => [String(s._id), s]));

  // ── một dòng cho mỗi (lớp × giảng viên) ───────────────────────────────────
  const items = [];
  for (const c of courses) {
    const teachers = (c.teacher_email || []).map((e) => String(e).toLowerCase()).filter(Boolean);
    const wanted = emails.length ? teachers.filter((e) => emails.includes(e)) : teachers;
    if (!wanted.length) continue;

    const s = schedById.get(String(c._id)) || { sessions: 0, minutes: 0 };
    const term = termById.get(String(c.term));

    for (const email of wanted) {
      items.push({
        // Ổn định qua các lần đồng bộ, nên ACADsoom ghi đè thay vì sinh trùng.
        externalId: `physoom:${c._id}:${email}`,
        teacherEmail: email,
        // Lớp có nhiều giảng viên thì ACADsoom tự quyết chia thế nào.
        teacherCount: teachers.length,

        courseCode: c.course_id || "",
        courseCodeExtend: c.course_id_extend || "",
        courseName: c.title || "",
        className: (c.class_id || []).join(", "),

        credit: c.credit ?? null,
        weeks: c.duration ?? null, // Course.duration = số buổi/tuần đã xếp
        population: c.population ?? null,
        category: c.category || [],
        location: c.location || "",

        sessions: s.sessions,
        scheduledMinutes: s.minutes,
        firstAt: s.firstAt || null,
        lastAt: s.lastAt || null,

        termId: term ? String(term._id) : null,
        termTitle: term?.title || "",
        termStart: term?.start || null,
        termEnd: term?.end || null,

        locked: !!c.isLock,
        warnings: c.warnings || [],
      });
    }
  }

  return NextResponse.json({ terms: termsOut(terms), items });
};

const termsOut = (terms) =>
  terms.map((t) => ({
    id: String(t._id),
    title: t.title,
    start: t.start,
    end: t.end,
  }));

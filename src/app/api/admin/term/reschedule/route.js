"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import CalendarEvent from "@/models/calendarEvent";
import Course from "@/models/course";
import "@/models/room";
import { auth } from "@/lib/auth";
import moment from "moment";
import { getOccurrences, termWeeks } from "@/lib/occurrences";

const vnDate = (d) => moment(d).utcOffset(420).format("YYYY-MM-DD");
const vnStamp = (d) => moment(d).utcOffset(420).format("DD/MM/YYYY HH:mm");
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd;

/**
 * Reschedule (shift dates / trim weeks) of a whole term: every course linked to
 * the term is re-generated over the new [start, end] window, keeping its weekday
 * + tiết + room + teacher. Conflicts with events OUTSIDE the term are detected
 * first; unless `force` is set the change is NOT applied and the clashes are
 * reported ("chặn + báo cáo + vẫn áp dụng").
 *
 * body: { termId, start (ISO), end (ISO), force?: boolean }
 */
export const POST = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDb();
    // expand=false (default): only TRIM each course to fit the term (never make a
    // course longer than it already was). expand=true: also stretch shorter
    // courses to the term's full length.
    const { termId, start, end, force, expand } = await request.json();
    if (!termId || !start || !end) {
      return NextResponse.json({ success: false, message: "Thiếu termId/start/end" }, { status: 400 });
    }
    const newStart = new Date(start);
    const newEnd = new Date(end);
    if (!(newStart < newEnd)) {
      return NextResponse.json({ success: false, message: "Ngày bắt đầu phải trước ngày kết thúc" }, { status: 400 });
    }

    const term = await CalendarEvent.findById(termId).lean();
    if (!term || term.type !== "term") {
      return NextResponse.json({ success: false, message: "Không tìm thấy học kỳ" }, { status: 404 });
    }

    const courses = await Course.find({ term: termId }, "_id title class_id").lean();
    const courseIds = courses.map((c) => c._id);
    const courseInfo = new Map(courses.map((c) => [String(c._id), c]));

    if (!courseIds.length) {
      // No linked courses → just move the term dates.
      await CalendarEvent.findByIdAndUpdate(termId, { start: newStart, end: newEnd });
      revalidateTag("booking");
      return NextResponse.json({ success: true, applied: true, created: 0, courses: 0, blocked: false, conflicts: [] });
    }

    // Derive each series (weekday + tiết + room + teacher) from existing events.
    const existing = await CalendarEvent.find(
      { course: { $in: courseIds }, type: "class" },
      "course room weekday time_slot teacher_email location title series_id status"
    ).lean();

    const seriesMap = new Map();
    for (const e of existing) {
      const key = e.series_id || `${e.course}|${e.weekday}|${e.time_slot?.start_time}|${e.time_slot?.end_time}|${e.room}`;
      if (!seriesMap.has(key)) {
        seriesMap.set(key, {
          series_id: e.series_id || key,
          course: e.course,
          room: e.room,
          weekday: e.weekday,
          time_slot: e.time_slot,
          teacher_email: e.teacher_email || [],
          location: e.location,
          title: e.title,
          status: e.status || "approved",
          count: 0, // old number of sessions (weeks) in this series
        });
      }
      seriesMap.get(key).count++;
    }
    const series = [...seriesMap.values()];

    const holidays = await CalendarEvent.find({ type: "holiday", status: "approved" }, "start end").lean();

    // A course that ran the FULL old term (its session count == old term weeks)
    // is a "full-term" course → it scales with the term (trim AND expand). A
    // course shorter than the old term (e.g. 4 weeks in a 15-week term) keeps its
    // own count (only trimmed if the new term is shorter than it). The `expand`
    // override forces even short courses up to the full new term length.
    const oldTermWeeks = termWeeks(term.start, term.end);

    // Build candidate occurrences for every series over the new window.
    // Per-course new week-count = max session count across its series (used to
    // update course.duration afterwards).
    const candidates = [];
    const courseWeeks = new Map();
    for (const s of series) {
      if (!s.weekday || s.time_slot?.start_time == null || s.time_slot?.end_time == null) continue;
      const fullOcc = getOccurrences(newStart, newEnd, s.weekday, s.time_slot.start_time, s.time_slot.end_time, holidays);
      // fullOcc.length == new term weeks. Full-term courses (or `expand`) scale
      // to it; shorter courses keep their own count, trimmed to fit the term.
      const wasFullTerm = (s.count || 0) >= oldTermWeeks;
      const targetLen = (expand || wasFullTerm)
        ? fullOcc.length
        : Math.min(s.count || fullOcc.length, fullOcc.length);
      const occ = fullOcc.slice(0, targetLen);
      const cid = String(s.course);
      courseWeeks.set(cid, Math.max(courseWeeks.get(cid) || 0, occ.length));
      for (const o of occ) {
        candidates.push({
          title: s.title,
          type: "class",
          status: s.status,
          start: o.start,
          end: o.end,
          course: s.course,
          room: s.room,
          teacher_email: s.teacher_email,
          series_id: s.series_id,
          original_start: o.start,
          weekday: s.weekday,
          location: s.location,
          time_slot: { start_time: s.time_slot.start_time, end_time: s.time_slot.end_time },
          _series: s, // for conflict reporting; stripped before insert
        });
      }
    }

    // Load blocking events OUTSIDE this term (other terms' classes + room events)
    // to check for clashes at the NEW dates. Bucket by room/teacher per day.
    const others = await CalendarEvent.find(
      {
        course: { $nin: courseIds },
        type: { $in: ["class", "custom", "exam", "other"] },
        status: { $in: ["approved", "pending"] },
        isCancelled: { $ne: true },
      },
      "course room teacher_email start end title"
    )
      .populate("course", "class_id title")
      .lean();

    const roomBucket = new Map(); // roomId|day -> [ev]
    const teacherBucket = new Map(); // email|day -> [ev]
    for (const e of others) {
      if (!e.start || !e.end) continue;
      const day = vnDate(e.start);
      if (e.room) {
        const k = `${e.room}|${day}`;
        (roomBucket.get(k) || roomBucket.set(k, []).get(k)).push(e);
      }
      for (const em of e.teacher_email || []) {
        const k = `${String(em).toLowerCase()}|${day}`;
        (teacherBucket.get(k) || teacherBucket.set(k, []).get(k)).push(e);
      }
    }

    const label = (ev) => {
      const cls = ev?.course?.class_id;
      const clsStr = Array.isArray(cls) ? cls.filter(Boolean).join(", ") : cls || "";
      const t = ev?.title || ev?.course?.title || "?";
      return clsStr ? `"${t}" [${clsStr}]` : `"${t}"`;
    };

    // Detect conflicts (dedupe per series + kind + counterpart).
    const conflictSet = new Map();
    const addConflict = (cand, kind, other) => {
      const co = courseInfo.get(String(cand.course));
      const mine = `"${cand.title}"${co?.class_id?.length ? ` [${co.class_id.join(", ")}]` : ""}`;
      const key = `${cand.series_id}|${kind}|${other._id}`;
      if (conflictSet.has(key)) return;
      conflictSet.set(key, {
        kind, // PHÒNG | GIẢNG VIÊN
        course: mine,
        with: label(other),
        at: vnStamp(cand.start),
      });
    };

    for (const cand of candidates) {
      const day = vnDate(cand.start);
      if (cand.room) {
        for (const o of roomBucket.get(`${cand.room}|${day}`) || []) {
          if (overlaps(cand.start, cand.end, o.start, o.end)) addConflict(cand, "PHÒNG", o);
        }
      }
      for (const em of cand.teacher_email || []) {
        for (const o of teacherBucket.get(`${String(em).toLowerCase()}|${day}`) || []) {
          if (overlaps(cand.start, cand.end, o.start, o.end)) addConflict(cand, "GIẢNG VIÊN", o);
        }
      }
    }
    const conflicts = [...conflictSet.values()];

    // Block unless forced.
    if (conflicts.length && !force) {
      return NextResponse.json({
        success: true,
        applied: false,
        blocked: true,
        conflicts: conflicts.slice(0, 100),
        conflictCount: conflicts.length,
        courses: courseIds.length,
        wouldCreate: candidates.length,
      });
    }

    // Apply: replace class events, update courses + term.
    await CalendarEvent.deleteMany({ course: { $in: courseIds }, type: "class" });
    const docs = candidates.map(({ _series, ...d }) => d);
    if (docs.length) await CalendarEvent.insertMany(docs);
    // duration = actual sessions placed per course (trimmed/expanded); courses
    // with no schedule fall back to the term's week count.
    const fallbackWeeks = termWeeks(newStart, newEnd);
    await Course.bulkWrite(
      courseIds.map((cid) => ({
        updateOne: {
          filter: { _id: cid },
          update: { $set: { start_date: newStart, duration: courseWeeks.get(String(cid)) || fallbackWeeks } },
        },
      }))
    );
    await CalendarEvent.findByIdAndUpdate(termId, { start: newStart, end: newEnd });

    revalidateTag("booking");
    revalidateTag("course");
    return NextResponse.json({
      success: true,
      applied: true,
      blocked: false,
      created: docs.length,
      courses: courseIds.length,
      forced: !!force && conflicts.length > 0,
      conflicts: conflicts.slice(0, 100),
      conflictCount: conflicts.length,
    });
  } catch (err) {
    console.error("term reschedule failed:", err);
    return NextResponse.json({ success: false, message: "Lỗi máy chủ" }, { status: 500 });
  }
};

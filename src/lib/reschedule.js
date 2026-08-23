import moment from "moment";
import CalendarEvent from "@/models/calendarEvent";
import { getOccurrences } from "@/lib/occurrences";

// VN-local day key, for comparing whether a course's start date actually changed.
export const dayVN = (x) => (x ? moment(x).utcOffset(420).format("YYYY-MM-DD") : "");

export async function fetchHolidays() {
  return CalendarEvent.find({ type: "holiday", status: "approved" }, "start end").lean();
}

/**
 * Rebuild a course's class schedule from its EXISTING series (weekday + tiết +
 * room), keeping the same number of weeks, but starting at `newStartDate` and
 * with `teachers`. Same occurrence logic the importer uses, so a course edit
 * moves the timetable exactly like a re-import would — no manual redo.
 * No-op if the course has no scheduled sessions yet.
 */
export async function regenerateCourseSchedule(courseId, newStartDate, teachers, holidays) {
  const existing = await CalendarEvent.find(
    { course: courseId, type: "class" },
    "room weekday time_slot location title series_id status"
  ).lean();
  if (!existing.length) return;

  const seriesMap = new Map();
  for (const e of existing) {
    if (!e.weekday || e.time_slot?.start_time == null || e.time_slot?.end_time == null) continue;
    const key = e.series_id || `${e.weekday}|${e.time_slot.start_time}|${e.time_slot.end_time}|${e.room}`;
    if (!seriesMap.has(key)) {
      seriesMap.set(key, {
        series_id: e.series_id || key,
        room: e.room,
        weekday: e.weekday,
        time_slot: e.time_slot,
        location: e.location,
        title: e.title,
        status: e.status || "approved",
        count: 0,
      });
    }
    seriesMap.get(key).count++;
  }
  const series = [...seriesMap.values()];
  if (!series.length) return;

  await CalendarEvent.deleteMany({ course: courseId, type: "class" });

  const docs = [];
  for (const s of series) {
    const count = Math.max(1, s.count);
    // end = start + (count-1) weeks → getOccurrences targets `count` sessions.
    const end = moment(newStartDate).add((count - 1) * 7, "days").toDate();
    const occ = getOccurrences(
      newStartDate, end, s.weekday, s.time_slot.start_time, s.time_slot.end_time, holidays
    );
    for (const o of occ) {
      docs.push({
        title: s.title,
        type: "class",
        status: s.status,
        start: o.start,
        end: o.end,
        course: courseId,
        room: s.room,
        teacher_email: teachers,
        series_id: s.series_id,
        original_start: o.start,
        weekday: s.weekday,
        location: s.location,
        time_slot: s.time_slot,
      });
    }
  }
  if (docs.length) await CalendarEvent.insertMany(docs);
}

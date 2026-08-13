import moment from "moment";

/**
 * Generate weekly class occurrences over a term window, skipping holidays.
 *
 * Shared by /api/booking/create (initial scheduling) and the term-reschedule
 * cascade so both place sessions identically.
 *
 * @param start_date term/course start (any date; first occurrence is the first
 *   matching weekday on/after it)
 * @param end_date   term/course end — together with start_date this fixes the
 *   number of weekly sessions (~weeks in the window)
 * @param weekday    booking convention: 2=Mon … 7=Sat, 8=Sun
 * @param start_minutes / end_minutes  minutes-from-midnight (VN local time)
 * @param holidays   [{start,end}] ranges to skip (a skipped week is compensated
 *   by extending into a later week, preserving the session count)
 * @returns [{ start: Date, end: Date }]
 */
export function getOccurrences(start_date, end_date, weekday, start_minutes, end_minutes, holidays = []) {
  const targetJsDay = weekday === 8 ? 0 : weekday - 1;

  const targetCount = Math.max(
    1,
    Math.round(moment(end_date).diff(moment(start_date), "days") / 7) + 1
  );

  const isHolidayDay = (day) =>
    holidays.some((h) =>
      day.isBetween(moment(h.start).startOf("day"), moment(h.end).endOf("day"), undefined, "[]")
    );

  // Vietnam is a fixed UTC+7 (no DST). Build instants explicitly in VN local
  // time so class times are correct regardless of server timezone.
  const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
  const vnInstant = (day, minutes) =>
    new Date(Date.UTC(day.year(), day.month(), day.date(), 0, 0, 0) - VN_OFFSET_MS + minutes * 60000);

  let current = moment(start_date).startOf("day");
  while (current.day() !== targetJsDay) current.add(1, "days");

  const occurrences = [];
  const MAX_WEEKS = targetCount + 26;
  let scanned = 0;
  while (occurrences.length < targetCount && scanned < MAX_WEEKS) {
    const occDay = current.clone().startOf("day");
    if (!isHolidayDay(occDay)) {
      occurrences.push({ start: vnInstant(occDay, start_minutes), end: vnInstant(occDay, end_minutes) });
    }
    current.add(1, "weeks");
    scanned++;
  }
  return occurrences;
}

/** Whole weeks spanned by a [start,end] window (1-based, matches getOccurrences count). */
export function termWeeks(start, end) {
  return Math.max(1, Math.round(moment(end).diff(moment(start), "days") / 7) + 1);
}

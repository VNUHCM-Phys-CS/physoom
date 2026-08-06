"use client";
import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Input, Chip } from "@heroui/react";
import { useI18n } from "@/i18n/I18nProvider";

// Vietnamese weekday order: Mon..Sat then Sun (matches how timetables read).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAY_LABEL = {
  1: "Thứ 2",
  2: "Thứ 3",
  3: "Thứ 4",
  4: "Thứ 5",
  5: "Thứ 6",
  6: "Thứ 7",
  0: "Chủ nhật",
};

const toInputDate = (d) => (d ? moment(d).format("YYYY-MM-DD") : "");

// A date-less, condensed view: every session of the selected class/teacher in
// the chosen range is collapsed onto a single week grid (weekly repeats merged),
// so you focus on WHICH courses happen WHEN, not on specific dates.
export default function CompactSchedule({
  events = [],
  defaultFrom,
  defaultTo,
  onSelectEvent,
}) {
  const { t } = useI18n();
  const [from, setFrom] = useState(toInputDate(defaultFrom));
  const [to, setTo] = useState(toInputDate(defaultTo));

  // Reset the range whenever the parent supplies new defaults (course changed).
  useEffect(() => {
    setFrom(toInputDate(defaultFrom));
    setTo(toInputDate(defaultTo));
  }, [defaultFrom, defaultTo]);

  const byWeekday = useMemo(() => {
    const fromT = from ? moment(from).startOf("day").valueOf() : -Infinity;
    const toT = to ? moment(to).endOf("day").valueOf() : Infinity;

    // key -> { weekday, startMin, sample, count }
    const map = new Map();
    (events ?? []).forEach((e) => {
      if (!e?.start) return;
      if (e.type === "holiday" || e.resource?.isHoliday) return;
      const st = new Date(e.start);
      const t0 = st.valueOf();
      if (t0 < fromT || t0 > toT) return;
      const weekday = st.getDay();
      const startMin = st.getHours() * 60 + st.getMinutes();
      const courseId = String(e.course?._id ?? e.course ?? e._id);
      const room = e.room?.title ?? "";
      const key = `${courseId}|${weekday}|${startMin}|${room}`;
      if (map.has(key)) {
        map.get(key).count += 1;
      } else {
        map.set(key, { weekday, startMin, sample: e, count: 1 });
      }
    });

    const groups = {};
    WEEKDAY_ORDER.forEach((w) => (groups[w] = []));
    for (const v of map.values()) groups[v.weekday].push(v);
    Object.values(groups).forEach((arr) =>
      arr.sort((a, b) => a.startMin - b.startMin)
    );
    return groups;
  }, [events, from, to]);

  const hasAny = WEEKDAY_ORDER.some((w) => byWeekday[w].length > 0);
  const fmtRange = { from: from ? moment(from).format("DD/MM/YYYY") : "—", to: to ? moment(to).format("DD/MM/YYYY") : "—" };

  return (
    <div className="w-full">
      {/* Range controls + label */}
      <div className="flex flex-wrap items-end gap-3 mb-3">
        <Input
          type="date"
          size="sm"
          label={t("booking.compactFrom")}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="max-w-[170px]"
        />
        <Input
          type="date"
          size="sm"
          label={t("booking.compactTo")}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="max-w-[170px]"
        />
        <Chip color="secondary" variant="flat" className="mb-1">
          {t("booking.compactRange", fmtRange)}
        </Chip>
      </div>

      {!hasAny ? (
        <div className="text-default-500 text-sm py-8 text-center">
          {t("booking.noCoursesInRange")}
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
          {WEEKDAY_ORDER.filter((w) => byWeekday[w].length > 0).map((w) => (
            <div key={w} className="rounded-xl border border-default-200 bg-default-50 dark:bg-zinc-900 p-2">
              <div className="font-semibold text-sm mb-2 text-center border-b border-default-200 pb-1">
                {WEEKDAY_LABEL[w]}
              </div>
              <div className="flex flex-col gap-2">
                {byWeekday[w].map((s, i) => {
                  const e = s.sample;
                  const title =
                    e.course?.title ||
                    e.title ||
                    (typeof e.course === "string" ? e.course : "—");
                  const room = e.room?.title;
                  const start = moment(e.start).format("HH:mm");
                  const end = e.end ? moment(e.end).format("HH:mm") : "";
                  const teachers = e.teacher_email ?? e.course?.teacher_email ?? [];
                  return (
                    <button
                      key={i}
                      onClick={() => onSelectEvent?.(e)}
                      className="text-left rounded-lg bg-white dark:bg-zinc-800 shadow-sm hover:shadow-md transition-shadow p-2 border border-default-100"
                    >
                      <div className="text-xs font-medium text-primary">
                        {start}{end ? `–${end}` : ""}
                      </div>
                      <div className="text-sm font-semibold leading-tight">{title}</div>
                      {room && (
                        <div className="text-xs text-default-500 mt-0.5">📍 {room}</div>
                      )}
                      {teachers.length > 0 && (
                        <div className="text-[11px] text-default-400 mt-0.5 truncate">
                          {teachers.join(", ")}
                        </div>
                      )}
                      {s.count > 1 && (
                        <Chip size="sm" variant="flat" color="default" className="mt-1 h-4 text-[10px]">
                          {t("booking.weeks", { n: s.count })}
                        </Chip>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import moment from "moment";
import {
  Select, SelectItem, Input, Button, Chip, useDisclosure,
} from "@heroui/react";
import { fetcheroptions, fetcher, defaultGridNVC, defaultGridLT } from "@/lib/ulti";
import { useI18n } from "@/i18n/I18nProvider";
import { RoomEventModal } from "@/ui/RoomEventModal";
import { DoorOpenIcon, CalendarSearchIcon } from "lucide-react";

const shortName = (n) => (n || "").split(" ").slice(-2).join(" ");
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const overlap = (a1, b1, a2, b2) => a1 < b2 && a2 < b1;

const C_FREE = "var(--free,#12b886)", C_TEACH = "#3b6fd6", C_TRAVEL = "#f08c00";

// Conic-gradient donut: free (green) → teaching (blue) → travel (orange).
function donut(nf, nt, nv, total) {
  const t = total || nf + nt + nv || 1;
  const df = (nf / t) * 360, dt = (nt / t) * 360;
  return `conic-gradient(${C_FREE} 0deg ${df}deg, ${C_TEACH} ${df}deg ${df + dt}deg, ${C_TRAVEL} ${df + dt}deg 360deg)`;
}

export default function MeetingPlannerPage() {
  const { t, lang } = useI18n();
  const { data: session } = useSession();

  const [campus, setCampus] = useState("NVC");
  const [dur, setDur] = useState(2);
  const [buffer, setBuffer] = useState(60);
  const [weekDate, setWeekDate] = useState(moment().format("YYYY-MM-DD"));
  const [sel, setSel] = useState({ d: 0, t: 0 });

  const DAYS = lang === "en"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"];

  // Meeting slots come from the chosen campus grid (drop the Break row).
  const TIET = useMemo(() => {
    const grid = campus === "LT" ? defaultGridLT : defaultGridNVC;
    return grid.data
      .filter((s) => s.label !== "Break")
      .map((s) => ({ label: s.label, a: s.timeData[0], b: s.timeData[1] }));
  }, [campus]);

  const { data, isLoading } = useSWR(
    ["/api/meeting/availability", { method: "POST", body: JSON.stringify({ weekStart: weekDate }) }],
    fetcheroptions,
    { revalidateOnFocus: false }
  );
  const { data: allRooms } = useSWR("/api/room", fetcher, { revalidateOnFocus: false });

  const teachers = data?.teachers ?? [];
  const busy = data?.busy ?? {};
  const total = teachers.length;

  // meeting window [S,E] for a starting period index t
  const win = (t) => {
    const a = TIET[t]?.a ?? 0;
    const endIdx = Math.min(t + dur - 1, TIET.length - 1);
    return [a, TIET[endIdx]?.b ?? a];
  };

  // classify one teacher for a slot → free | teach | travel (+reason)
  const classify = (email, d, t) => {
    const [S, E] = win(t);
    const list = busy[email?.toLowerCase()] ?? [];
    let travel = null;
    for (const ev of list) {
      if (ev.day !== d) continue;
      if (ev.campus === campus) {
        if (overlap(S, E, ev.a, ev.b)) {
          return { s: "teach", r: t2("teachReason", { from: hhmm(ev.a), to: hhmm(ev.b), campus: ev.campus === "NVC" ? "cs1" : "cs2" }) };
        }
      } else if (overlap(S, E, ev.a - buffer, ev.b + buffer)) {
        travel = { s: "travel", r: t2("travelReason", { campus: ev.campus === "NVC" ? "cs1" : "cs2", from: hhmm(ev.a), to: hhmm(ev.b), buffer }) };
      }
    }
    return travel || { s: "free", r: "" };
  };
  const t2 = (k, v) => t("meet." + k, v);

  const agg = (d, t) => {
    const rows = teachers.map((p) => ({ p, ...classify(p.email, d, t) }));
    return {
      free: rows.filter((x) => x.s === "free"),
      teach: rows.filter((x) => x.s === "teach"),
      travel: rows.filter((x) => x.s === "travel"),
    };
  };

  const best = useMemo(() => {
    const all = [];
    for (let d = 0; d < DAYS.length; d++)
      for (let t = 0; t < TIET.length; t++) {
        const g = agg(d, t);
        all.push({ d, t, free: g.free.length });
      }
    return all.sort((a, b) => b.free - a.free).slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, busy, campus, dur, buffer, TIET]);

  const cur = agg(sel.d, sel.t);
  const [S, E] = win(sel.t);

  // ── Book meeting: prefill RoomEventModal with the selected slot ───────────
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const meetingStart = useMemo(() => {
    if (!data?.weekStart) return null;
    const monday = moment(data.weekStart).utcOffset(420);
    return monday.clone().add(sel.d, "days").hour(Math.floor(S / 60)).minute(S % 60).second(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sel, S]);
  const meetingEnd = useMemo(() => {
    if (!meetingStart) return null;
    return meetingStart.clone().add(E - S, "minutes");
  }, [meetingStart, E, S]);

  const who = (arr, color) =>
    arr.length
      ? arr.map((x) => (
          <span key={x.p.email} className="inline-flex items-center gap-1.5 text-xs bg-default-100 rounded-full px-2 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            {shortName(x.p.name)}
          </span>
        ))
      : <span className="text-default-300 text-xs">—</span>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("meet.title")}</h2>
        <p className="text-sm text-default-400 max-w-2xl">{t("meet.subtitle")}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-end bg-content1 border border-default-200 rounded-xl p-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-default-400">{t("meet.campus")}</span>
          <div className="inline-flex bg-default-100 rounded-lg p-1 gap-1">
            {[["NVC", "cs1 · NVC"], ["LT", "cs2 · LT"]].map(([k, lbl]) => (
              <button key={k} onClick={() => setCampus(k)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${campus === k ? "bg-content1 shadow text-foreground" : "text-default-500"}`}>
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <Select label={t("meet.duration")} size="sm" className="max-w-[150px]"
          selectedKeys={[String(dur)]} onSelectionChange={(k) => setDur(+Array.from(k)[0])}>
          <SelectItem key="1">1 {t("meet.tiet").toLowerCase()}</SelectItem>
          <SelectItem key="2">2 {t("meet.tiet").toLowerCase()}</SelectItem>
          <SelectItem key="3">3 {t("meet.tiet").toLowerCase()}</SelectItem>
        </Select>
        <Select label={t("meet.buffer")} size="sm" className="max-w-[150px]"
          selectedKeys={[String(buffer)]} onSelectionChange={(k) => setBuffer(+Array.from(k)[0])}>
          <SelectItem key="45">45 {t("meet.mins")}</SelectItem>
          <SelectItem key="60">60 {t("meet.mins")}</SelectItem>
          <SelectItem key="90">90 {t("meet.mins")}</SelectItem>
        </Select>
        <Input type="date" size="sm" label={t("meet.week")} className="max-w-[180px]"
          value={weekDate} onChange={(e) => setWeekDate(e.target.value)} />
        <div className="grow" />
        <div className="flex gap-4 text-xs text-default-500 items-center flex-wrap self-center">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: "var(--free,#12b886)" }} />{t("meet.free")}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" />{t("meet.teach")}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" />{t("meet.travel")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 items-start">
        {/* Heatmap */}
        <div className="bg-content1 border border-default-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-default-100 text-xs font-semibold uppercase tracking-wide text-default-400">
            {t("meet.byDayTiet")}
          </div>
          <div className="p-2 overflow-x-auto">
            {isLoading ? (
              <p className="text-center text-default-400 py-10 text-sm">{t("meet.loadingWeek")}</p>
            ) : (
              <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th></th>
                    {DAYS.map((d) => <th key={d} className="text-xs text-default-400 font-semibold pb-2">{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {TIET.map((ti, ri) => (
                    <tr key={ri}>
                      <td className="text-right pr-2 whitespace-nowrap py-[2px]">
                        <div className="text-xs font-bold leading-tight">{t("meet.tiet")} {ti.label}</div>
                        <div className="text-[10px] text-default-400" style={{ fontFamily: "monospace" }}>{hhmm(ti.a)}–{hhmm(ti.b)}</div>
                      </td>
                      {DAYS.map((_, d) => {
                        const g = agg(d, ri);
                        const nf = g.free.length, nt = g.teach.length, nv = g.travel.length;
                        const isSel = sel.d === d && sel.t === ri;
                        return (
                          <td key={d} className="p-[2px]">
                            <button onClick={() => setSel({ d, t: ri })}
                              title={`${nf} rảnh · ${nt} bận dạy · ${nv} di chuyển`}
                              className="w-full h-12 rounded-lg relative flex items-center justify-center transition hover:bg-default-100"
                              style={{ outline: isSel ? "2px solid var(--heroui-primary,#4256d0)" : "none", outlineOffset: 1 }}>
                              <span className="relative block" style={{ width: 34, height: 34, borderRadius: "50%", background: donut(nf, nt, nv, total) }}>
                                <span className="absolute rounded-full bg-content1 flex items-center justify-center"
                                  style={{ inset: 6 }}>
                                  <span className="text-[11px] font-bold tabular-nums" style={{ color: nf === total ? "var(--free,#12b886)" : "inherit" }}>{nf}</span>
                                </span>
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail + best slots */}
        <div className="bg-content1 border border-default-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-default-100 text-xs font-semibold uppercase tracking-wide text-default-400">
            {t("meet.detailTitle")}
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="text-sm font-bold">
              {DAYS[sel.d]} · {t("meet.tiet")} {TIET[sel.t]?.label}{dur > 1 ? `–${TIET[Math.min(sel.t + dur - 1, TIET.length - 1)]?.label}` : ""}
              <span className="text-default-400 font-medium"> · {hhmm(S)}–{hhmm(E)} · {campus === "NVC" ? "cs1 NVC" : "cs2 LT"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative shrink-0" style={{ width: 116, height: 116, borderRadius: "50%", background: donut(cur.free.length, cur.teach.length, cur.travel.length, total) }}>
                <div className="absolute rounded-full bg-content1 flex flex-col items-center justify-center" style={{ inset: 15 }}>
                  <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: C_FREE }}>{cur.free.length}</span>
                  <span className="text-[10px] text-default-400 mt-0.5">/ {total} {t("meet.free").toLowerCase()}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm grow">
                {[["free", cur.free.length, C_FREE], ["teach", cur.teach.length, C_TEACH], ["travel", cur.travel.length, C_TRAVEL]].map(([k, n, c]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: c }} />
                    <span className="text-default-500">{t("meet." + k)}</span>
                    <b className="tabular-nums ml-auto">{n}</b>
                  </div>
                ))}
              </div>
            </div>
            {/* Actionable groups first (who's blocked), then the free roster. */}
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-default-400 mb-1.5">🚗 {t("meet.travelList")} ({cur.travel.length})</h3>
              <div className="flex flex-col gap-1">
                {cur.travel.length ? cur.travel.map((x) => (
                  <span key={x.p.email} className="text-[11px] text-default-500 border border-dashed border-warning-300 rounded-lg px-2 py-1">
                    🚗 {shortName(x.p.name)} — {x.r}
                  </span>
                )) : <span className="text-default-300 text-xs">—</span>}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-default-400 mb-1.5">🏫 {t("meet.teachList")} ({cur.teach.length})</h3>
              <div className="flex flex-wrap gap-1.5">{who(cur.teach, "#3b6fd6")}</div>
            </div>
            <div>
              <h3 className="text-[11px] uppercase tracking-wide text-default-400 mb-1.5">✅ {t("meet.freeList")} ({cur.free.length})</h3>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">{who(cur.free, "var(--free,#12b886)")}</div>
            </div>
            <Button color="primary" startContent={<DoorOpenIcon size={16} />} onPress={onOpen} isDisabled={!meetingStart}>
              {t("meet.bookMeeting")}
            </Button>
          </div>
          <div className="px-4 py-3 border-t border-default-100">
            <h3 className="text-[11px] uppercase tracking-wide text-default-400 mb-2">★ {t("meet.bestSlots")}</h3>
            <div className="flex flex-col gap-1.5">
              {best.map((s, i) => (
                <button key={i} onClick={() => setSel({ d: s.d, t: s.t })}
                  className="flex justify-between items-center text-sm px-2.5 py-1.5 rounded-lg bg-default-100 hover:outline hover:outline-1 hover:outline-primary">
                  <span>{DAYS[s.d]} · {t("meet.tiet")} {TIET[s.t]?.label}{dur > 1 ? `–${TIET[Math.min(s.t + dur - 1, TIET.length - 1)]?.label}` : ""}</span>
                  <b className="tabular-nums">{s.free}/{total}</b>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RoomEventModal
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        rooms={allRooms ?? []}
        isPrivileged={true}
        createdBy={session?.user?.email}
        initialStart={meetingStart ? meetingStart.format("YYYY-MM-DDTHH:mm") : null}
        initialEnd={meetingEnd ? meetingEnd.format("YYYY-MM-DDTHH:mm") : null}
        onSuccess={() => {}}
      />
    </div>
  );
}

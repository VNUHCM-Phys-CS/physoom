"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
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
const SEC_DASH = "2px dashed hsl(var(--heroui-secondary, 270 67% 47%))";
const PRI_SOLID = "2px solid hsl(var(--heroui-primary, 212 100% 47%))";

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

  // Preferred region(s): a set of "d-t" cell keys. Drag to paint (possibly
  // several disjoint rectangles); recommendations then only consider these.
  const [pref, setPref] = useState(() => new Set());
  // "Pick favorite slots" mode: only when ON does clicking/dragging paint the
  // preferred region. When OFF, clicking a cell just selects it for details.
  const [pickMode, setPickMode] = useState(false);
  const [openG, setOpenG] = useState({ travel: true, teach: false, free: false });
  const tog = (k) => setOpenG((o) => ({ ...o, [k]: !o[k] }));
  const drag = useRef({ pressing: false, moved: false, erase: false, start: null, base: null });

  const key = (d, t) => `${d}-${t}`;
  const rectKeys = (a, b) => {
    const ks = [];
    const [d0, d1] = [Math.min(a.d, b.d), Math.max(a.d, b.d)];
    const [t0, t1] = [Math.min(a.t, b.t), Math.max(a.t, b.t)];
    for (let d = d0; d <= d1; d++) for (let t = t0; t <= t1; t++) ks.push(key(d, t));
    return ks;
  };
  const applyRect = useCallback((d, t) => {
    const st = drag.current;
    if (!st.start) return;
    const next = new Set(st.base);
    for (const k of rectKeys(st.start, { d, t })) st.erase ? next.delete(k) : next.add(k);
    setPref(next);
  }, []);
  const onCellDown = (d, t) => (e) => {
    e.preventDefault();
    drag.current = { pressing: true, moved: false, erase: pickMode && pref.has(key(d, t)), start: { d, t }, base: new Set(pref) };
  };
  const onCellEnter = (d, t) => () => {
    if (!drag.current.pressing || !pickMode) return; // paint only in pick mode
    drag.current.moved = true;
    applyRect(d, t);
  };
  useEffect(() => {
    const up = () => {
      const st = drag.current;
      if (st.pressing && !st.moved && st.start) {
        if (pickMode) {
          // plain click while picking → toggle that single cell in the region
          const k = key(st.start.d, st.start.t);
          setPref((prev) => {
            const next = new Set(prev);
            next.has(k) ? next.delete(k) : next.add(k);
            return next;
          });
        } else {
          setSel(st.start); // plain click → detail
        }
      }
      drag.current.pressing = false;
    };
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, [pickMode]);

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

  const allTeachers = data?.teachers ?? [];
  const busy = data?.busy ?? {};

  // ── Department filter ─────────────────────────────────────────────────────
  const NO_DEPT = "__none__";
  const deptList = useMemo(
    () => [...new Set(allTeachers.map((x) => x.department).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [allTeachers]
  );
  const hasNoDept = useMemo(() => allTeachers.some((x) => !x.department), [allTeachers]);
  // null until initialised; default = every real department (NOT "no department").
  const [selDepts, setSelDepts] = useState(null);
  useEffect(() => {
    if (selDepts === null && deptList.length) setSelDepts(new Set(deptList));
  }, [deptList, selDepts]);
  const selKeys = selDepts ?? new Set(deptList);
  const teachers = useMemo(
    () => allTeachers.filter((x) => (x.department ? selKeys.has(x.department) : selKeys.has(NO_DEPT))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allTeachers, selDepts, deptList]
  );
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
        // When a preferred region is drawn, only recommend inside it.
        if (pref.size > 0 && !pref.has(`${d}-${t}`)) continue;
        const g = agg(d, t);
        all.push({ d, t, free: g.free.length });
      }
    return all.sort((a, b) => b.free - a.free).slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teachers, busy, campus, dur, buffer, TIET, pref]);

  // Compact label of the preferred region(s): "Thứ 2 T1–5 · Thứ 6 T5–10".
  const prefLabel = useMemo(() => {
    if (!pref.size) return "";
    const byDay = {};
    for (const k of pref) {
      const [d, t] = k.split("-").map(Number);
      (byDay[d] ||= []).push(t);
    }
    const parts = [];
    Object.keys(byDay).map(Number).sort((a, b) => a - b).forEach((d) => {
      const ts = byDay[d].sort((a, b) => a - b);
      const runs = [];
      let s = ts[0], p = ts[0];
      for (let i = 1; i < ts.length; i++) {
        if (ts[i] === p + 1) p = ts[i];
        else { runs.push([s, p]); s = p = ts[i]; }
      }
      runs.push([s, p]);
      const label = runs.map(([a, b]) => (a === b ? `T${TIET[a]?.label}` : `T${TIET[a]?.label}–${TIET[b]?.label}`)).join(", ");
      parts.push(`${DAYS[d]} ${label}`);
    });
    return parts.join(" · ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, TIET]);

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
        {deptList.length > 0 && (
          <Select
            label={t("meet.deptFilter")}
            size="sm"
            selectionMode="multiple"
            className="max-w-[240px]"
            selectedKeys={selKeys}
            onSelectionChange={(keys) => setSelDepts(new Set(Array.from(keys).map(String)))}
            renderValue={(items) => `${items.length} ${t("meet.deptUnit")}`}
          >
            {[
              ...deptList.map((d) => <SelectItem key={d} textValue={d}>{d}</SelectItem>),
              ...(hasNoDept ? [<SelectItem key={NO_DEPT} textValue="Không có bộ môn">({t("meet.noDept")})</SelectItem>] : []),
            ]}
          </Select>
        )}
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
          <div className="px-4 py-3 border-b border-default-100 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-default-400">{t("meet.byDayTiet")}</span>
            <Button size="sm" variant={pickMode ? "solid" : "bordered"} color="secondary"
              onPress={() => setPickMode((v) => !v)}
              startContent={<span aria-hidden>✏️</span>}>
              {pickMode ? t("meet.pickModeOn") : t("meet.pickMode")}
            </Button>
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
                        // Highlight the whole meeting window (start tiết … +duration).
                        const inSel = d === sel.d && ri >= sel.t && ri < sel.t + dur;
                        const selBottomIdx = Math.min(sel.t + dur - 1, TIET.length - 1);
                        const isSelTop = inSel && ri === sel.t;
                        const isSelBottom = inSel && ri === selBottomIdx;
                        const inPref = pref.has(key(d, ri));
                        const dimmed = pref.size > 0 && !inPref && !inSel;
                        return (
                          <td key={d} className="p-[2px]">
                            <button
                              onMouseDown={onCellDown(d, ri)}
                              onMouseEnter={onCellEnter(d, ri)}
                              draggable={false}
                              title={`${nf} rảnh · ${nt} bận dạy · ${nv} di chuyển`}
                              className="w-full h-12 rounded-lg relative flex items-center justify-center transition select-none hover:bg-default-100"
                              style={{
                                opacity: dimmed ? 0.4 : 1,
                                zIndex: inSel ? 2 : 1,
                                // Selected-window fill + outline are drawn by an overlay that
                                // sits behind the donut and bridges the inter-cell gap.
                                cursor: pickMode ? "crosshair" : "pointer",
                              }}>
                              {/* Preferred region: dashed border only on edges facing
                                  outside the region, extended 2px into the cell gap so
                                  neighbouring cells' borders meet → one connected block. */}
                              {inPref && (
                                <span aria-hidden className="absolute rounded-[6px] pointer-events-none" style={{
                                  inset: -2, zIndex: 3,
                                  borderTop: pref.has(key(d, ri - 1)) ? "2px solid transparent" : SEC_DASH,
                                  borderBottom: pref.has(key(d, ri + 1)) ? "2px solid transparent" : SEC_DASH,
                                  borderLeft: pref.has(key(d - 1, ri)) ? "2px solid transparent" : SEC_DASH,
                                  borderRight: pref.has(key(d + 1, ri)) ? "2px solid transparent" : SEC_DASH,
                                }} />
                              )}
                              {/* Selected meeting window: one connected solid outline.
                                  Only the outer edges get a border and only the outer
                                  corners are rounded, so a multi-tiết window reads as a
                                  single pill (no seams between the cells). */}
                              {inSel && (
                                <span aria-hidden className="absolute pointer-events-none" style={{
                                  inset: -2, zIndex: 1,
                                  background: "hsl(var(--heroui-primary-100, 212 100% 92%))",
                                  borderLeft: PRI_SOLID,
                                  borderRight: PRI_SOLID,
                                  borderTop: isSelTop ? PRI_SOLID : "2px solid transparent",
                                  borderBottom: isSelBottom ? PRI_SOLID : "2px solid transparent",
                                  borderTopLeftRadius: isSelTop ? 9 : 0,
                                  borderTopRightRadius: isSelTop ? 9 : 0,
                                  borderBottomLeftRadius: isSelBottom ? 9 : 0,
                                  borderBottomRightRadius: isSelBottom ? 9 : 0,
                                }} />
                              )}
                              <span className="relative block" style={{ width: 34, height: 34, borderRadius: "50%", background: donut(nf, nt, nv, total), zIndex: 2 }}>
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
            {/* Collapsible groups — actionable ones first. */}
            <div className="flex flex-col divide-y divide-default-100 border border-default-100 rounded-lg">
              <div>
                <button onClick={() => tog("travel")} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                  <span className="text-default-400 text-[10px] transition-transform" style={{ transform: openG.travel ? "rotate(90deg)" : "none" }}>▶</span>
                  <span className="text-[11px] uppercase tracking-wide text-default-500 font-semibold">🚗 {t("meet.travelList")}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: C_TRAVEL }}>{cur.travel.length}</span>
                </button>
                {openG.travel && (
                  <div className="flex flex-col gap-1 px-2.5 pb-2">
                    {cur.travel.length ? cur.travel.map((x) => (
                      <span key={x.p.email} className="text-[11px] text-default-500 border border-dashed border-warning-300 rounded-lg px-2 py-1">
                        🚗 {shortName(x.p.name)} — {x.r}
                      </span>
                    )) : <span className="text-default-300 text-xs">—</span>}
                  </div>
                )}
              </div>
              <div>
                <button onClick={() => tog("teach")} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                  <span className="text-default-400 text-[10px] transition-transform" style={{ transform: openG.teach ? "rotate(90deg)" : "none" }}>▶</span>
                  <span className="text-[11px] uppercase tracking-wide text-default-500 font-semibold">🏫 {t("meet.teachList")}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: C_TEACH }}>{cur.teach.length}</span>
                </button>
                {openG.teach && <div className="flex flex-wrap gap-1.5 px-2.5 pb-2">{who(cur.teach, C_TEACH)}</div>}
              </div>
              <div>
                <button onClick={() => tog("free")} className="w-full flex items-center gap-2 px-2.5 py-2 text-left">
                  <span className="text-default-400 text-[10px] transition-transform" style={{ transform: openG.free ? "rotate(90deg)" : "none" }}>▶</span>
                  <span className="text-[11px] uppercase tracking-wide text-default-500 font-semibold">✅ {t("meet.freeList")}</span>
                  <span className="ml-auto text-xs font-bold tabular-nums" style={{ color: C_FREE }}>{cur.free.length}</span>
                </button>
                {openG.free && <div className="flex flex-wrap gap-1.5 px-2.5 pb-2 max-h-44 overflow-y-auto">{who(cur.free, C_FREE)}</div>}
              </div>
            </div>
            <Button color="primary" startContent={<DoorOpenIcon size={16} />} onPress={onOpen} isDisabled={!meetingStart}>
              {t("meet.bookMeeting")}
            </Button>
          </div>
          <div className="px-4 py-3 border-t border-default-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[11px] uppercase tracking-wide text-default-400">
                ★ {pref.size ? t("meet.bestInRegion") : t("meet.bestSlots")}
              </h3>
              {pref.size > 0 && (
                <button onClick={() => setPref(new Set())} className="text-[11px] text-danger hover:underline">
                  {t("meet.clearRegion")}
                </button>
              )}
            </div>
            {pref.size > 0 ? (
              <div className="mb-2 text-[11px] bg-secondary-50 text-secondary-700 rounded-lg px-2.5 py-1.5">
                📍 {prefLabel}
              </div>
            ) : (
              <p className="text-[11px] text-default-400 mb-2">{t("meet.dragHint")}</p>
            )}
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

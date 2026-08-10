"use client";
import React, { useState } from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Progress } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { CheckCircle, CircleX } from "lucide-react";
import { locationList } from "@/models/ulti";
import {
  convertExcelDateToJSDate,
  defaultGridLT,
  defaultGridNVC,
  getSnapFromDuration,
  roundIndex,
} from "@/lib/ulti";
import _, { groupBy, maxBy, reduce } from "lodash";
import * as XLSX from "xlsx";
import {
  Select,
  SelectItem,
  Button,
  RadioGroup,
  Radio,
  Chip,
} from "@heroui/react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import { useI18n } from "@/i18n/I18nProvider";

const BOOKiNG_FIELDS = [
  { name: "Mã mh", uid: "Mã mh", sortable: true, isRequired: true },
  { name: "Tên môn học", uid: "Tên môn học", sortable: true },
  { name: "Lớp", uid: "Lớp", sortable: true, isRequired: true },
  { name: "mã lớp 2", uid: "mã lớp 2", sortable: true },
  { name: "Số sv", uid: "Số sv", sortable: true },
  { name: "sosvMax", uid: "sosvMax", sortable: true },
  { name: "tcphong", uid: "tcphong", sortable: true },
  { name: "Tên phòng", uid: "Tên phòng", sortable: true },
  { name: "Thứ", uid: "Thứ", sortable: true },
  { name: "Tiết bắt đầu", uid: "Tiết bắt đầu", sortable: true },
  { name: "Số tiết", uid: "Số tiết", sortable: true },
  { name: "Giảng viên", uid: "Giảng viên", sortable: true, isRequired: true },
  { name: "Trợ giảng", uid: "Trợ giảng", sortable: true },
  { name: "Tuần bd", uid: "Tuần bd", sortable: true },
  { name: "Ngày đầu tuần", uid: "Ngày đầu tuần", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = BOOKiNG_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [progressCourse, setProgressCourse] = useState({ value: 0 });
  const [progressRoom, setProgressRoom] = useState({ value: 0 });
  const [progressBooking, setProgressBooking] = useState({ value: 0 });
  const [selectedTerm, setSelectedTerm] = useState("");
  const [conflictLog, setConflictLog] = useState([]);
  const { data: terms } = useSWR("/api/terms", fetcher);

  // --- Ambiguous teacher-name resolution ---
  const [resolveOpen, setResolveOpen] = useState(false);
  const [ambiguous, setAmbiguous] = useState([]); // [{name, candidates:[{name,email,teacher_id}]}]
  const [picks, setPicks] = useState({}); // rawName -> chosen email
  const [pending, setPending] = useState(null); // { data, name2email }

  const selectedTermObj = (terms || []).find((t) => t._id === selectedTerm);

  // Entry point from CSVReader: look up teachers first; if any name maps to
  // multiple people, ask the user to pick before importing anything.
  const onSubmit = async (data) => {
    if (!selectedTerm || !selectedTermObj) {
      alert(t("import.selectFirst"));
      return;
    }

    data = data.filter((d) =>
      Object.entries(d).find((e) => e[1] !== null && String(e[1]).trim() !== "")
    );

    // Build teacher-name list from "Giảng viên"/"Trợ giảng".
    data.forEach((item) => {
      item["mã lớp 2"] = item["mã lớp 2"] ? `${item["mã lớp 2"]}`.trim() : null;
      item._teacher_emails = [];
      if (item["Giảng viên"])
        item["Giảng viên"].split(",").forEach((d) => item._teacher_emails.push(d.trim()));
      if (item["Trợ giảng"])
        item["Trợ giảng"].split(",").forEach((d) => item._teacher_emails.push(d.trim()));
      item._teacher_emails = item._teacher_emails.filter((d) => d && d !== "");
    });
    const names = [...new Set(data.flatMap((item) => item._teacher_emails))];

    let name2email = {};
    let ambig = [];
    try {
      const emailResponse = await fetch("/api/user/getEmailByName", {
        method: "POST",
        headers: { "Content-Type": "application/json", email: session?.user?.email },
        body: JSON.stringify({ names }),
      });
      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        (emails?.users ?? []).forEach((e) => { name2email[e.name] = e.email; });
        ambig = emails?.ambiguous ?? [];
      }
    } catch (e) {
      console.log("teacher lookup failed", e);
    }

    if (ambig.length > 0) {
      // Pause and ask the user which person each ambiguous name refers to.
      setAmbiguous(ambig);
      setPicks(
        Object.fromEntries(ambig.map((a) => [a.name, a.candidates?.[0]?.email]))
      );
      setPending({ data, name2email });
      setResolveOpen(true);
      return;
    }

    await runImport(data, name2email);
  };

  // Apply the user's choices, remember them as aliases, then import.
  const onConfirmResolve = async () => {
    const mappings = ambiguous
      .map((a) => ({ name: a.name, email: picks[a.name] }))
      .filter((m) => m.email);
    const merged = { ...(pending?.name2email ?? {}) };
    mappings.forEach((m) => { merged[m.name] = m.email; });
    const data = pending?.data ?? [];

    setResolveOpen(false);
    // Persist so future imports skip the prompt.
    try {
      await fetch("/api/user/aliases", {
        method: "POST",
        headers: { "Content-Type": "application/json", email: session?.user?.email },
        body: JSON.stringify({ mappings }),
      });
    } catch (e) {
      console.log("save aliases failed", e);
    }
    await runImport(data, merged);
  };

  // Rooms → Courses → Bookings using an already-resolved name→email map.
  const runImport = async (data, name2email) => {
    setIsOpen(true);
    setConflictLog([]);
    setProgressCourse({ value: 0 });
    setProgressRoom({ value: 0 });
    setProgressBooking({ value: 0 });

    try {
      // --- Room creation ---
      const roomGroup = groupBy(data, (item) => {
        let title = (item["Tên phòng"] ?? "").trim();
        let comps = title.split(":");
        if (comps.length > 1) {
          comps[0] = comps[0].toLowerCase();
          comps[1] = comps[1].toUpperCase();
          title = comps.map((d) => d.trim()).join(":");
        } else if (title !== "") {
          title = "cs1:" + title.toUpperCase();
        } else {
          item.cleanRoomTitle = undefined;
          return undefined;
        }
        item.cleanRoomTitle = title;
        return title;
      });
      const rooms = reduce(roomGroup, function (result, value, key) {
        if (key !== "undefined") {
          let comps = key.split(":");
          let loc = locationList.alternative[comps[0]];
          let location = loc ? loc.toUpperCase() : locationList.default.toUpperCase();
          let limit = maxBy(value, function (item) {
            let l = +item["sosvMax"];
            let p = +item["Số sv"];
            item.limit = isNaN(l) ? (isNaN(p) ? undefined : p) : l;
            return item.limit;
          })?.limit;
          result.push({ title: key, limit, location });
        }
        return result;
      }, []);

      const roomResponse = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", email: session?.user?.email },
        body: JSON.stringify(rooms),
      });
      setProgressRoom({ value: 100, isError: !roomResponse.ok });

      // --- Course creation ---
      const courses = _.uniqBy(data, (item) =>
        `${item["Mã mh"].trim()}_${item["mã lớp 2"]}_${item["Lớp"].trim()}`
      ).map((d) => {
        const requested = d._teacher_emails ?? [];
        const teacher_email = requested.map((e) => name2email[e]).filter(Boolean);
        const missingNames = requested.filter((e) => !name2email[e]);
        // Persisted health flags shown in the course list.
        const warnings = [];
        if (teacher_email.length === 0)
          warnings.push("Thiếu giảng viên — chưa xếp lịch");
        if (missingNames.length)
          warnings.push("GV chưa có trong hệ thống: " + missingNames.join(", "));
        return {
          course_id: d["Mã mh"]?.trim(),
          course_id_extend: d["mã lớp 2"],
          class_id: d["Lớp"]?.split(",")?.map((d) => d.trim()),
          title: d["Tên môn học"]?.trim(),
          teacher_email,
          population: d["Số sv"] ?? 0,
          start_date: d["Ngày đầu tuần"]
            ? convertExcelDateToJSDate(d["Ngày đầu tuần"])
            : new Date(selectedTermObj.start),
          credit: d["Số tiết"] ?? 1,
          duration: 15,
          location: d.cleanRoomTitle
            ? rooms.find((r) => r.title === d.cleanRoomTitle)?.location
            : locationList.default,
          warnings, // always set so re-import clears stale warnings
        };
      });
      const courseResponse = await fetch("/api/course/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", email: session?.user?.email },
        body: JSON.stringify(courses),
      });
      setProgressCourse({ value: 100, isError: !courseResponse.ok });

      // --- Booking creation ---
      // Build a COMPLETE, categorised report of every row so nothing is hidden:
      //   created   — new schedule placed
      //   overwrite — replaced this course's OWN previous schedule (re-import)
      //   conflict  — real clash with a DIFFERENT course (room/teacher/class)
      //   skipped   — no teacher / bad tiết / missing room·thứ·tiết
      //   error     — unexpected failure
      const report = [];
      // Collect conflict reasons per course so they persist on the course
      // "track" (⚠) and can be reviewed after the import dialog is closed.
      const conflictByCourse = {};
      const add = (index, _b, status, detail, courseTitle) =>
        report.push({
          row: index + 1,
          status,
          detail: detail || "",
          course_id: (_b["Mã mh"] || "").toString().trim(),
          course: courseTitle || _b["Tên môn học"] || _b["Mã mh"] || "",
          class: _b["Lớp"] || "",
          room: _b.cleanRoomTitle || _b["Tên phòng"] || "",
          day: _b["Thứ"] ?? "",
          tiet: _b["Tiết bắt đầu"] ?? "",
        });

      for (const [index, _booking] of data.entries()) {
        // Rows without room/thứ/tiết carry no schedule (e.g. an extra-teacher
        // row) — record them so the report is truly complete.
        if (!(_booking.cleanRoomTitle && +_booking["Tiết bắt đầu"] && +_booking["Thứ"])) {
          if (_booking["Mã mh"])
            add(index, _booking, "skipped", "Thiếu thông tin phòng/thứ/tiết — không xếp lịch");
          continue;
        }
        try {
          const location = _booking.cleanRoomTitle
            ? rooms.find((r) => r.title === _booking.cleanRoomTitle)?.location
            : locationList.default;
          const room = await fetch("/api/room", {
            method: "POST",
            body: JSON.stringify({ filter: { title: _booking.cleanRoomTitle, location } }),
          }).then((d) => d.json());
          const course = await fetch("/api/course", {
            method: "POST",
            body: JSON.stringify({
              filter: {
                course_id: _booking["Mã mh"].trim(),
                course_id_extend: _booking["mã lớp 2"],
                class_id: _booking["Lớp"].split(",").map((d) => d.trim()),
              },
            }),
          }).then((d) => d.json());

          const title = course?.[0]?.title || _booking["Tên môn học"];
          if (!(room?.[0]?._id && course?.[0]?._id)) {
            add(index, _booking, "error", "Không tìm thấy phòng hoặc môn sau khi tạo", title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          // No teacher → keep the course but don't schedule it.
          if (!(course[0].teacher_email?.length)) {
            add(index, _booking, "skipped", "Thiếu giảng viên — môn được tạo nhưng chưa xếp lịch", title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          const grid = location === "NVC" ? defaultGridNVC : defaultGridLT;
          const weekday = +_booking["Thứ"];
          const duration = +course[0].credit;
          const precision = getSnapFromDuration(duration, 1);
          const start_time = roundIndex(+_booking["Tiết bắt đầu"], precision, grid.data);
          const end_time =
            start_time == null
              ? null
              : Math.min(grid.data.length - 1, start_time + (+course[0].credit || 1));

          if (!(start_time != null && start_time >= 0 && end_time != null && end_time >= 0)) {
            add(index, _booking, "skipped", `Không xác định được tiết trên lịch (Tiết bắt đầu = "${_booking["Tiết bắt đầu"]}")`, title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          let booking = {
            teacher_email: _booking._teacher_emails?.map((e) => name2email[e])?.filter((d) => d),
            room: { ...room[0], location },
            course: course[0],
            time_slot: {},
          };
          booking = grid.calendar2booking({ weekday, start_time, end_time }, booking, precision);
          booking.time_slot.start_date = new Date(selectedTermObj.start);
          booking.time_slot.end_date = new Date(selectedTermObj.end);

          const res = await fetch("/api/booking/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", email: session?.user?.email },
            body: JSON.stringify([booking]),
          });
          const resData = await res.json();
          const madeCount = resData.created?.[0]?.created || 0;
          const wasOverwrite = !!resData.created?.[0]?.overwritten;

          if (resData.conflicts?.length > 0) {
            const reason = resData.conflicts
              .flatMap((c) => (c.examples?.map((e) => e.reason) || [c.reason]))
              .filter(Boolean)
              .join("; ");
            // Some occurrences may still have been placed alongside the clash.
            add(index, _booking, "conflict",
              madeCount ? `Trùng lịch (xếp được ${madeCount} buổi): ${reason}` : `Trùng lịch: ${reason}`,
              title);
            // Persist onto the course track (⚠) so it's reviewable later.
            const cid = course[0]._id;
            (conflictByCourse[cid] ||= new Set()).add(
              `Trùng lịch (${_booking["Thứ"] ? "Thứ " + _booking["Thứ"] : "?"}): ${reason}`
            );
          } else if (wasOverwrite) {
            add(index, _booking, "overwrite", `Ghi đè lịch cũ của môn (${madeCount} buổi)`, title);
          } else {
            add(index, _booking, "created", `Đã xếp ${madeCount} buổi`, title);
          }
        } catch (e) {
          console.log(`Fail to add row#`, index + 1, e);
          add(index, _booking, "error", String(e));
        }
        setProgressBooking({ value: ((index + 1) / data.length) * 100 });
      }

      // Save conflict reasons onto the affected courses' track (⚠).
      const warnItems = Object.entries(conflictByCourse).map(([id, set]) => ({
        id,
        add: [...set],
      }));
      if (warnItems.length) {
        try {
          await fetch("/api/course/warn", {
            method: "POST",
            headers: { "Content-Type": "application/json", email: session?.user?.email },
            body: JSON.stringify({ items: warnItems }),
          });
        } catch (e) {
          console.log("save conflict warnings failed", e);
        }
      }

      setConflictLog(report);
      console.log("All requests completed successfully");
    } catch (error) {
      console.error("Error occurred during the requests:", error);
      setProgressRoom({ value: 100, isError: true });
      setProgressCourse({ value: 100, isError: true });
      setProgressBooking({ value: 100, isError: true });
    }
  };

  // Build the report as an array of row objects (shared by CSV + Excel export).
  const reportRows = () => {
    const statusVi = {
      created: "Tạo mới",
      overwrite: "Ghi đè",
      conflict: "Trùng lịch",
      skipped: "Bỏ qua",
      error: "Lỗi",
    };
    return conflictLog.map((r) => ({
      "Dòng": r.row,
      "Mã mh": r.course_id,
      "Môn học": r.course,
      "Lớp": r.class,
      "Phòng": r.room,
      "Thứ": r.day,
      "Tiết bắt đầu": r.tiet,
      "Trạng thái": statusVi[r.status] || r.status,
      "Chi tiết": r.detail,
    }));
  };
  const reportFilename = (ext) =>
    `bao-cao-import-${selectedTermObj?.title || "term"}.${ext}`;

  // Excel (.xlsx) — most convenient for the user, keeps Vietnamese correctly.
  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportRows());
    ws["!cols"] = [
      { wch: 6 }, { wch: 12 }, { wch: 34 }, { wch: 12 }, { wch: 14 },
      { wch: 6 }, { wch: 12 }, { wch: 12 }, { wch: 50 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Bao cao import");
    XLSX.writeFile(wb, reportFilename("xlsx"));
  };

  // CSV (UTF-8 with BOM) — lightweight fallback, opens in Excel too.
  const downloadCsv = () => {
    const rows = reportRows();
    const header = Object.keys(rows[0] || {});
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv =
      "﻿" +
      [header.map(esc).join(","), ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = reportFilename("csv");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-4">
        <Select
          label={t("import.selectTerm")}
          placeholder={t("import.termPlaceholder")}
          selectedKeys={selectedTerm ? [selectedTerm] : []}
          onChange={(e) => setSelectedTerm(e.target.value)}
          isRequired
          color={selectedTerm ? "default" : "danger"}
          description={!selectedTerm ? t("import.termHint") : `${t("import.termPrefix")}: ${selectedTermObj?.title}`}
        >
          {(terms || []).map(term => (
            <SelectItem key={term._id} value={term._id}>{term.title}</SelectItem>
          ))}
        </Select>
      </div>
      <CSVReader
        path={"/api/booking/create"}
        onSubmit={onSubmit}
        email={session?.user?.email}
        collums={BOOKiNG_FIELDS}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      />

      {/* Pick-the-person dialog for ambiguous teacher names */}
      <Modal
        isOpen={resolveOpen}
        onOpenChange={setResolveOpen}
        scrollBehavior="inside"
        size="2xl"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>Chọn giảng viên cho các tên trùng</span>
            <span className="text-xs font-normal text-default-500">
              Có {ambiguous.length} tên khớp với nhiều người (do trùng tên hoặc
              lệch dấu). Hãy chọn đúng người cho mỗi tên trước khi import.
            </span>
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-5">
              {ambiguous.map((a) => (
                <div key={a.name} className="border-b border-default-100 pb-3">
                  <p className="text-sm font-semibold mb-2">
                    Tên trong file:{" "}
                    <span className="text-primary">“{a.name}”</span>
                  </p>
                  <RadioGroup
                    value={picks[a.name] ?? ""}
                    onValueChange={(v) =>
                      setPicks((p) => ({ ...p, [a.name]: v }))
                    }
                  >
                    {a.candidates.map((c) => (
                      <Radio
                        key={c.email}
                        value={c.email}
                        description={`${c.email}${
                          c.teacher_id ? " • MSCB: " + c.teacher_id : ""
                        }`}
                      >
                        {c.name || c.email}
                      </Radio>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => {
                setResolveOpen(false);
                setPending(null);
              }}
            >
              Huỷ import
            </Button>
            <Button color="primary" onPress={onConfirmResolve}>
              Xác nhận & Import
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isOpen} hideCloseButton size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">{t("import.importing")}</ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-6 w-full">
              <div className="flex flex-col gap-4 w-full max-w-md">
                {[
                  { label: t("import.stepRoom"), prog: progressRoom },
                  { label: t("import.stepCourse"), prog: progressCourse },
                  { label: t("import.stepBooking"), prog: progressBooking }
                ].map(({ label, prog }) => (
                  <div key={label} className="flex items-center gap-2">
                    {label}
                    {prog.value < 100 && (
                      <Progress color="primary" aria-label={`Loading ${label}...`} className="max-w-md" value={prog.value} />
                    )}
                    {prog.value === 100 && (
                      <div>{prog.isError ? <CircleX className="text-red-800" /> : <CheckCircle className="text-success-600" />}</div>
                    )}
                  </div>
                ))}
              </div>

              {progressBooking.value >= 100 && conflictLog.length > 0 && (() => {
                const count = (s) => conflictLog.filter((r) => r.status === s).length;
                const label = { created: "Tạo mới", overwrite: "Ghi đè", conflict: "Trùng lịch", skipped: "Bỏ qua", error: "Lỗi" };
                const rowBg = { conflict: "bg-danger-50", error: "bg-danger-50", overwrite: "bg-primary-50", skipped: "bg-warning-50", created: "bg-success-50" };
                const chipColor = { conflict: "danger", error: "danger", overwrite: "primary", skipped: "warning", created: "success" };
                // Show problems first, then overwrites, then created.
                const order = { conflict: 0, error: 1, skipped: 2, overwrite: 3, created: 4 };
                const rows = [...conflictLog].sort((a, b) => (order[a.status] - order[b.status]) || (a.row - b.row));
                return (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Chip size="sm" color="success" variant="flat">Tạo mới: {count("created")}</Chip>
                      <Chip size="sm" color="primary" variant="flat">Ghi đè: {count("overwrite")}</Chip>
                      <Chip size="sm" color="danger" variant="flat">Trùng lịch: {count("conflict")}</Chip>
                      <Chip size="sm" color="warning" variant="flat">Bỏ qua: {count("skipped")}</Chip>
                      {count("error") > 0 && <Chip size="sm" color="danger" variant="flat">Lỗi: {count("error")}</Chip>}
                    </div>
                    <div className="max-h-72 overflow-y-auto text-xs space-y-1 pr-1">
                      {rows.map((r, i) => (
                        <div key={i} className={`p-1.5 rounded ${rowBg[r.status] || "bg-default-50"}`}>
                          <div className="flex items-center gap-1 font-medium">
                            <Chip size="sm" color={chipColor[r.status] || "default"} variant="flat" className="h-4 text-[10px]">
                              {label[r.status] || r.status}
                            </Chip>
                            <span>Dòng {r.row} · {r.course}{r.class ? ` (${r.class})` : ""}</span>
                          </div>
                          {r.detail && <div className="text-default-500 ml-1">{r.detail}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </ModalBody>
          {progressBooking.value >= 100 && (
            <ModalFooter>
              {conflictLog.length > 0 && (
                <>
                  <Button variant="flat" color="success" onPress={downloadExcel}>Tải Excel (.xlsx)</Button>
                  <Button variant="flat" onPress={downloadCsv}>Tải CSV</Button>
                </>
              )}
              <Button color="primary" onPress={() => { setIsOpen(false); router.back(); }}>{t("common.done")}</Button>
            </ModalFooter>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Page;

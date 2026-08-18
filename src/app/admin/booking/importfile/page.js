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
import { toast } from "react-toastify";
import { isSuperAdmin, classInScope } from "@/lib/scope";
import { downloadTemplate } from "@/lib/downloadTemplate";
import { DownloadIcon } from "lucide-react";

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

// A valid "Số tiết" is a positive number (accepts "2,5" / "2.5 tiết").
const validCredit = (v) => {
  const n = Number(String(v ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) && n > 0;
};

// fetch with a hard timeout so a single slow/hung request can never freeze the
// whole import — it aborts, the row is reported, and the loop moves on.
const fetchT = (url, opts = {}, ms = 30000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(id));
};

const Page = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [progressCourse, setProgressCourse] = useState({ value: 0 });
  const [progressRoom, setProgressRoom] = useState({ value: 0 });
  const [progressBooking, setProgressBooking] = useState({ value: 0 });
  const [currentBooking, setCurrentBooking] = useState(null); // live 'now scheduling' row
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

    // Scope enforcement: a scoped admin may only import classes within their
    // scope. Out-of-scope rows are EXCLUDED (not created/scheduled) and warned.
    let excludedScopeClasses = [];
    if (!isSuperAdmin(session?.user)) {
      const scope = session?.user?.adminScope || [];
      const before = data.length;
      const kept = [];
      const excl = new Set();
      data.forEach((r) => {
        const classes = String(r["Lớp"] || "").split(",").map((s) => s.trim()).filter(Boolean);
        const ok = classes.length && classes.some((c) => classInScope(scope, c));
        if (ok) kept.push(r);
        else classes.forEach((c) => excl.add(c));
      });
      excludedScopeClasses = [...excl];
      if (excludedScopeClasses.length) {
        data = kept;
        toast.warning(
          `Bỏ qua ${before - kept.length} dòng ngoài phạm vi quản lý của bạn: ${excludedScopeClasses.join(", ")}`
        );
      }
    }

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
      // A course's teachers = the UNION across ALL rows sharing its identity
      // (Mã mh + mã lớp 2 + Lớp). One code can carry a lecture AND its "Bài tập"/
      // "Thực hành" rows with different teachers; keying on the first row only
      // (old uniqBy) kept just the lecture's teacher on the course record, so
      // editing another component's teacher never showed up. Union everything.
      const courseGroups = {};
      data.forEach((item) => {
        const key = `${item["Mã mh"]?.trim()}_${item["mã lớp 2"]}_${item["Lớp"]?.trim()}`;
        (courseGroups[key] ||= []).push(item);
      });
      const courses = Object.values(courseGroups).map((groupRows) => {
        const d = groupRows[0];
        const requested = [...new Set(groupRows.flatMap((r) => r._teacher_emails ?? []))];
        const teacher_email = [...new Set(requested.map((e) => name2email[e]).filter(Boolean))];
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
          // Link the course to the selected term so a later term shift cascades.
          term: selectedTermObj?._id || selectedTerm || undefined,
          teacher_email,
          population: d["Số sv"] ?? 0,
          start_date: d["Ngày đầu tuần"]
            ? convertExcelDateToJSDate(d["Ngày đầu tuần"])
            : new Date(selectedTermObj.start),
          credit: d["Số tiết"] ?? 1,
          // Duration = số buổi = số tuần của học kỳ (không hardcode nữa).
          duration: selectedTermObj
            ? Math.max(1, Math.round((new Date(selectedTermObj.end) - new Date(selectedTermObj.start)) / (7 * 86400000)) + 1)
            : 15,
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

      // Before placing anything, wipe the OLD schedule of EXACTLY the courses in
      // this file — each identified by (Mã mh + lớp), across any duplicate course
      // docs sharing that identity. This clears stale/duplicate leftovers so a
      // re-import fully replaces those courses' schedules WITHOUT touching OTHER
      // courses of the same class (importing one course must not send the class's
      // other courses to "chờ xếp").
      const importCourseKeys = courses.map((c) => ({
        course_id: c.course_id,
        course_id_extend: c.course_id_extend,
        class_id: c.class_id,
      }));
      let wipedClassEvents = null;
      if (importCourseKeys.length) {
        try {
          const wipeRes = await fetch("/api/booking/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "courseKeys", courseKeys: importCourseKeys }),
          });
          const wipeData = await wipeRes.json().catch(() => ({}));
          wipedClassEvents = wipeData?.count ?? null;
        } catch {
          /* fall through — per-course clear below still runs as a fallback */
        }
      }

      // Courses already wiped this run. The up-front class wipe above normally
      // covers everything; this per-course clear stays only as a fallback (e.g.
      // if the class wipe request failed) so a moved session never lingers.
      const clearedCourses = new Set();
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

      // Out-of-scope classes excluded above → surface in the report too.
      if (excludedScopeClasses.length) {
        add(0, {}, "skipped", `Ngoài phạm vi quản lý của bạn — KHÔNG nhập: ${excludedScopeClasses.join(", ")}`, "— Ngoài phạm vi —");
      }

      // Warn on rows that share the SAME course identity (Mã mh + mã lớp 2 +
      // Lớp) — those rows collapse into ONE course. That is legitimate for a
      // lecture and its "Bài tập"/"Thực hành" (different tiết → they coexist),
      // but two rows on the SAME weekday + tiết bắt đầu overwrite each other (a
      // lost session), and a fully identical duplicate is almost always a
      // data-entry mistake. Surface every group so the user can review; flag the
      // harmful same-slot case explicitly.
      {
        const idGroups = {};
        data.forEach((r, i) => {
          const mh = String(r["Mã mh"] ?? "").trim();
          const lop = String(r["Lớp"] ?? "").trim();
          if (!mh || !lop) return; // rows with no code/class aren't schedulable
          const ext = String(r["mã lớp 2"] ?? "").trim();
          const key = `${mh}__${ext}__${lop}`;
          (idGroups[key] ||= []).push({ i, r });
        });
        const benign = []; // merged but harmless (different tiết → all kept)
        Object.values(idGroups).forEach((members) => {
          if (members.length < 2) return;
          const first = members[0];
          const mh = String(first.r["Mã mh"] ?? "").trim();
          const ext = String(first.r["mã lớp 2"] ?? "").trim();
          const lop = String(first.r["Lớp"] ?? "").trim();
          const keyLabel = `${mh}${ext ? "+" + ext : ""}·${lop}`;
          // Members colliding on the same weekday + start tiết → real overwrite
          // (one session silently replaces the other). This is the case worth a
          // prominent, per-group warning.
          const slotMap = {};
          members.forEach((m) => {
            const thu = String(m.r["Thứ"] ?? "").trim();
            const tiet = String(m.r["Tiết bắt đầu"] ?? "").trim();
            if (!thu || !tiet) return;
            (slotMap[`${thu}__${tiet}`] ||= []).push(m);
          });
          const clashing = Object.values(slotMap).filter((g) => g.length > 1);
          if (clashing.length) {
            const list = members
              .map((m) => `dòng ${m.i + 1} "${String(m.r["Tên môn học"] ?? "").trim()}" (Thứ ${m.r["Thứ"] || "?"} tiết ${m.r["Tiết bắt đầu"] || "?"})`)
              .join("; ");
            add(
              first.i, first.r, "dupkey",
              `⚠ Trùng khoá môn Mã mh ${mh}${ext ? " + mã lớp 2 " + ext : ""} + lớp ${lop}, VÀ trùng cả Thứ + Tiết bắt đầu → các buổi sẽ ĐÈ mất nhau. Hãy kiểm tra/sửa file. ${list}`,
              String(first.r["Tên môn học"] ?? "").trim()
            );
          } else {
            benign.push(keyLabel);
          }
        });
        // Benign merges (lecture + bài tập/thực hành sharing a code, different
        // tiết) are normal and keep all sessions — surface them once, compactly,
        // instead of flooding the report with one row per subject.
        if (benign.length) {
          add(
            0, data[0], "dupkey",
            `${benign.length} mã môn có nhiều buổi dùng chung khoá (Mã mh + mã lớp 2 + lớp) → gộp chung MỘT môn; khác tiết nên vẫn giữ đủ buổi (thường là Lý thuyết + Bài tập/Thực hành): ${benign.join(", ")}`,
            "— Tổng hợp —"
          );
        }
      }

      for (const [index, _booking] of data.entries()) {
        // Live "now scheduling" indicator so the admin sees exactly which row
        // is being processed (and where it stalls, if it ever does).
        setCurrentBooking({
          row: index + 1,
          code: _booking["Mã mh"],
          name: _booking["Tên môn học"],
          ext: _booking["mã lớp 2"],
          cls: _booking["Lớp"],
          gv: _booking["Giảng viên"],
          tg: _booking["Trợ giảng"],
        });
        // Rows without room/thứ/tiết carry no schedule (e.g. an extra-teacher
        // row) — record them so the report is truly complete.
        if (!(_booking.cleanRoomTitle && +_booking["Tiết bắt đầu"] && +_booking["Thứ"])) {
          if (_booking["Mã mh"])
            add(index, _booking, "skipped", "Thiếu thông tin phòng/thứ/tiết — không xếp lịch");
          // Advance the bar for skipped rows too — otherwise a skipped LAST row
          // (e.g. an internship line with no room/thứ/tiết) leaves the bar under
          // 100% forever and the "done" UI never shows (looks frozen).
          setProgressBooking({ value: ((index + 1) / data.length) * 100 });
          continue;
        }
        try {
          const location = _booking.cleanRoomTitle
            ? rooms.find((r) => r.title === _booking.cleanRoomTitle)?.location
            : locationList.default;
          const room = await fetchT("/api/room", {
            method: "POST",
            body: JSON.stringify({ filter: { title: _booking.cleanRoomTitle, location } }),
          }).then((d) => d.json());
          const course = await fetchT("/api/course", {
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
            let missing;
            if (!room?.[0]?._id) {
              missing = `Không tìm thấy phòng "${_booking.cleanRoomTitle}" (tên/địa điểm không khớp)`;
            } else if (!validCredit(_booking["Số tiết"])) {
              // Most common cause a course fails to create — surface it exactly.
              missing = `Số tiết không hợp lệ ("${_booking["Số tiết"] ?? ""}") — môn KHÔNG được tạo. Hãy sửa "Số tiết" trong Excel rồi import lại.`;
            } else {
              missing = `Không tạo/tìm được môn (kiểm tra Mã mh / Lớp của dòng)`;
            }
            add(index, _booking, "error", missing, title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          // No teacher → keep the course but don't schedule it.
          if (!(course[0].teacher_email?.length)) {
            add(index, _booking, "skipped", "Thiếu giảng viên — môn được tạo nhưng chưa xếp lịch", title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          // Use the matched room's OWN campus for the grid — the pre-loaded room
          // lookup above can miss on a title-format mismatch and leave `location`
          // undefined, which would silently pick the wrong (LT) grid for a cs1 room.
          const effLoc = room?.[0]?.location || location;
          const grid = effLoc === "NVC" ? defaultGridNVC : defaultGridLT;
          const weekday = +_booking["Thứ"];
          // Schedule each ROW by its OWN "Số tiết", NOT the course's credit.
          // A subject code (Mã mh) can carry several session types on separate
          // rows — e.g. MTH00003 = "Vi tích phân 1B" (4 tiết) AND "Bài tập Vi
          // tích phân 1B" (2 tiết) — which collapse into ONE course document
          // (keyed by Mã mh + lớp). Using course.credit would then stretch every
          // session to the lecture's length: the 2-tiết bài tập would be placed
          // as a 4-tiết block and overlap the sibling thực hành → phantom "trùng
          // lịch" on every import. The row's Số tiết is the true block length.
          const rowCreditRaw = _booking["Số tiết"];
          const rowCredit = Number(String(rowCreditRaw ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
          if (!validCredit(rowCreditRaw) || !Number.isFinite(rowCredit) || rowCredit <= 0) {
            // Never fabricate a duration — report the bad row so the admin fixes it.
            add(index, _booking, "skipped", `Số tiết không hợp lệ ("${rowCreditRaw ?? ""}") — không xếp lịch dòng này`, title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }
          const precision = getSnapFromDuration(rowCredit, 1);
          const start_time = roundIndex(+_booking["Tiết bắt đầu"], precision, grid.data);
          const end_time =
            start_time == null
              ? null
              : Math.min(grid.data.length - 1, start_time + rowCredit);

          if (!(start_time != null && start_time >= 0 && end_time != null && end_time >= 0)) {
            add(index, _booking, "skipped", `Không xác định được tiết trên lịch (Tiết bắt đầu = "${_booking["Tiết bắt đầu"]}")`, title);
            setProgressBooking({ value: ((index + 1) / data.length) * 100 });
            continue;
          }

          let booking = {
            teacher_email: _booking._teacher_emails?.map((e) => name2email[e])?.filter((d) => d),
            room: { ...room[0], location: effLoc },
            course: course[0],
            time_slot: {},
          };
          booking = grid.calendar2booking({ weekday, start_time, end_time }, booking, precision);
          booking.time_slot.start_date = new Date(selectedTermObj.start);
          booking.time_slot.end_date = new Date(selectedTermObj.end);

          // First valid session of this course in this run → wipe its old
          // bookings so a moved/removed session doesn't linger.
          const _cid = String(course[0]._id);
          let _wasCleared = false;
          if (!clearedCourses.has(_cid)) {
            clearedCourses.add(_cid);
            try {
              const delRes = await fetchT("/api/booking/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "course", id: _cid }),
              });
              _wasCleared = delRes.ok;
            } catch { /* ignore — fall through to create */ }
          }

          const res = await fetchT("/api/booking/create", {
            method: "POST",
            headers: { "Content-Type": "application/json", email: session?.user?.email },
            body: JSON.stringify([booking]),
          }, 45000);
          const resData = await res.json();
          const madeCount = resData.created?.[0]?.created || 0;
          const wasOverwrite = !!resData.created?.[0]?.overwritten;

          if (resData.conflicts?.length > 0) {
            // Dedupe: the API returns up to 3 example occurrences per conflict —
            // the same weekday+tiết clash on consecutive weeks. Collapse them by
            // ignoring the "(ngày …)" suffix, keeping the first (with its date).
            const _seen = new Set();
            const reason = resData.conflicts
              .flatMap((c) => (c.examples?.map((e) => e.reason) || [c.reason]))
              .filter(Boolean)
              .filter((rsn) => {
                const key = rsn.replace(/\s*\(ngày [^)]*\)/g, "");
                if (_seen.has(key)) return false;
                _seen.add(key);
                return true;
              })
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
          const msg = e?.name === "AbortError"
            ? "Quá thời gian chờ máy chủ (timeout) — bỏ qua dòng này, hãy import lại hoặc xếp tay môn này."
            : String(e);
          add(index, _booking, "error", msg);
        }
        setProgressBooking({ value: ((index + 1) / data.length) * 100 });
      }

      // Loop finished — force the bar to 100% and clear the live row so the
      // results / "Xong" UI always appears, even if the final row(s) were skipped
      // (e.g. an internship line with no room/GV).
      setProgressBooking({ value: 100 });
      setCurrentBooking(null);

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
      dupkey: "Trùng mã môn",
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
        <div className="flex justify-end">
          <Button size="sm" variant="flat" startContent={<DownloadIcon size={14} />}
            onPress={() => downloadTemplate(
              "mau-nhap-lich.xlsx",
              BOOKiNG_FIELDS.map((f) => f.name),
              [["PHY00001", "Vật lý đại cương 1 (Cơ - Nhiệt)", "26VLH_DKD1", "", "60", "", "", "cs1:9,3", "4", "2", "4", "Đặng Hoài Trung", "", "", ""]]
            )}>
            {t("import.downloadTemplate")}
          </Button>
        </div>
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

              {currentBooking && progressBooking.value > 0 && progressBooking.value < 100 && (
                <div className="text-xs rounded-lg border border-primary-200 bg-primary-50 p-2 max-w-md">
                  <div className="font-semibold text-primary-700 mb-0.5">Đang xếp lịch · dòng {currentBooking.row}</div>
                  <div><b>{currentBooking.code || "?"}</b>{currentBooking.ext ? ` · lớp 2: ${currentBooking.ext}` : ""} — {currentBooking.name || ""}</div>
                  <div className="text-default-600">
                    {currentBooking.cls ? `Lớp ${currentBooking.cls} · ` : ""}GV: {currentBooking.gv || "—"}{currentBooking.tg ? ` · TG: ${currentBooking.tg}` : ""}
                  </div>
                </div>
              )}

              {progressBooking.value >= 100 && conflictLog.length > 0 && (() => {
                const count = (s) => conflictLog.filter((r) => r.status === s).length;
                const label = { dupkey: "Trùng mã môn", created: "Tạo mới", overwrite: "Ghi đè", conflict: "Trùng lịch", skipped: "Bỏ qua", error: "Lỗi" };
                const rowBg = { dupkey: "bg-warning-50", conflict: "bg-danger-50", error: "bg-danger-50", overwrite: "bg-primary-50", skipped: "bg-warning-50", created: "bg-success-50" };
                const chipColor = { dupkey: "warning", conflict: "danger", error: "danger", overwrite: "primary", skipped: "warning", created: "success" };
                // Show problems first, then overwrites, then created.
                const order = { dupkey: 0, conflict: 1, error: 2, skipped: 3, overwrite: 4, created: 5 };
                const rows = [...conflictLog].sort((a, b) => (order[a.status] - order[b.status]) || (a.row - b.row));
                return (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Chip size="sm" color="success" variant="flat">Tạo mới: {count("created")}</Chip>
                      <Chip size="sm" color="primary" variant="flat">Ghi đè: {count("overwrite")}</Chip>
                      <Chip size="sm" color="danger" variant="flat">Trùng lịch: {count("conflict")}</Chip>
                      <Chip size="sm" color="warning" variant="flat">Bỏ qua: {count("skipped")}</Chip>
                      {count("dupkey") > 0 && <Chip size="sm" color="warning" variant="flat">Trùng mã môn: {count("dupkey")}</Chip>}
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

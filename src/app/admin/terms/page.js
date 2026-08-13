"use client";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import { 
  Button, 
  Input, 
  Select, 
  SelectItem, 
  Table, 
  TableHeader, 
  TableBody, 
  TableColumn, 
  TableRow, 
  TableCell,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Chip,
  Tooltip,
  Checkbox
} from "@heroui/react";
import moment from "moment";
import { PlusIcon, FlagIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { getVnNationalHolidays, hasLunarDates } from "@/lib/vnHolidays";
import { toast } from "react-toastify";

export default function TermsAndHolidaysPage() {
  const { t } = useI18n();
  const { data: events, mutate, isLoading } = useSWR("/api/calendar-events?type=term,holiday", fetcher);
  const { data: courses } = useSWR("/api/course", fetcher);
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Count courses per term (a term with courses can't be deleted, and its date
  // edits cascade to those courses).
  const countByTerm = useMemo(() => {
    const m = {};
    (courses ?? []).forEach((c) => { if (c.term) m[String(c.term)] = (m[String(c.term)] || 0) + 1; });
    return m;
  }, [courses]);

  // Cascade conflict report ("chặn + báo cáo + vẫn áp dụng").
  const [conflictReport, setConflictReport] = useState(null); // { conflicts, conflictCount, pending }
  const [applying, setApplying] = useState(false);
  // When a term is extended, expand courses to fill it? Default: only trim.
  const [expandOnGrow, setExpandOnGrow] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    type: "term",
    start: "",
    end: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nationalYear, setNationalYear] = useState(String(new Date().getFullYear()));
  const [loadingNational, setLoadingNational] = useState(false);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ title: "", type: "term", start: "", end: "" });
    onOpen();
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setExpandOnGrow(false); // default: only trim, don't expand
    setFormData({
      title: item.title || "",
      type: item.type || "term",
      start: item.start ? moment(item.start).format("YYYY-MM-DD") : "",
      end: item.end ? moment(item.end).format("YYYY-MM-DD") : "",
    });
    onOpen();
  };

  // Search + sort
  const [search, setSearch] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState({ column: "start", direction: "ascending" });

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = (events ?? []).filter(
      (e) =>
        !q ||
        String(e.title ?? "").toLowerCase().includes(q) ||
        String(e.type ?? "").toLowerCase().includes(q)
    );
    const { column, direction } = sortDescriptor;
    rows = [...rows].sort((a, b) => {
      let av, bv;
      if (column === "start" || column === "end") {
        av = new Date(a[column]).getTime() || 0;
        bv = new Date(b[column]).getTime() || 0;
      } else {
        av = String(a[column] ?? "").toLowerCase();
        bv = String(b[column] ?? "").toLowerCase();
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === "descending" ? -cmp : cmp;
    });
    return rows;
  }, [events, search, sortDescriptor]);

  // Add the Vietnamese national public holidays for a year, skipping any that
  // already exist (matched by title + start date).
  const loadNational = async () => {
    const year = parseInt(nationalYear, 10);
    if (!year) return;
    setLoadingNational(true);
    try {
      const existing = new Set(
        (events ?? []).map((e) => `${e.title}|${moment(e.start).format("YYYY-MM-DD")}`)
      );
      const toAdd = getVnNationalHolidays(year).filter(
        (h) => !existing.has(`${h.title}|${h.start}`)
      );
      let added = 0;
      for (const h of toAdd) {
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(h),
        });
        if (res.ok) added += 1;
      }
      mutate();
      if (added === 0) {
        toast.info(t("terms.nationalNoneNew", { y: year }));
      } else {
        toast.success(t("terms.nationalAdded", { n: added, y: year }));
        if (!hasLunarDates(year)) toast.warning(t("terms.nationalNoLunar", { y: year }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNational(false);
    }
  };

  const resetForm = () => {
    onClose();
    setEditingId(null);
    setFormData({ title: "", type: "term", start: "", end: "" });
  };

  // Cascade a term's date change to all its courses. Returns true if applied.
  const runReschedule = async ({ termId, start, end, title, type, force, expand }) => {
    const res = await fetch("/api/admin/term/reschedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId, start, end, force, expand }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.blocked) {
      setConflictReport({ conflicts: data.conflicts || [], conflictCount: data.conflictCount || 0, pending: { termId, start, end, title, type, expand } });
      return false;
    }
    if (!res.ok || !data?.success) {
      toast.error(data?.message || "Không thể cập nhật học kỳ.");
      return false;
    }
    // Keep the title/type in sync (reschedule only touches dates).
    await fetch("/api/calendar-events", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: termId, title, type }),
    });
    if (data.created != null) toast.success(t("terms.rescheduled", { n: data.created }) || `Đã dời ${data.created} buổi.`);
    return true;
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Editing an existing TERM → go through the cascade so its courses move too.
      if (editingId && formData.type === "term") {
        const ok = await runReschedule({
          termId: editingId,
          start: formData.start,
          end: formData.end,
          title: formData.title,
          type: formData.type,
          force: false,
          expand: expandOnGrow,
        });
        if (ok) { mutate(); resetForm(); }
        else onClose(); // blocked → conflict modal shows; keep editingId for retry
        return;
      }
      // Create (new term/holiday) or edit a holiday → plain event write.
      const res = await fetch("/api/calendar-events", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { _id: editingId, ...formData } : formData),
      });
      if (res.ok) { mutate(); resetForm(); }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // "Vẫn áp dụng" — reschedule despite the reported conflicts.
  const applyForce = async () => {
    if (!conflictReport?.pending) return;
    setApplying(true);
    try {
      const ok = await runReschedule({ ...conflictReport.pending, force: true });
      if (ok) { mutate(); setConflictReport(null); resetForm(); }
    } finally {
      setApplying(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm(t("terms.confirmDelete"))) return;
    try {
      const res = await fetch("/api/calendar-events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.message || "Không thể xoá.");
        return;
      }
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold">{t("terms.title")}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="number"
            size="sm"
            aria-label={t("terms.year")}
            className="w-24"
            value={nationalYear}
            onValueChange={setNationalYear}
            startContent={<span className="text-default-400 text-xs">{t("terms.year")}</span>}
          />
          <Button
            color="secondary"
            variant="flat"
            onPress={loadNational}
            isLoading={loadingNational}
            startContent={<FlagIcon size={16} />}
          >
            {t("terms.loadNational")}
          </Button>
          <Button color="primary" onPress={openCreate} endContent={<PlusIcon />}>
            {t("terms.createNew")}
          </Button>
        </div>
      </div>

      <Input
        isClearable
        size="sm"
        className="max-w-xs"
        placeholder={t("tbl.search")}
        value={search}
        onValueChange={setSearch}
        onClear={() => setSearch("")}
      />

      <Table
        aria-label="Terms and Holidays Table"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
      >
        <TableHeader>
          <TableColumn key="title" allowsSorting>{t("terms.colTitle")}</TableColumn>
          <TableColumn key="type" allowsSorting>{t("terms.colType")}</TableColumn>
          <TableColumn key="start" allowsSorting>{t("terms.colStart")}</TableColumn>
          <TableColumn key="end" allowsSorting>{t("terms.colEnd")}</TableColumn>
          <TableColumn key="count">{t("terms.colCourses")}</TableColumn>
          <TableColumn key="actions">{t("terms.colActions")}</TableColumn>
        </TableHeader>
        <TableBody
          items={displayed}
          isLoading={isLoading}
          emptyContent={t("terms.empty")}
        >
          {(item) => (
            <TableRow key={item._id}>
              <TableCell className="font-semibold">{item.title}</TableCell>
              <TableCell>
                <Chip color={item.type === 'term' ? "primary" : "secondary"} size="sm">
                  {item.type.toUpperCase()}
                </Chip>
              </TableCell>
              <TableCell>{moment(item.start).format('DD MMM YYYY')}</TableCell>
              <TableCell>{moment(item.end).format('DD MMM YYYY')}</TableCell>
              <TableCell>
                {item.type === "term" ? (
                  <Chip size="sm" variant="flat" color={countByTerm[item._id] ? "warning" : "default"}>
                    {countByTerm[item._id] || 0}
                  </Chip>
                ) : (
                  <span className="text-default-300">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button size="sm" variant="flat" onPress={() => openEdit(item)}>
                    {t("tbl.edit")}
                  </Button>
                  {item.type === "term" && countByTerm[item._id] > 0 ? (
                    <Tooltip content={t("terms.deleteBlocked", { n: countByTerm[item._id] }) || `Còn ${countByTerm[item._id]} môn — không thể xoá`}>
                      <span>
                        <Button size="sm" color="danger" variant="flat" isDisabled>
                          {t("terms.delete")}
                        </Button>
                      </span>
                    </Tooltip>
                  ) : (
                    <Button size="sm" color="danger" variant="flat" onPress={() => onDelete(item._id)}>
                      {t("terms.delete")}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{editingId ? t("terms.editModal") : t("terms.createModal")}</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label={t("terms.fieldTitle")}
              placeholder={t("terms.fieldTitlePh")}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              isRequired
            />
            <Select
              label={t("terms.fieldType")}
              selectedKeys={[formData.type]}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <SelectItem key="term" value="term">{t("terms.typeTerm")}</SelectItem>
              <SelectItem key="holiday" value="holiday">{t("terms.typeHoliday")}</SelectItem>
            </Select>
            <Input
              type="date"
              label={t("terms.startDate")}
              placeholder=" "
              value={formData.start}
              onChange={(e) => setFormData({...formData, start: e.target.value})}
              isRequired
            />
            <Input
              type="date"
              label={t("terms.endDate")}
              placeholder=" "
              value={formData.end}
              onChange={(e) => setFormData({...formData, end: e.target.value})}
              isRequired
            />
            {editingId && formData.type === "term" && (
              <div className="rounded-lg bg-default-50 p-3 flex flex-col gap-1">
                <Checkbox size="sm" isSelected={expandOnGrow} onValueChange={setExpandOnGrow}>
                  {t("terms.expandOnGrow") || "Nới số buổi của môn nếu học kỳ dài hơn"}
                </Checkbox>
                <p className="text-xs text-default-400 ml-6">
                  {t("terms.expandHint") || "Mặc định chỉ RÚT cho vừa học kỳ (môn 12 tuần, kỳ 10 tuần → còn 10). Tick để MỞ RỘNG môn ngắn hơn cho bằng học kỳ."}
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
             <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>{t("common.save")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Conflict report — shown when a term shift would clash with other terms */}
      <Modal isOpen={!!conflictReport} onClose={() => setConflictReport(null)} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-0">
            <span className="text-danger">{t("terms.conflictTitle") || "Dời học kỳ sẽ gây trùng lịch"}</span>
            <span className="text-xs font-normal text-default-500">
              {t("terms.conflictCount", { n: conflictReport?.conflictCount || 0 }) || `${conflictReport?.conflictCount || 0} trường hợp trùng`}
            </span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              {t("terms.conflictBody") || "Các buổi dưới đây sẽ đụng với phòng/giảng viên của lịch khác. Bạn có thể huỷ để chỉnh lại, hoặc vẫn áp dụng."}
            </p>
            <div className="max-h-80 overflow-y-auto text-xs space-y-1">
              {(conflictReport?.conflicts || []).map((c, i) => (
                <div key={i} className="p-2 rounded-lg bg-danger-50">
                  <Chip size="sm" color="danger" variant="flat" className="h-4 text-[10px] mr-1">{c.kind}</Chip>
                  <span className="font-medium">{c.course}</span>
                  <span className="text-default-500"> ⟷ {c.with} · {c.at}</span>
                </div>
              ))}
              {conflictReport?.conflictCount > (conflictReport?.conflicts?.length || 0) && (
                <p className="text-default-400 italic">… và {conflictReport.conflictCount - conflictReport.conflicts.length} trường hợp khác.</p>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setConflictReport(null)}>{t("common.cancel")}</Button>
            <Button color="danger" isLoading={applying} onPress={applyForce}>
              {t("terms.applyAnyway") || "Vẫn áp dụng"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}

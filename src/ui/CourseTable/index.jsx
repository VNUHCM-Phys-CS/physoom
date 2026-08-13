"use client";

import { useCallback, useMemo, useState } from "react";
import TableEvent from "../TableEvent";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import CourseModal from "../CourseModal";
import {
  useDisclosure, Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem,
} from "@heroui/react";
import { CalendarRangeIcon } from "lucide-react";
import { toast } from "react-toastify";
import { useConfirm } from "../ConfirmDialog";

const COURSE_FIELDS = [
  { name: "Course name", uid: "title", sortable: true },
  { name: "Course id", uid: "course_id", sortable: true },
  { name: "Course id extend", uid: "course_id_extend", sortable: true },
  { name: "Class id", uid: "class_id", sortable: true },
  { name: "Học kỳ", uid: "termTitle", sortable: true },
  { name: "#Student", uid: "population", sortable: true },
  { name: "Credit", uid: "credit", sortable: true },
  { name: "Duration", uid: "duration", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  { name: "Category", uid: "category", sortable: true },
  {
    name: "Teacher Email",
    uid: "teacher_email",
    sortable: true,
    format: (d) => (Array.isArray(d) ? d : (d ?? "").split(";")),
  },
  { name: "Note", uid: "note", sortable: true },
  { name: "⚠", uid: "warnings" },
  { name: "ACTIONS", uid: "actions" },
];
const INITIAL_VISIBLE_COLUMNS = COURSE_FIELDS.map((d) => d.uid);
const UNASSIGN = "__none__";

export default function CourseTable() {
  const { data: course, mutate } = useSWR("/api/course", fetcher, {
    next: { tags: ["course"], revalidate: 60 },
  });
  const { data: terms } = useSWR("/api/calendar-events?type=term", fetcher);

  const termTitleById = useMemo(() => {
    const m = {};
    (terms ?? []).forEach((t) => { m[String(t._id)] = t.title; });
    return m;
  }, [terms]);

  // Decorate each course with its term title so the table can show/sort it.
  const rows = useMemo(
    () => (course ?? []).map((c) => ({ ...c, termTitle: termTitleById[String(c.term)] || "" })),
    [course, termTitleById]
  );

  const [data, setData] = useState({});
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { confirm, confirmDialog } = useConfirm();

  // ── Bulk "assign term" ─────────────────────────────────────────────────────
  const [assignItems, setAssignItems] = useState(null); // selected course rows
  const [assignTerm, setAssignTerm] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [clearSel, setClearSel] = useState(null); // fn to clear the table selection

  const openAssign = (items, clear) => {
    setAssignItems(items);
    setAssignTerm("");
    setClearSel(() => clear);
  };
  const runAssign = async () => {
    if (!assignItems?.length || !assignTerm) return;
    setAssigning(true);
    try {
      const term = assignTerm === UNASSIGN ? null : assignTerm;
      const res = await fetch("/api/course/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignItems.map((c) => ({ _id: c._id, term }))),
      });
      if (!res.ok) throw new Error();
      toast.success(
        term
          ? `Đã gán ${assignItems.length} môn vào "${termTitleById[term] || "học kỳ"}".`
          : `Đã gỡ học kỳ của ${assignItems.length} môn.`
      );
      mutate();
      clearSel?.();
      setAssignItems(null);
    } catch {
      toast.error("Gán học kỳ thất bại.");
    } finally {
      setAssigning(false);
    }
  };

  const onDelete = useCallback(async (data) => {
    const count = data?.length ?? 0;
    const ok = await confirm({
      message: `Delete ${count} course${count === 1 ? "" : "s"}? This action cannot be undone.`,
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/course", {
        method: "DELETE",
        body: JSON.stringify({ ids: data.map((d) => d._id) }),
      });
      if (res.status !== 201) console.log("Something wrong");
      else mutate();
    } catch (error) {
      console.log(error);
    }
  }, [confirm, mutate]);

  const onEdit = useCallback(async (data) => {
    setData(data);
    onOpen();
  }, [onOpen]);

  return (
    <>
      {confirmDialog}
      <TableEvent
        columns={COURSE_FIELDS}
        data={rows}
        statusOptions={[]}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
        onDelete={onDelete}
        onEdit={onEdit}
        isAddNew={true}
        onAddNew={() => { setData(null); onOpen(); }}
        importPath={"/admin/course/importfile"}
        renderBulkActions={(selectedItems, clear) => (
          <Button
            color="secondary"
            variant="flat"
            isDisabled={!selectedItems.length}
            startContent={<CalendarRangeIcon size={16} />}
            onPress={() => openAssign(selectedItems, clear)}
          >
            Gán học kỳ{selectedItems.length ? ` (${selectedItems.length})` : ""}
          </Button>
        )}
      />
      {isOpen && (
        <CourseModal data={data} isOpen={isOpen} onOpenChange={onOpenChange} terms={terms} />
      )}

      {/* Bulk assign-term modal */}
      <Modal isOpen={!!assignItems} onClose={() => setAssignItems(null)}>
        <ModalContent>
          <ModalHeader>Gán học kỳ cho {assignItems?.length || 0} môn</ModalHeader>
          <ModalBody>
            <Select
              label="Học kỳ"
              selectedKeys={assignTerm ? [assignTerm] : []}
              onChange={(e) => setAssignTerm(e.target.value)}
            >
              {[
                ...(terms ?? []).map((t) => (
                  <SelectItem key={String(t._id)} value={String(t._id)}>{t.title}</SelectItem>
                )),
                <SelectItem key={UNASSIGN} value={UNASSIGN} className="text-danger">— Gỡ học kỳ —</SelectItem>,
              ]}
            </Select>
            <p className="text-xs text-default-400">
              Chỉ đổi trường học kỳ của môn (không đụng lịch đã xếp). Dời/rút ngày học kỳ mới là thứ kéo theo lịch.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setAssignItems(null)}>Huỷ</Button>
            <Button color="primary" isLoading={assigning} isDisabled={!assignTerm} onPress={runAssign}>
              Gán
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

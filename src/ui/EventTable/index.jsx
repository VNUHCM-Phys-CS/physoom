"use client";
import { useCallback, useState, useMemo } from "react";
import TableEvent from "../TableEvent";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import { useDisclosure } from "@heroui/react";
import EventModal from "../EventModal";
import { useConfirm } from "../ConfirmDialog";

const EVENT_FIELDS = [
  { name: "Title", uid: "title", sortable: true },
  { name: "Type", uid: "type", sortable: true },
  { name: "Status", uid: "status", sortable: true },
  { name: "Start Time", uid: "start_fmt", sortable: true },
  { name: "End Time", uid: "end_fmt", sortable: true },
  { name: "Room", uid: "room_title", sortable: true },
  { name: "Course", uid: "course_title", sortable: true },
  { name: "Teacher Email", uid: "teacher_email" },
  { name: "ACTIONS", uid: "actions" },
];

const INITIAL_VISIBLE_COLUMNS = ["title", "type", "status", "start_fmt", "end_fmt", "room_title", "course_title", "actions"];

export default function EventTable({ statusOptions }) {
  const { data: events, mutate } = useSWR("/api/calendar-events", fetcher, {
    revalidateOnFocus: false,
  });
  
  const [data, setData] = useState({});
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { confirm, confirmDialog } = useConfirm();

  const formattedData = useMemo(() => {
    return (events || []).map(e => ({
      ...e,
      room_title: e.room ? e.room.title : "",
      course_title: e.course ? e.course.title : "",
      start_fmt: e.start ? new Date(e.start).toLocaleString() : "",
      end_fmt: e.end ? new Date(e.end).toLocaleString() : "",
    }));
  }, [events]);

  const onDelete = useCallback(async (selectedData) => {
    const count = selectedData?.length ?? 0;
    const ok = await confirm({
      message: `Delete ${count} event${count === 1 ? "" : "s"}? This action cannot be undone.`,
    });
    if (!ok) return;
    try {
      const res = await fetch("/api/calendar-events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedData.map((d) => d._id) }),
      });
      if (res.ok) mutate();
    } catch (error) {
      console.error(error);
    }
  }, [mutate, confirm]);

  const onEdit = useCallback((eventData) => {
    setData(eventData);
    onOpen();
  }, [onOpen]);

  const onAddNew = useCallback(() => {
    setData(null);
    onOpen();
  }, [onOpen]);

  return (
    <>
      {confirmDialog}
      <TableEvent
        columns={EVENT_FIELDS}
        data={formattedData}
        statusOptions={statusOptions}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
        onDelete={onDelete}
        onEdit={onEdit}
        isAddNew={true}
        onAddNew={onAddNew}
      />
      {isOpen && (
        <EventModal 
          data={data} 
          isOpen={isOpen} 
          onOpenChange={onOpenChange} 
          onSave={() => mutate()} 
        />
      )}
    </>
  );
}

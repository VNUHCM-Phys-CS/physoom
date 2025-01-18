"use client";

import { useCallback, useState } from "react";
import TableEvent from "../TableEvent";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import CourseModal from "../CourseModal";
import { useDisclosure } from "@heroui/react";

const COURSE_FIELDS = [
  { name: "Course name", uid: "title", sortable: true },
  { name: "Course id", uid: "course_id", sortable: true },
  { name: "Class id", uid: "class_id", sortable: true },
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
  { name: "ACTIONS", uid: "actions" },
];
const INITIAL_VISIBLE_COLUMNS = COURSE_FIELDS.map((d) => d.uid);

export default function CourseTable() {
  const { data: course, mutate } = useSWR("/api/course", fetcher, {
    next: { tags: ["course"], revalidate: 60 },
  });
  const [data, setData] = useState({});
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const onDelete = useCallback(async (data) => {
    try {
      const res = await fetch("/api/course", {
        method: "DELETE",
        body: JSON.stringify({ ids: data.map((d) => d._id) }),
      });
      if (res.status !== 201) {
        console.log("Something wrong");
      } else {
        // success
        mutate();
      }
    } catch (error) {
      console.log(error);
      console.log("Something wrong");
    }
  }, []);
  const onEdit = useCallback(async (data) => {
    setData(data);
    onOpen();
  }, []);
  console.log(data);
  return (
    <>
      <TableEvent
        columns={COURSE_FIELDS}
        data={course}
        statusOptions={[]}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
        onDelete={onDelete}
        onEdit={onEdit}
        importPath={"/admin/course/importfile"}
      />
      {isOpen && (
        <CourseModal data={data} isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </>
  );
}

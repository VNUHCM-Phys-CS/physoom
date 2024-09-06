"use client";
import React from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";

const COURSE_FIELDS = [
  { name: "Course name", uid: "title", sortable: true },
  { name: "Course id", uid: "course_id", sortable: true },
  { name: "Class id", uid: "class_id", sortable: true },
  { name: "#Student", uid: "population", sortable: true },
  { name: "Credit", uid: "credit", sortable: true },
  { name: "Duration", uid: "duration", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  {
    name: "Category",
    uid: "category",
    sortable: true,
    format: (d) => (Array.isArray(d) ? d : (d ?? "").replaceAll(',',';').split(";")),
  },
  { name: "Start Date", uid: "start_date", sortable: true },
  { name: "Teacher Email", uid: "teacher_email", sortable: true, format: (d) => (Array.isArray(d) ? d : (d ?? "").replaceAll(',',';').split(";")) },
  { name: "Note", uid: "note", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = COURSE_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  return (
    <div>
      <CSVReader
        path={"/api/course/create"}
        email={session?.user?.email}
        collums={COURSE_FIELDS}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      />
    </div>
  );
};

export default Page;

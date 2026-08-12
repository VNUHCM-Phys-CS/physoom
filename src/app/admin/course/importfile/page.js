"use client";
import React from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";
import { Button } from "@heroui/react";
import { DownloadIcon } from "lucide-react";
import { downloadTemplate } from "@/lib/downloadTemplate";
import { useI18n } from "@/i18n/I18nProvider";

const COURSE_FIELDS = [
  { name: "Course name", uid: "title", sortable: true },
  { name: "Course id", uid: "course_id", sortable: true },
  {
    name: "Course id extend",
    uid: "course_id_extend",
    sortable: true,
  },
  {
    name: "Class id",
    uid: "class_id",
    sortable: true,
    format: (d) =>
      Array.isArray(d) ? d : (d ?? "").replaceAll(",", ";").split(";"),
  },
  { name: "#Student", uid: "population", sortable: true },
  { name: "Credit", uid: "credit", sortable: true },
  { name: "Duration", uid: "duration", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  {
    name: "Category",
    uid: "category",
    sortable: true,
    format: (d) =>
      Array.isArray(d) ? d : (d ?? "").replaceAll(",", ";").split(";"),
  },
  { name: "Start Date", uid: "start_date", sortable: true },
  {
    name: "Teacher Email",
    uid: "teacher_email",
    sortable: true,
    format: (d) =>
      Array.isArray(d) ? d : (d ?? "").replaceAll(",", ";").split(";"),
  },
  { name: "Note", uid: "note", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = COURSE_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  const { t } = useI18n();
  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button size="sm" variant="flat" startContent={<DownloadIcon size={14} />}
          onPress={() => downloadTemplate(
            "mau-nhap-mon-hoc.xlsx",
            COURSE_FIELDS.map((c) => c.name),
            [["Vật lý đại cương 1 (Cơ - Nhiệt)", "PHY00001", "", "26VLH_DKD1", "60", "4", "15", "NVC", "", "2026-09-14", "nguyenvana@hcmus.edu.vn", ""]]
          )}>
          {t("import.downloadTemplate")}
        </Button>
      </div>
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

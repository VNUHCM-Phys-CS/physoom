"use client";
import React from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";

const BOOKiNG_FIELDS = [
  { name: "Mã mh", uid: "Mã mh", sortable: true },
  { name: "Tên môn học", uid: "Tên môn học", sortable: true },
  { name: "Lớp", uid: "Lớp", sortable: true },
  { name: "Số sv", uid: "Số sv", sortable: true },
  { name: "sosvMax", uid: "sosvMax", sortable: true },
  { name: "tcphong", uid: "tcphong", sortable: true },
  { name: "Tên phòng", uid: "Tên phòng", sortable: true },
  { name: "Thứ", uid: "Thứ", sortable: true },
  { name: "Tiết bắt đầu", uid: "Tiết bắt đầu", sortable: true },
  { name: "Số tiết", uid: "Số tiết", sortable: true },
  { name: "Giảng viên", uid: "Giảng viên", sortable: true },
  { name: "Trợ giảng", uid: "Trợ giảng", sortable: true },
  { name: "Tuần bd", uid: "Tuần bd", sortable: true },
  { name: "Ngày đầu tuần", uid: "Ngày đầu tuần", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = BOOKiNG_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  return (
    <div>
      <CSVReader
        path={"/api/room/create"}
        email={session?.user?.email}
        collums={BOOKiNG_FIELDS}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      />
    </div>
  );
};

export default Page;

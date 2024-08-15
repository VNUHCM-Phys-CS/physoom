"use client";
import React from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";

const ROOM_FIELDS = [
  { name: "Room name", uid: "title", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  { name: "#Student", uid: "limit", sortable: true },
  {
    name: "Tag",
    uid: "category",
    sortable: false,
    format: (d) => (Array.isArray(d) ? d : (d ?? "").split(";")),
  },
  { name: "Note", uid: "note", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = ROOM_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  return (
    <div>
      <CSVReader
        path={"/api/room/create"}
        email={session?.user?.email}
        collums={ROOM_FIELDS}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      />
    </div>
  );
};

export default Page;

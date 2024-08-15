"use client";

import { useCallback } from "react";
import TableEvent from "../TableEvent";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";

const ROOM_FIELDS = [
  { name: "Room name", uid: "title", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  { name: "#Student", uid: "limit", sortable: true },
  { name: "Tag", uid: "category", sortable: false },
  { name: "Note", uid: "note", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];
const INITIAL_VISIBLE_COLUMNS = ROOM_FIELDS.map((d) => d.uid);

export default function RoomTable() {
  const { data: room, mutate } = useSWR("/api/room", fetcher, {
    next: { tags: ["room"], revalidate: 60 },
  });
  const onDelete = useCallback(async (data) => {
    try {
      const res = await fetch("/api/room", {
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
  return (
    <TableEvent
      columns={ROOM_FIELDS}
      data={room}
      statusOptions={[]}
      INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      onDelete={onDelete}
      importPath={"/admin/room/importfile"}
    />
  );
}

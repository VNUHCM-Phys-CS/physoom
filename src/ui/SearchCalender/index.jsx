"use client";
import CalendarByUser from "../CalendarByUser";
import useSWR from "swr";
import {
  Autocomplete,
  AutocompleteSection,
  AutocompleteItem,
} from "@heroui/autocomplete";
import { useEffect, useMemo, useState } from "react";
import { customSubtitle, fetcheroptions, getClass } from "@/lib/ulti";
import { Select, SelectItem } from "@heroui/react";
import ExportBookingButton from "../ExportBookingButton";

export default function ({onClickEvent,onDragStart}) {
  const [searchKey, setSearchKey] = useState("teacher");
  const _searchKey = useMemo(() => new Set([searchKey]), [searchKey]);
  const [filter, setFilter] = useState();
  const { data: userList } = useSWR(
    [
      "/api/user",
      {
        method: "GET",
      },
    ],
    fetcheroptions,
    { tags: ["user"], revalidate: 60 }
  );
  const { data: classList } = useSWR(
    [
      "/api/class",
      {
        method: "GET",
      },
    ],
    fetcheroptions,
    { tags: ["class"], revalidate: 60 }
  );

  const { data: roomList } = useSWR(
    [
      "/api/room",
      {
        method: "GET",
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );
  const queryInfo = useMemo(() => {
    if (!filter) {
      return null;
    } else {
      switch (searchKey) {
        case "teacher":
          return {
            method: "POST",
            body: JSON.stringify({
              filter: { teacher_email: filter },
            }),
          };
        case "room":
          return {
            method: "POST",
            body: JSON.stringify({
              filter: { room: filter },
            }),
          };
        case "class":
          return {
            method: "POST",
            body: JSON.stringify({
              filter: { "course.class_id": getClass(filter) },
              isApproximate: true,
            }),
          };
        default:
          return null;
      }
    }
  }, [searchKey, filter]);
  const { data: userEvents } = useSWR(
    [filter ? "/api/booking" : null, queryInfo],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex grow gap-2">
          <Select
            label="Search by"
            selectedKeys={_searchKey}
            onSelectionChange={(v) => {
              setFilter(undefined);
              setSearchKey(v.values().next().value);
            }}
            className="max-w-[200px]"
          >
            <SelectItem value="teacher" key="teacher">
              Teacher
            </SelectItem>
            <SelectItem value="room" key="room">
              Room
            </SelectItem>
            <SelectItem value="class" key="class">
              Class
            </SelectItem>
          </Select>
          {searchKey === "teacher" && (
            <Autocomplete
              label="Lecturer"
              variant="bordered"
              placeholder="Search by email"
              className="max-w-xs"
              selectedKey={filter}
              onSelectionChange={setFilter}
            >
              {(userList ?? []).map((u) => (
                <AutocompleteItem key={u} value={u}>
                  {u}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          )}
          {searchKey === "room" && (
            <Autocomplete
              label="Room"
              variant="bordered"
              placeholder="Search by Room"
              className="max-w-xs"
              selectedKey={filter}
              onSelectionChange={setFilter}
            >
              {(roomList ?? []).map(({ _id, title }) => (
                <AutocompleteItem key={_id} value={_id}>
                  {title}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          )}
          {searchKey === "class" && (
            <Autocomplete
              label="Class"
              variant="bordered"
              placeholder="Search by Class id"
              className="max-w-xs"
              selectedKey={filter}
              onSelectionChange={setFilter}
            >
              {(classList ?? []).map(({ class_id: u }) => (
                <AutocompleteItem key={u} value={u}>
                  {u}
                </AutocompleteItem>
              ))}
            </Autocomplete>
          )}
        </div>
        <ExportBookingButton data={userEvents} />
      </div>
      <CalendarByUser _events={userEvents} customSubtitle={customSubtitle} onClickEvent={onClickEvent} onDragStart={onDragStart}/>
    </>
  );
}

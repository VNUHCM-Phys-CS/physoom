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
import { useI18n } from "@/i18n/I18nProvider";

export default function ({onClickEvent, onDoubleClick, onDragStart}) {
  const { t } = useI18n();
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
    [filter ? "/api/calendar-events/fetch" : null, queryInfo],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex grow gap-2">
          <Select
            label={t("search.by")}
            selectedKeys={_searchKey}
            onSelectionChange={(v) => {
              setFilter(undefined);
              setSearchKey(v.values().next().value);
            }}
            className="max-w-[200px]"
          >
            <SelectItem value="teacher" key="teacher">
              {t("search.teacher")}
            </SelectItem>
            <SelectItem value="room" key="room">
              {t("search.room")}
            </SelectItem>
            <SelectItem value="class" key="class">
              {t("search.class")}
            </SelectItem>
          </Select>
          {searchKey === "teacher" && (
            <Autocomplete
              label={t("search.teacher")}
              variant="bordered"
              placeholder="Tìm theo tên hoặc email"
              className="max-w-xs"
              selectedKey={filter}
              onSelectionChange={setFilter}
            >
              {(userList ?? []).map((u) => {
                const email = typeof u === "string" ? u : u.email;
                const name = typeof u === "string" ? null : u.name;
                return (
                  <AutocompleteItem
                    key={email}
                    textValue={name ? `${name} ${email}` : email}
                  >
                    {name ? (
                      <div className="flex flex-col">
                        <span className="text-sm">{name}</span>
                        <span className="text-xs text-default-400">{email}</span>
                      </div>
                    ) : (
                      email
                    )}
                  </AutocompleteItem>
                );
              })}
            </Autocomplete>
          )}
          {searchKey === "room" && (
            <Autocomplete
              label={t("search.room")}
              variant="bordered"
              placeholder={t("search.byRoom")}
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
              label={t("search.class")}
              variant="bordered"
              placeholder={t("search.byClass")}
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
        <ExportBookingButton events={userEvents} />
      </div>
      <CalendarByUser _events={userEvents} customSubtitle={customSubtitle} onClickEvent={onClickEvent} onDoubleClick={onDoubleClick} onDragStart={onDragStart}/>
    </>
  );
}

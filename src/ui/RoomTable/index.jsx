"use client";

import React, { useCallback, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import RoomModal from "../RoomModal";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Chip,
  Pagination,
  Switch,
  useDisclosure,
} from "@heroui/react";
import { PlusIcon } from "@/ui/icons/PlusIcon";
import { VerticalDotsIcon } from "@/ui/icons/VerticalDotsIcon";
import { SearchIcon } from "@/ui/icons/SearchIcon";
import { ChevronDownIcon } from "@/ui/icons/ChevronDownIcon";
import { WarningIcon } from "../icons/WarningIcon";
import { useConfirm } from "../ConfirmDialog";

const ROOM_FIELDS = [
  { name: "Room name", uid: "title", sortable: true },
  { name: "Location", uid: "location", sortable: true },
  { name: "#Student", uid: "limit", sortable: true },
  { name: "Tag", uid: "category", sortable: false },
  { name: "Bookable", uid: "isBookable", sortable: false },
  { name: "Note", uid: "note", sortable: true },
  { name: "ACTIONS", uid: "actions" },
];
const INITIAL_VISIBLE_COLUMNS = ROOM_FIELDS.map((d) => d.uid);

export default function RoomTable() {
  const { data: room, mutate } = useSWR("/api/room", fetcher, {
    next: { tags: ["room"], revalidate: 60 },
  });
  const [editData, setEditData] = useState({});
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { confirm, confirmDialog } = useConfirm();

  // Table state
  const [filterValue, setFilterValue] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const [visibleColumns, setVisibleColumns] = useState(new Set(INITIAL_VISIBLE_COLUMNS));
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [sortDescriptor, setSortDescriptor] = useState(undefined);
  const [page, setPage] = useState(1);

  const data = room ?? [];

  const onDelete = useCallback(
    async (items) => {
      const count = items?.length ?? 0;
      const ok = await confirm({
        message: `Delete ${count} room${count === 1 ? "" : "s"}? This action cannot be undone.`,
      });
      if (!ok) return;
      try {
        const res = await fetch("/api/room", {
          method: "DELETE",
          body: JSON.stringify({ ids: items.map((d) => d._id) }),
        });
        if (res.status !== 201) {
          console.log("Something wrong");
        } else {
          mutate();
        }
      } catch (error) {
        console.log(error);
      }
    },
    [mutate, confirm]
  );

  const onEdit = useCallback(
    (item) => {
      setEditData(item);
      onOpen();
    },
    [onOpen]
  );

  const onToggleBookable = useCallback(
    async (roomItem) => {
      const newValue = !roomItem.isBookable;
      // Optimistic update
      mutate(
        (current) =>
          current?.map((r) =>
            r._id?.toString() === roomItem._id?.toString()
              ? { ...r, isBookable: newValue }
              : r
          ),
        false
      );
      try {
        const res = await fetch(`/api/room/${roomItem._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBookable: newValue }),
        });
        if (!res.ok) {
          console.error("Toggle bookable failed:", res.status, await res.text());
          mutate(); // revert to server state
        }
      } catch (err) {
        console.error(err);
        mutate(); // revert to server state
      }
    },
    [mutate]
  );

  const onCopyBookingLink = useCallback((roomItem) => {
    const slug = roomItem.title.replace(/:/g, "~");
    const url = window.location.origin + "/book/" + slug;
    navigator.clipboard.writeText(url).then(() => {
      alert("Booking link copied:\n" + url);
    });
  }, []);

  // Derived table data
  const headerColumns = React.useMemo(() => {
    if (visibleColumns === "all") return ROOM_FIELDS;
    return ROOM_FIELDS.filter((col) => Array.from(visibleColumns).includes(col.uid));
  }, [visibleColumns]);

  const filteredItems = React.useMemo(() => {
    if (!filterValue) return data;
    return data.filter((item) =>
      JSON.stringify(item).toLowerCase().includes(filterValue.toLowerCase())
    );
  }, [data, filterValue]);

  const pages = Math.max(1, Math.ceil(filteredItems.length / rowsPerPage));

  const pageItems = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredItems.slice(start, start + rowsPerPage);
  }, [page, filteredItems, rowsPerPage]);

  const sortedItems = React.useMemo(() => {
    if (!sortDescriptor) return [...pageItems];
    return [...pageItems].sort((a, b) => {
      const cmp =
        a[sortDescriptor.column] < b[sortDescriptor.column]
          ? -1
          : a[sortDescriptor.column] > b[sortDescriptor.column]
          ? 1
          : 0;
      return sortDescriptor.direction === "descending" ? -cmp : cmp;
    });
  }, [sortDescriptor, pageItems]);

  const renderCell = React.useCallback(
    (item, columnKey) => {
      const cellValue = item[columnKey];
      switch (columnKey) {
        case "category":
          return (
            <div className="flex gap-1 flex-wrap">
              {(item.category ?? []).map((d, i) => (
                <Chip key={i} className="capitalize" size="sm" variant="flat">
                  {d}
                </Chip>
              ))}
            </div>
          );
        case "isBookable":
          return (
            <Switch
              isSelected={!!item.isBookable}
              size="sm"
              onValueChange={() => onToggleBookable(item)}
              aria-label="Toggle bookable"
            />
          );
        case "actions":
          return (
            <div className="relative flex justify-end items-center gap-2">
              <Dropdown>
                <DropdownTrigger>
                  <Button isIconOnly size="sm" variant="light">
                    <VerticalDotsIcon className="text-default-300" />
                  </Button>
                </DropdownTrigger>
                <DropdownMenu>
                  <DropdownItem onPress={() => onEdit(item)}>Edit</DropdownItem>
                  <DropdownItem onPress={() => onDelete([item])}>Delete</DropdownItem>
                  {item.isBookable ? (
                    <DropdownItem onPress={() => onCopyBookingLink(item)}>
                      Copy booking link
                    </DropdownItem>
                  ) : null}
                </DropdownMenu>
              </Dropdown>
            </div>
          );
        default:
          return Array.isArray(cellValue) ? cellValue.join("; ") : cellValue;
      }
    },
    [onEdit, onDelete, onToggleBookable, onCopyBookingLink]
  );

  const topContent = React.useMemo(
    () => (
      <div className="flex flex-col gap-4">
        <div className="flex justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Search by name..."
            startContent={<SearchIcon />}
            value={filterValue}
            onClear={() => { setFilterValue(""); setPage(1); }}
            onValueChange={(v) => { setFilterValue(v); setPage(1); }}
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden sm:flex">
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                  Columns
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {ROOM_FIELDS.map((col) => (
                  <DropdownItem key={col.uid} className="capitalize">
                    {col.name}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Button
              isDisabled={!(selectedKeys === "all" || selectedKeys.size)}
              color="danger"
              endContent={<WarningIcon />}
              onPress={() => {
                if (selectedKeys === "all") {
                  onDelete(data);
                } else {
                  const keys = Array.from(selectedKeys);
                  const sel = data.filter(
                    (item) => keys.includes(item._id) || keys.includes(String(item._id))
                  );
                  onDelete(sel);
                }
              }}
            >
              Delete Selected
            </Button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {data.length} rooms</span>
          <label className="flex items-center text-default-400 text-small">
            Rows per page:
            <select
              className="bg-transparent outline-none text-default-400 text-small"
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </label>
        </div>
      </div>
    ),
    [filterValue, visibleColumns, selectedKeys, data, onDelete]
  );

  const bottomContent = React.useMemo(
    () => (
      <div className="py-2 px-2 flex justify-between items-center">
        <span className="w-[30%] text-small text-default-400">
          {selectedKeys === "all"
            ? "All items selected"
            : `${selectedKeys.size} of ${filteredItems.length} selected`}
        </span>
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
        <div className="hidden sm:flex w-[30%] justify-end gap-2">
          <Button
            isDisabled={page <= 1}
            size="sm"
            variant="flat"
            onPress={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            isDisabled={page >= pages}
            size="sm"
            variant="flat"
            onPress={() => setPage((p) => Math.min(pages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    ),
    [selectedKeys, filteredItems.length, page, pages]
  );

  return (
    <>
      {confirmDialog}
      <Table
        aria-label="Room table"
        isHeaderSticky
        bottomContent={bottomContent}
        bottomContentPlacement="outside"
        classNames={{ wrapper: "max-h-[382px]" }}
        selectedKeys={selectedKeys}
        selectionMode="multiple"
        sortDescriptor={sortDescriptor}
        topContent={topContent}
        topContentPlacement="outside"
        onSelectionChange={setSelectedKeys}
        onSortChange={setSortDescriptor}
      >
        <TableHeader columns={headerColumns}>
          {(col) => (
            <TableColumn
              key={col.uid}
              align={col.uid === "actions" ? "center" : "start"}
              allowsSorting={col.sortable}
            >
              {col.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody emptyContent="No rooms found" items={sortedItems}>
          {(item) => (
            <TableRow key={item._id || item.id || 0}>
              {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
      {isOpen && (
        <RoomModal data={editData} isOpen={isOpen} onOpenChange={onOpenChange} />
      )}
    </>
  );
}

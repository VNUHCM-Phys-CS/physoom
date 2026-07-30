"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Button,
} from "@heroui/react";
import { toast } from "react-toastify";
import { Download } from "lucide-react";
import { useMemo } from "react";
import useStore from "@/store/store";

/**
 * Export button with two modes:
 *  - Search mode (`events` given): exports exactly the series currently shown
 *    (e.g. a teacher/room/class search result).
 *  - Page mode (no `events`): exports the class selected in BookingMulti (via
 *    the shared store) or all classes.
 */
export default function ExportBookingButton({ events }) {
  const course_selected = useStore((s) => s.course_selected);
  const classIds = course_selected?.class_id;
  const classLabel = Array.isArray(classIds) ? classIds.join(", ") : classIds;

  const seriesIds = useMemo(() => {
    if (!events) return null;
    return [...new Set(events.map((e) => e.series_id || e._id).filter(Boolean))];
  }, [events]);

  const run = (style, body) => downloadBookingList({ style, ...body });

  const items = [];
  if (seriesIds) {
    // Export exactly what the current search shows.
    items.push(
      <DropdownItem key="s-list" onPress={() => run(undefined, { _id: seriesIds })}>
        As List
      </DropdownItem>,
      <DropdownItem key="s-formal" onPress={() => run("formal", { _id: seriesIds })}>
        As Formal
      </DropdownItem>
    );
  } else {
    if (classLabel) {
      items.push(
        <DropdownSection key="cur" title={`Lớp hiện tại (${classLabel})`} showDivider>
          <DropdownItem key="c-list" onPress={() => run(undefined, { class_id: classIds })}>
            As List
          </DropdownItem>
          <DropdownItem key="c-formal" onPress={() => run("formal", { class_id: classIds })}>
            As Formal
          </DropdownItem>
        </DropdownSection>
      );
    }
    items.push(
      <DropdownSection key="all" title="Tất cả các lớp">
        <DropdownItem key="a-list" onPress={() => run(undefined, {})}>
          As List
        </DropdownItem>
        <DropdownItem key="a-formal" onPress={() => run("formal", {})}>
          As Formal
        </DropdownItem>
      </DropdownSection>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button color="primary" variant="ghost" endContent={<Download />}>
          Export
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Export options">{items}</DropdownMenu>
    </Dropdown>
  );
}

async function downloadBookingList({ style, _id, class_id }) {
  try {
    const response = await fetch("/api/booking/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style, _id, class_id }),
    });

    if (!response.ok) {
      throw new Error("Failed to download the booking list.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "booking_list.xlsx");
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading booking list:", error);
    toast.error("Failed to download booking list. Please try again.");
  }
}

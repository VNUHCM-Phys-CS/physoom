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
import { useCallback } from "react";
import useStore from "@/store/store";

export default function ExportBookingButton() {
  const course_selected = useStore((s) => s.course_selected);
  const classIds = course_selected?.class_id;
  const classLabel = Array.isArray(classIds) ? classIds.join(", ") : classIds;

  const doExport = useCallback((style, class_id) => {
    downloadBookingList({ style, class_id });
  }, []);

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button color="primary" variant="ghost" endContent={<Download />}>
          Export
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Export options">
        {classLabel ? (
          <DropdownSection title={`Lớp hiện tại (${classLabel})`} showDivider>
            <DropdownItem key="cur-list" onPress={() => doExport(undefined, classIds)}>
              As List
            </DropdownItem>
            <DropdownItem key="cur-formal" onPress={() => doExport("formal", classIds)}>
              As Formal
            </DropdownItem>
          </DropdownSection>
        ) : null}
        <DropdownSection title="Tất cả các lớp">
          <DropdownItem key="all-list" onPress={() => doExport(undefined, undefined)}>
            As List
          </DropdownItem>
          <DropdownItem key="all-formal" onPress={() => doExport("formal", undefined)}>
            As Formal
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

async function downloadBookingList({ style, class_id }) {
  try {
    const response = await fetch("/api/booking/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style, class_id }),
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

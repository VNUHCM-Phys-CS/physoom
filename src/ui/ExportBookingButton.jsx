"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Button,
} from "@heroui/react";
import { toast } from "react-toastify";
import { Download, MoreHorizontal } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export default function ExportBookingButton({ data }) {
  const _id = useMemo(() => data?.map((d) => d._id), [data]);
  const handleDownload = useCallback(() => {
    downloadBookingList(_id);
  });
  const handleDownloadFormal = useCallback(() => {
    downloadBookingList(_id, "formal");
  });
  return (
    <>
      <Dropdown>
        <DropdownTrigger>
          <Button color="primary" variant="ghost" endContent={<Download />}>
            Export
          </Button>
        </DropdownTrigger>
        <DropdownMenu>
          <DropdownItem onPress={handleDownload}>As List</DropdownItem>
          <DropdownItem onPress={handleDownloadFormal}>As Fromal</DropdownItem>
        </DropdownMenu>
      </Dropdown>
    </>
  );
}
async function downloadBookingList(_id, style) {
  try {
    const response = await fetch("/api/booking/export", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        _id,
        style,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to download the booking list.");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Create a temporary link to download the file
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "booking_list.xlsx"); // Set the file name
    document.body.appendChild(link);
    link.click();

    // Cleanup
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading booking list:", error);
    toast.error("Failed to download booking list. Please try again.");
  }
}

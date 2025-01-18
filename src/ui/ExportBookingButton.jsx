"use client";

import { Button } from "@heroui/react";
import { Download } from "lucide-react";

export default function ExportBookingButton() {
  return (
    <Button
      color="primary"
      variant="ghost"
      endContent={<Download />}
      onPress={downloadBookingList}
    >
      Export
    </Button>
  );
}
async function downloadBookingList() {
  try {
    const response = await fetch("/api/booking/export"); // Adjust the API route path if necessary

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

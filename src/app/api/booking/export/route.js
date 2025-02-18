"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style"; // Import xlsx-js-style
import { auth } from "@/lib/auth";
import Booking from "@/models/booking";
import { defaultGridLT, defaultGridNVC } from "@/lib/ulti";
import User from "@/models/user";

// Helper function to format date to dd/mm/yyyy
const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const day = ("0" + d.getDate()).slice(-2);
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

// Route for exporting booking list
export async function GET() {
  const token = await auth();
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      await connectToDb();
      // Fetch all bookings and populate room and course details
      const bookings = await Booking.find()
        .populate("room")
        .populate("course")
        .lean();

      // Fetch all users to create a mapping of email to name
      const users = await User.find().lean();
      const emailToNameMap = users.reduce((map, user) => {
        map[user.email] = user.name || user.email; // Use email if name is unavailable
        return map;
      }, {});

      const exportData = [
        {
          "Mã mh": "Mã mh",
          "Tên môn học": "Tên môn học",
          Lớp: "Lớp",
          "Số sv": "Số sv",
          sosvMax: "sosvMax",
          "Tên phòng": "Tên phòng",
          Thứ: "Thứ",
          "Tiết bắt đầu": "Tiết bắt đầu",
          "Số tiết": "Số tiết",
          "Giảng viên": "Giảng viên",
          "Trợ giảng": "Trợ giảng",
          "Ngày đầu tuần": "Ngày đầu tuần",
        },
      ];
      bookings.forEach((booking) => {
        const teacherNames = booking.teacher_email.map(
          (email) => emailToNameMap[email] || email // Fallback to email if name is unavailable
        );
        const gridObject =
          booking.room?.location === "NVC" ? defaultGridNVC : defaultGridLT;
        const _booking = gridObject.booking2calendar(booking);
        exportData.push({
          "Mã mh": booking.course?.course_id || "",
          "Tên môn học": booking.course?.title || "",
          Lớp: booking.course?.class_id || "",
          "mã lớp 2": booking.course?.course_id_extend || "",
          "Số sv": booking.course?.population || "",
          sosvMax: booking.room?.limit || "",
          "Tên phòng": booking.room?.title || "",
          Thứ: booking.time_slot?.weekday || "",
          "Tiết bắt đầu": _booking.time_slot?.start_time || "",
          "Số tiết": booking.course?.credit || "",
          "Giảng viên": teacherNames[0] || "",
          "Trợ giảng": teacherNames.slice(1, teacherNames.length) || "",
          "Ngày đầu tuần": formatDate(
            booking.time_slot?.start_date || booking.course?.start_date || ""
          ),
        });
      });

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Prepare header and row data with styles
      let rows = exportData.map((data) => {
        return [
          { v: data["Mã mh"], t: "s" },
          {
            v: data["Tên môn học"],
            t: "s",
            s: { alignment: { wrapText: true } },
          },
          { v: data["Lớp"], t: "s" },
          { v: data["mã lớp 2"], t: "s" },
          { v: data["Số sv"], t: "s", s: { alignment: "right" } },
          { v: data["sosvMax"], t: "s", s: { alignment: "right" } },
          { v: data["Tên phòng"], t: "s" },
          { v: data["Thứ"], t: "s", s: { alignment: "right" } },
          { v: data["Tiết bắt đầu"], t: "s", s: { alignment: "right" } },
          { v: data["Số tiết"], t: "s", s: { alignment: "right" } },
          { v: data["Giảng viên"], t: "s" },
          { v: data["Trợ giảng"], t: "s" },
          {
            v: data["Ngày đầu tuần"],
            t: "s",
            s: { alignment: "right", font: { color: { rgb: "FF0000" } } },
          },
        ];
      });

      // Create worksheet with rows
      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Apply styles to the header row (bold, yellow background)
      const headerStyle = {
        font: { bold: true },
        fill: { fgColor: { rgb: "FFC000" } }, // Orange background
        border: {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        },
        alignment: { horizontal: "center", vertical: "center" },
      };

      // Apply styles to the header (first row, index 0)
      for (let col = 0; col < rows[0].length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        const cell = ws[cellAddress];
        if (cell) {
          cell.s = headerStyle; // Apply header style to each header cell
        }
      }

      // Apply borders to all cells (including headers)
      const range = XLSX.utils.decode_range(ws["!ref"]);
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = ws[cellAddress];
          if (cell) {
            cell.s = cell.s || {}; // Ensure the cell has a style object
            cell.s.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
        }
      }

      // Adjust column width based on content
      const columnWidths = [];
      for (let col = 0; col < rows[0].length; col++) {
        let maxLength = 0;
        // Check the maximum length of the column data
        exportData.forEach((data) => {
          const value = String(data[Object.keys(data)[col]] || "");
          maxLength = Math.max(maxLength, value.length);
        });
        // Set column width, ensure it does not exceed 30
        columnWidths[col] = Math.min(maxLength + 2, 30); // +2 for padding
      }

      // Apply column widths
      ws["!cols"] = columnWidths.map((width) => ({ wch: width }));

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Bookings");

      // Write Excel file to browser
      const workbookBuffer = XLSX.write(wb, {
        bookType: "xlsx",
        type: "buffer",
      });

      return new NextResponse(workbookBuffer, {
        headers: {
          "Content-Disposition": "attachment; filename=booking_list.xlsx",
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
  } catch (error) {
    console.error("Error exporting booking list:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

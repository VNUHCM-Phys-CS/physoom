"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx-js-style"; // Import xlsx-js-style
import { auth } from "@/lib/auth";
import Booking from "@/models/booking";
import { defaultGridLT, defaultGridNVC, extractBaseClass } from "@/lib/ulti";
import ExcelJS from "exceljs";
import User from "@/models/user";
import { cloneDeep, groupBy, isArray } from "lodash";
import path from "path";
import { readFileSync } from "fs";
import XlsxPopulate from "xlsx-populate";

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
export async function POST(request) {
  const token = await auth();
  const user = token?.user;
  try {
    if (user && user.isAdmin) {
      await connectToDb();
      let { _id, style } = await request.json();
      console.log(_id);
      let query = {};
      if (_id && isArray(_id)) query = { _id: { $in: _id } };
      // Fetch all bookings and populate room and course details
      const bookings = await Booking.find(query)
        .populate("room")
        .populate("course")
        .lean();

      // Fetch all users to create a mapping of email to name
      const users = await User.find().lean();
      const emailToNameMap = users.reduce((map, user) => {
        map[user.email] = user.name || user.email; // Use email if name is unavailable
        return map;
      }, {});
      switch (style) {
        case "formal":
          return new NextResponse(
            await downloadAsFormal(bookings, emailToNameMap),
            {
              headers: {
                "Content-Disposition":
                  "attachment; filename=booking_formal.xlsx",
                "Content-Type":
                  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
              },
            }
          );
        default:
          return new NextResponse(downloadAsList(bookings, emailToNameMap), {
            headers: {
              "Content-Disposition": "attachment; filename=booking_list.xlsx",
              "Content-Type":
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          });
      }
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
export async function downloadAsFormal(bookings, emailToNameMap) {
  // Load the formatted template file
  const templatePath = path.join(
    process.cwd(),
    "public",
    "/formal-template.xlsx"
  );

  // Create a new workbook and load the template
  const workbook = await XlsxPopulate.fromFileAsync(templatePath);
  const sheet = workbook.sheet(0); // Get the first sheet

  let rowIndex = 12; // Start inserting from row 12

  // Get reference row (row 11) for styling
  const referenceRow = sheet.row(12);
  const refstyle = [];
  for (let i = 1; i <= 16; i++) {
    const refCell = referenceRow.cell(i);

    refstyle.push(
      cloneDeep({
        wrapText: refCell.style("wrapText"),
        fontColor: refCell.style("fontColor"),
        bold: refCell.style("bold"),
        italic: refCell.style("italic"),
        underline: refCell.style("underline"),
        fontSize: refCell.style("fontSize"),
        fontFamily: refCell.style("fontFamily"),
        horizontalAlignment: refCell.style("horizontalAlignment"),
        verticalAlignment: refCell.style("verticalAlignment"),
        fill: refCell.style("fill"),
        border: refCell.style("border"),
      })
    );
  }

  const groupClass = Object.values(
    groupBy(bookings, (d) =>
      d.course.class_id.map((s) => extractBaseClass(s)).join(", ")
    )
  );
  console.log(groupClass);
  // Process bookings, grouped by course
  groupClass.forEach((classBookings, classIndex) => {
    const isLast = classIndex < groupClass.length - 1;
    if (classBookings.length) {
      copyRangeWithStyle(
        sheet,
        [rowIndex + 1, 1, rowIndex + 9, 15],
        rowIndex + 1 + classBookings.length + +isLast,
        1
      );
    }
    Object.values(groupBy(classBookings, "course.course_id")).forEach(
      (courseBookings, cindex) => {
        courseBookings.forEach((item, i) => {
          const location = item.room.location;
          const grid = location === "NVC" ? defaultGridNVC : defaultGridLT;
          const _booking = grid.booking2calendar(item);
          const teacherNames = item.teacher_email.map(
            (email) => emailToNameMap[email] || email // Fallback to email if name is unavailable
          );

          const rowData = [
            "", // Empty first column
            cindex + 1,
            item.course.course_id,
            item.course.title,
            item.course.credit,
            item.course.population,
            `Thứ ${item.time_slot.weekday} (tiết ${
              _booking.time_slot.start_time + 1
            } - ${_booking.time_slot.end_time})`,
            item.room.title,
            teacherNames.join(", "),
            location,
            item.course.class_id.join(", "),
            formatDate(
              item.time_slot?.start_date || item.course?.start_date || ""
            ),
            item.course.duration,
            "",
            item.teacher_email?.[0],
          ];
          // Insert row while preserving styling
          rowData.forEach((value, colIndex) => {
            const cell = sheet.row(rowIndex).cell(colIndex + 1);

            cell.value(value);

            // **Manually Copy Styles** (Fix for `cell.style(refCell.style())` error)
            cell.style({ ...refstyle[colIndex] });
          });

          rowIndex++;
        });
      }
    );
    if (isLast) {
      for (let i = 2; i <= 15; i++) {
        sheet.row(rowIndex).cell(i).style({ fill: "CCC0D9" });
      }
      rowIndex++;
    }
  });

  // Generate Excel buffer for download
  return await workbook.outputAsync();
}
function downloadAsList(bookings, emailToNameMap) {
  const exportData = [
    {
      "Mã mh": "Mã mh",
      "Tên môn học": "Tên môn học",
      Lớp: "Lớp",
      "mã lớp 2": "mã lớp 2",
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
  return workbookBuffer;
}

function copyRangeWithStyle(
  sheet,
  sourceRange,
  targetStartRow,
  targetStartCol
) {
  const [startRow, startCol, endRow, endCol] = sourceRange;
  const rowOffset = targetStartRow - startRow;
  const colOffset = targetStartCol - startCol;

  // Get source range as an object
  const source = sheet.range(startRow, startCol, endRow, endCol);

  // Copy values & styles
  const values = source.value();
  const styleProps = [
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "fontSize",
    "fontFamily",
    "fontColor",
    "horizontalAlignment",
    "verticalAlignment",
    "wrapText",
    "fill",
    "border",
    "numberFormat",
  ];
  const styles = source.style(styleProps);
  // Copy merge information
  const copiedMerges = [
    [startRow + 2, 5, startRow + 2, 7],
    [startRow + 3, 5, startRow + 3, 7],
    [startRow + 8, 5, startRow + 8, 7],
  ];
  // **Clear original range**
  source.clear(); // Clear values
  source.forEach((cell) => {
    cell.style({
      bold: false,
      italic: false,
      underline: false,
      fontColor: "000000", // Reset to black
      fontSize: 11, // Default size
      fontFamily: "Calibri", // Default font
      horizontalAlignment: "general",
      verticalAlignment: "bottom",
      fill: "ffffff", // Reset fill to white
      border: {},
    });
  });
  copiedMerges.forEach(([mStartRow, mStartCol, mEndRow, mEndCol]) => {
    sheet.range(mStartRow, mStartCol, mEndRow, mEndCol).merged(false);
  });
  // **Paste everything into new location**
  const target = sheet.range(
    targetStartRow,
    targetStartCol,
    targetStartRow + (endRow - startRow),
    targetStartCol + (endCol - startCol)
  );

  target.value(values);
  target.style(styles);

  // Restore merged regions
  copiedMerges.forEach(([mStartRow, mStartCol, mEndRow, mEndCol]) => {
    sheet
      .range(
        mStartRow + rowOffset,
        mStartCol + colOffset,
        mEndRow + rowOffset,
        mEndCol + colOffset
      )
      .merged(true);
  });
}

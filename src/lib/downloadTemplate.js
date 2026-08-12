"use client";
import * as XLSX from "xlsx";

// Build and download an .xlsx import template. `headers` MUST list every column
// the importer expects (its DragDropzone requires all column names present), and
// `exampleRows` are sample rows aligned to those headers.
export function downloadTemplate(filename, headers, exampleRows = []) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Mau");
  XLSX.writeFile(wb, filename);
}

"use client";
import React, { useState } from "react";
import { Card, CardBody, CardFooter, Button, Spacer } from "@heroui/react";
import Papa from "papaparse";
import TableEvent from "../TableEvent";
import { read, readFile, utils } from "xlsx";
import { useI18n } from "@/i18n/I18nProvider";

const validMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

const DragDropzone = ({ collums, INITIAL_VISIBLE_COLUMNS, onImport }) => {
  const { t } = useI18n();
  const [csvData, setCsvData] = useState([]);

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files[0] || event.target?.files?.[0];
    if (!file) return;

    const isCsv = file.type.includes("csv") || file.name.toLowerCase().endsWith(".csv");
    const isExcel = validMimeTypes.includes(file.type) || file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");

    if (isCsv) {
      Papa.parse(file, {
        complete: (result) => {
          const data = [];
          result.data.forEach((d) => {
            const item = {};
            let isEmpty = true;
            collums.forEach((c) => {
              if (d[c.uid]) {
                item[c.uid] = c.format ? c.format(d[c.uid]) : d[c.uid];
                isEmpty = false;
              }
            });
            if (!isEmpty) data.push(item);
          });
          setCsvData(data);
        },
        header: true,
        skipEmptyLines: true,
      });
      return;
    }

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const workbook = read(e.target.result, { type: "array" });
        // Pick the sheet whose header row matches the MOST expected columns and
        // map whatever columns are present. A partial file (only some columns) is
        // fine — the importer validates required fields. Previously this required
        // EVERY column, so a file missing any column was silently ignored.
        let best = { matches: 0, header: null, rows: null };
        for (const sheet of workbook.SheetNames) {
          const sheetData = utils
            .sheet_to_json(workbook.Sheets[sheet], { header: 1 })
            .filter((row) => row.some((cell) => cell !== null && cell !== undefined && cell !== ""));
          if (!sheetData.length) continue;
          const headerRow = (sheetData[0] || []).map((d) => (d?.trim ? d.trim() : String(d)));
          const matches = collums.filter((col) => headerRow.includes(col.name)).length;
          if (matches > best.matches) best = { matches, header: headerRow, rows: sheetData };
        }
        if (best.matches === 0) {
          alert("Không nhận được cột nào khớp. File cần có dòng tiêu đề, ví dụ các cột: " + collums.map((c) => c.name).join(", "));
          return;
        }
        const data = [];
        for (let i = 1; i < best.rows.length; i++)
          data.push(
            best.rows[i].reduce((acc, value, index) => {
              if (best.header[index]) acc[best.header[index]] = value;
              return acc;
            }, {})
          );
        setCsvData(data);
      };
      reader.onerror = function () {
        console.log(reader.error);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Định dạng không hỗ trợ. Vui lòng tải lên .csv hoặc .xlsx");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <Card className="min-w-[600px] m-auto">
      <CardBody className="p-0 border-2 border-dashed border-gray-300 bg-sky-50 dark:bg-zinc-900 rounded-xl overflow-hidden min-h-[300px]">
        <div
          className="w-full h-full min-h-[300px] flex items-center justify-center flex-col cursor-pointer hover:bg-sky-100/50 transition-colors"
          onDrop={handleFileDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragOver}
          onDragLeave={handleDragOver}
          onClick={() => document.getElementById("hiddenFileInput").click()}
        >
          <h4 className="p-4 text-center font-semibold text-lg">{t("dz.title")}</h4>
          <p className="text-sm text-gray-500 pb-4">{t("dz.browse")}</p>
          <input
            type="file"
            id="hiddenFileInput"
            className="hidden"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileDrop}
          />
        </div>
        {csvData.length > 0 && (
          <div className="p-4 border-t w-full bg-white dark:bg-zinc-950">
            <TableEvent
              columns={collums}
              data={csvData}
              INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
            />
          </div>
        )}
      </CardBody>
      {csvData.length > 0 && (
        <CardFooter className="justify-center border-t bg-gray-50/50 dark:bg-zinc-900/50">
          <Button color="primary" onClick={() => onImport(csvData)}>
            {t("import.importData")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DragDropzone;

import React, { useState } from "react";
import { Card, CardBody, CardFooter, Button, Spacer } from "@nextui-org/react";
import Papa from "papaparse";
import TableEvent from "../TableEvent";
import { read, readFile, utils } from "xlsx";

const validMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
];

const DragDropzone = ({ collums, INITIAL_VISIBLE_COLUMNS, onImport }) => {
  const [csvData, setCsvData] = useState([]);

  const handleFileDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type === "text/csv") {
      Papa.parse(file, {
        complete: (result) => {
          // emap and check empty
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
      });
    }
    if (validMimeTypes.includes(file.type)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const binaryStr = e.target.result;
        const workbook = read(binaryStr, { type: "array" });
        const data = [];
        workbook.SheetNames.find((sheet) => {
          const worksheet = workbook.Sheets[sheet];
          const sheetData = utils
            .sheet_to_json(worksheet, {
              header: 1,
            })
            .filter(
              (row) =>
                row.some(
                  (cell) => cell !== null && cell !== undefined && cell !== ""
                ) // Keep rows with at least one non-empty value
            );
          const headerRow = (sheetData[0] || []).map((d) => d.trim());
          if (collums.every((col) => headerRow.includes(col.name))) {
            for (let i = 1; i < sheetData.length; i++)
              data.push(
                sheetData[i].reduce((acc, value, index) => {
                  if (headerRow[index]) acc[headerRow[index]] = value; // Map headers to row values
                  return acc;
                }, {})
              );
            return true;
          }
        });
        setCsvData(data);
      };
      reader.onerror = function () {
        console.log(reader.error);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("wrong format");
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  return (
    <Card className="min-w-[600px] m-auto">
      <CardBody
        className="flex items-center justify-center min-h-[200px] border-2 border-dashed border-gray-300 bg-sky-100"
        onDrop={handleFileDrop}
        onDragOver={handleDragOver}
      >
        <h4 className="p-4">Drag & Drop your Excel/CSV file here</h4>
        {csvData.length > 0 && (
          <TableEvent
            columns={collums}
            data={csvData}
            INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
          />
        )}
      </CardBody>
      {csvData.length > 0 && (
        <CardFooter className="justify-center">
          <Button color="primary" onClick={() => onImport(csvData)}>
            Import
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default DragDropzone;

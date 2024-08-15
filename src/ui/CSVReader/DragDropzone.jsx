import React, { useState } from "react";
import { Card, CardBody, CardFooter, Button, Spacer } from "@nextui-org/react";
import Papa from "papaparse";
import TableEvent from "../TableEvent";

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
        <h4 className="p-4">Drag & Drop your CSV file here</h4>
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

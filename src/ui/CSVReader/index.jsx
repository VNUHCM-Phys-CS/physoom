"use client";

import { Card, Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import DragDropzone from "./DragDropzone";
const CSVReader = ({ path, email, collums, INITIAL_VISIBLE_COLUMNS }) => {
  const router = useRouter();
  const onSubmit = async (data) => {
    try {
      // formatdata
      const res = await fetch(path, {
        method: "POST",
        headers: {
          email,
          // Accept: contentType,
          // "Content-Type": contentType,
        },
        body: JSON.stringify(data),
      });
      if (res.status !== 201) {
        console.log("Something wrong");
      } else router.back();
    } catch (error) {
      console.log(error);
      console.log("Something wrong");
    }
  };
  return (
    <>
      <Button className="mt-3" onClick={() => router.back()}>
        Back
      </Button>
      <h2 className={"text-center mt-10"}>Import CSV file</h2>
      <DragDropzone
        collums={collums}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
        onImport={onSubmit}
      />
      {/* <Card
        isBlurred
        className="border-none bg-background/60 dark:bg-default-100/50 max-w-[610px]"
        shadow="sm"
      >
        <Button
          color="primary"
          onClick={() => {
            // router.back();
          }}
        >
          SUbmit
        </Button>
      </Card> */}
    </>
  );
};

export default CSVReader;

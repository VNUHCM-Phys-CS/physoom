import BookingMulti from "@/ui/BookingMulti";
import ExportBookingButton from "@/ui/ExportBookingButton";
import { PlusIcon } from "@/ui/icons/PlusIcon";
import { Button } from "@heroui/react";
import Link from "next/link";

export default async function Page() {
  return (
    <div>
      <div className="flex justify-between items-center w-full">
        <h1>Booking</h1>
        <div className="flex gap-2">
          <ExportBookingButton />
          <Link href={"/admin/booking/importfile"}>
            <Button color="primary" endContent={<PlusIcon />}>
              Import from file
            </Button>
          </Link>
        </div>
      </div>
      <BookingMulti />
    </div>
  );
}

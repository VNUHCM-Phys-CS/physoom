import BookingMulti from "@/ui/BookingMulti";
import { PlusIcon } from "@/ui/icons/PlusIcon";
import RoomTable from "@/ui/RoomTable";
import { Button } from "@heroui/react";
import Link from "next/link";

export default async function Page() {
  return (
    <div>
      <div className="flex justify-between items-center w-full">
        <h1>Booking</h1>
        <Link href={"/admin/booking/importfile"}>
          <Button color="primary" endContent={<PlusIcon />}>
            Import from file
          </Button>
        </Link>
      </div>
      <BookingMulti />
    </div>
  );
}

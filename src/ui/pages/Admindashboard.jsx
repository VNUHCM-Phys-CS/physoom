"use client";
import Card from "@/ui/Card";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";

export default function Admindashboard() {
    const { data:room } = useSWR("/api/room/getCount", fetcher, {
        next: { tags: ["admin-room"], revalidate: 60 },
      });
      const { data:course } = useSWR("/api/room/getCount", fetcher, {
        next: { tags: ["admin-room"], revalidate: 60 },
      });
  return (
    <div className="flex gap-4 items-stretch">
        <div className="basis-1/3 text-center">
          <Card className="h-full">
            <h5>#Room</h5>
            <h4>{room}</h4>
          </Card>
        </div>
        <div className="basis-1/3 text-center">
          <Card className="h-full">
            <h5>#Course</h5>
            <h4>{course}</h4>
            </Card>
        </div>
        <div className="basis-1/3 text-center">
          <Card className="h-full">#Booking</Card>
        </div>
      </div>
  );
}

"use client";
import Card from "@/ui/Card";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import PieChart from "../viz/PieChart";

export default function Admindashboard() {
  const { data: room } = useSWR("/api/room/viz", fetcher, {
    next: { tags: ["admin-room"], revalidate: 60 },
  });
  const { data: course } = useSWR("/api/room/getCount", fetcher, {
    next: { tags: ["admin-room"], revalidate: 60 },
  });
  const { data: booking } = useSWR("/api/booking/getCount", fetcher, {
    next: { tags: ["admin-room"], revalidate: 60 },
  });
  return (
    <div className="flex gap-4 items-stretch">
      <div className="basis-1/3 text-center">
        <Card className="h-full prose">
          <h4>#Room</h4>
          <h2>{room?.count}</h2>
          <div className="max-w-10">
            <PieChart values={room?.values} labels={room?.labels} />
          </div>
        </Card>
      </div>
      <div className="basis-1/3 text-center">
        <Card className="h-full prose">
          <h4>#Course</h4>
          <h2>{course}</h2>
          <div className="max-w-10">
            <PieChart values={room?.values} labels={room?.labels} />
          </div>
        </Card>
      </div>
      <div className="basis-1/3 text-center">
        <Card className="h-full prose">
          <h4>#Booking</h4>
          <h2>{booking}</h2>
        </Card>
      </div>
    </div>
  );
}

"use client";
import Card from "@/ui/Card";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import dynamic from 'next/dynamic';
import SquareHolder from "../SquareHolder";

const PieChart = dynamic(() => import('@/ui/viz/PieChart'), {
  ssr: false,
});

export default function Admindashboard() {
  const { data: room } = useSWR("/api/room/viz", fetcher, {
    next: { tags: ["viz-room"], revalidate: 60 },
  });
  const { data: course } = useSWR("/api/course/viz", fetcher, {
    next: { tags: ["viz-course"], revalidate: 60 },
  });
  const { data: booking } = useSWR("/api/booking/viz", fetcher, {
    next: { tags: ["admin-booking"], revalidate: 60 },
  });
  return (
    <div className="flex gap-4 items-stretch">
      <div className="basis-1/3 text-center">
        <Card className="h-full w-full prose">
          <h4>#Room</h4>
          <h2>{room?.count}</h2>
          <div className={' px-10 m-auto'}>
            <SquareHolder>
                <PieChart values={room?.values} labels={room?.labels} />
            </SquareHolder>
          </div>
        </Card>
      </div>
      <div className="basis-1/3 text-center">
        <Card className="h-full w-full prose">
          <h4>#Course</h4>
          <h2>{course?.count}</h2>
          <div className={'px-10 m-auto'}>
            <SquareHolder>
                <PieChart values={course?.values} labels={course?.labels} />
            </SquareHolder>
          </div>
        </Card>
      </div>
      <div className="basis-1/3 text-center">
        <Card className="h-full prose">
          <h4>#Booking</h4>
          <h2>{booking?.count}</h2>
          <div className={'px-10 m-auto'}>
            <SquareHolder>
                <PieChart values={booking?.values} labels={booking?.labels} isDonut={true} />
            </SquareHolder>
          </div>
        </Card>
      </div>
    </div>
  );
}

"use client";
import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session } = useSession();
  return (
    <main className="flex flex-col items-center justify-between p-24">
      <h1>Welcome {session?.user?.name}!</h1>
      <h2>
        Start to book your course with <b>Booking</b> Tab
      </h2>
    </main>
  );
}

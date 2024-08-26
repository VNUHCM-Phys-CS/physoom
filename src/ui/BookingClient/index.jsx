"use client";
import { useSession } from "next-auth/react";
import BookingSingle from "../BookingSingle";
import UserCalendarProvider from "../CalendarByUser/wrapper";
export default function BookingClient() {
  const { data: session } = useSession();
  return <UserCalendarProvider email={session?.user?.email}>
      <BookingSingle email={session?.user?.email} />
  </UserCalendarProvider>;
}

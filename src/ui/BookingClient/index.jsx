"use client";
import { useSession } from "next-auth/react";
import BookingSingle from "../BookingSingle";
export default function BookingClient() {
  const { data: session } = useSession();
  return <BookingSingle email={session?.user?.email} />;
}

"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function RoomManagerLayout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      router.push("/");
      return;
    }

    // Admins always have access
    if (session.user.isAdmin) {
      setChecking(false);
      return;
    }

    // Check if user manages any rooms
    fetch("/api/room/managed")
      .then((res) => res.json())
      .then((rooms) => {
        if (!Array.isArray(rooms) || rooms.length === 0) {
          router.push("/");
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        router.push("/");
      });
  }, [session, status, router]);

  if (status === "loading" || checking) {
    return <p className="p-4">Checking access...</p>;
  }

  return (
    <div className="md:container md:mx-auto flex-col">
      <div className="flex-row justify-between shadow-xl bg-foreground-100 rounded-md py-2 px-4 mx-auto">
        <span className="font-semibold text-lg">Room Manager</span>
      </div>
      <div className="p-2 mt-5">{children}</div>
    </div>
  );
}

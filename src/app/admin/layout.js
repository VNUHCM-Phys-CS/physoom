"use client";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const NAV_ITEMS = [
  { title: "Dashboard", path: "/admin" },
  { title: "Course", path: "/admin/course" },
  { title: "Room", path: "/admin/room" },
  { title: "Course Booking", path: "/admin/booking" },
  { title: "Room Booking", path: "/admin/room-booking" },
  { title: "Terms & Holidays", path: "/admin/terms" },
  { title: "Users", path: "/admin/user" },
  { title: "View Share", path: "/admin/view-share" },
];

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "loading") {
      if (!session || !session.isAdmin) {
        router.push("/");
      }
    }
  }, [router, session, status]);

  if (!session)
    return <p>You need to be signed in to view this page. Redirecting...</p>;

  return (
    <div className="md:container md:mx-auto">
      <Navbar
        position="static"
        maxWidth="full"
        classNames={{
          base: "bg-foreground-100 rounded-xl shadow-md px-2",
          wrapper: "px-2 gap-1 overflow-x-auto",
        }}
      >
        <NavbarBrand className="shrink-0 mr-3">
          <span className="font-bold text-secondary text-sm tracking-wide">Admin</span>
        </NavbarBrand>
        <NavbarContent className="gap-1 flex-nowrap" justify="start">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(item.path + "/");
            return (
              <NavbarItem key={item.path} isActive={isActive}>
                <Link
                  href={item.path}
                  className={`text-sm px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-secondary text-white font-semibold"
                      : "text-default-600 hover:text-default-900 hover:bg-default-200"
                  }`}
                >
                  {item.title}
                </Link>
              </NavbarItem>
            );
          })}
        </NavbarContent>
      </Navbar>
      <div className="p-2 mt-4">{children}</div>
    </div>
  );
}

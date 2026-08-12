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
import { useI18n } from "@/i18n/I18nProvider";

const NAV_ITEMS = [
  { key: "admin.nav.dashboard", path: "/admin" },
  { key: "admin.nav.course", path: "/admin/course" },
  { key: "admin.nav.room", path: "/admin/room" },
  { key: "admin.nav.courseBooking", path: "/admin/booking" },
  { key: "admin.nav.roomBooking", path: "/admin/room-booking" },
  { key: "admin.nav.meeting", path: "/admin/meeting" },
  { key: "admin.nav.classGroups", path: "/admin/class" },
  { key: "admin.nav.terms", path: "/admin/terms" },
  { key: "admin.nav.users", path: "/admin/user" },
  { key: "admin.nav.viewShare", path: "/admin/view-share" },
];

export default function Layout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { t } = useI18n();

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
                  {t(item.key)}
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

"use client";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

// Grouped admin navigation. A standalone "Tổng quan" plus three dropdown groups
// keep the bar compact instead of ~10 flat items.
const NAV = [
  { type: "link", key: "admin.nav.dashboard", path: "/admin" },
  {
    type: "group",
    label: "admin.grp.booking",
    items: [
      { key: "admin.nav.courseBooking", path: "/admin/booking" },
      { key: "admin.nav.roomBooking", path: "/admin/room-booking" },
      { key: "admin.nav.meeting", path: "/admin/meeting" },
    ],
  },
  {
    type: "group",
    label: "admin.grp.catalog",
    items: [
      { key: "admin.nav.course", path: "/admin/course" },
      { key: "admin.nav.room", path: "/admin/room" },
      { key: "admin.nav.classGroups", path: "/admin/class" },
      { key: "admin.nav.users", path: "/admin/user" },
    ],
  },
  {
    type: "group",
    label: "admin.grp.system",
    items: [
      { key: "admin.nav.terms", path: "/admin/terms" },
      { key: "admin.nav.viewShare", path: "/admin/view-share" },
    ],
  },
];

// The dashboard ("/admin") must match EXACTLY — otherwise startsWith("/admin/")
// would light it up on every admin sub-page.
const isPathActive = (pathname, path) =>
  path === "/admin"
    ? pathname === "/admin"
    : pathname === path || pathname.startsWith(path + "/");

const pill = (active) =>
  `text-sm px-3 py-1.5 rounded-full transition-colors whitespace-nowrap ${
    active
      ? "bg-secondary text-white font-semibold"
      : "text-default-600 hover:text-default-900 hover:bg-default-200"
  }`;

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
          {NAV.map((node) => {
            if (node.type === "link") {
              const active = isPathActive(pathname, node.path);
              return (
                <NavbarItem key={node.path} isActive={active}>
                  <Link href={node.path} className={pill(active)}>{t(node.key)}</Link>
                </NavbarItem>
              );
            }
            const active = node.items.some((it) => isPathActive(pathname, it.path));
            return (
              <Dropdown key={node.label}>
                <NavbarItem isActive={active}>
                  <DropdownTrigger>
                    <button className={`${pill(active)} inline-flex items-center gap-1`}>
                      {t(node.label)}
                      <ChevronDownIcon size={14} />
                    </button>
                  </DropdownTrigger>
                </NavbarItem>
                <DropdownMenu aria-label={t(node.label)}>
                  {node.items.map((it) => (
                    <DropdownItem
                      key={it.path}
                      onPress={() => router.push(it.path)}
                      className={isPathActive(pathname, it.path) ? "text-secondary font-semibold" : ""}
                    >
                      {t(it.key)}
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown>
            );
          })}
        </NavbarContent>
      </Navbar>
      <div className="p-2 mt-4">{children}</div>
    </div>
  );
}

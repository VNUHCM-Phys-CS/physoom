"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
} from "@heroui/react";
import {
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from "@heroui/react";
import {
  CalendarDaysIcon, LogInIcon, LogOutIcon, HelpCircleIcon, ExternalLinkIcon,
  LayoutGridIcon, CalendarClockIcon, GraduationCapIcon, ClipboardCheckIcon, ChevronDownIcon,
} from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import LanguageToggle from "../LanguageToggle";
import NotificationBell from "../NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";

// "Tiện ích" = các ứng dụng anh em của Khoa (sản phẩm RIÊNG). Nav chỉ LIÊN KẾT
// sang chúng (mở tab mới), không nhúng — mỗi app một codebase/DB riêng.
const clean = (u) => u.replace(/\/$/, "");
const OFFISOOM_URL = clean(process.env.NEXT_PUBLIC_OFFISOOM_URL || "https://offisoom.vercel.app");
const PHYSPROFILE_URL = clean(process.env.NEXT_PUBLIC_PHYSPROFILE_URL || "https://phys-profile.vercel.app");
const ACADSOOM_URL = clean(process.env.NEXT_PUBLIC_ACADSOOM_URL || "https://acadsoom.vercel.app");

const Links = ({ session }) => {
  const pathName = usePathname();
  const { t } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const user = session?.user;

  // Build the visible link set from the session, in display order.
  const navItems = [
    { title: t("nav.home"), path: "/" },
    user && { title: t("nav.booking"), path: "/booking" },
    { title: t("nav.roomSchedule"), path: "/view/room" },
    user?.isAdmin && { title: t("nav.adminDashboard"), path: "/admin" },
    { title: t("nav.about"), path: "/about" },
  ].filter(Boolean);

  // Ứng dụng anh em (mở tab mới). Chỉ hiện khi đã đăng nhập — đều cần tài khoản.
  const apps = [
    { title: t("booking.dutyRoster"), sub: "Offisoom", href: `${OFFISOOM_URL}/roster/duty`, Icon: CalendarClockIcon },
    { title: t("nav.appProfile"), sub: "phys-profile", href: PHYSPROFILE_URL, Icon: GraduationCapIcon },
    { title: t("nav.appTasks"), sub: "ACADsoom", href: ACADSOOM_URL, Icon: ClipboardCheckIcon },
  ];
  const showApps = !!user;

  const isActive = (path) =>
    path === "/" ? pathName === "/" : pathName.startsWith(path);

  return (
    <Navbar
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
      maxWidth="xl"
      isBordered
      classNames={{
        base: "bg-background/70 backdrop-blur-md",
        wrapper: "px-4 sm:px-6",
        item: [
          "flex relative h-full items-center",
          "data-[active=true]:text-secondary",
        ],
      }}
    >
      {/* Brand */}
      <NavbarContent justify="start">
        <NavbarMenuToggle
          className="lg:hidden"
          aria-label={isMenuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
        />
        <NavbarBrand>
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white">
              <CalendarDaysIcon size={18} />
            </span>
            <span className="font-bold text-inherit tracking-tight">Physoom</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      {/* Desktop links — chỉ hiện từ lg trở lên; dưới đó dùng menu hamburger để
          tránh tràn thanh nav (nhiều mục: các trang + Tiện ích + nhóm hành động). */}
      <NavbarContent className="hidden lg:flex gap-1" justify="center" data-tour="nav">
        {navItems.map((item) => {
          const active = !item.external && isActive(item.path);
          const cls = `px-3 py-2 rounded-full text-sm font-medium transition-colors ${
            active
              ? "bg-secondary/10 text-secondary"
              : "text-default-600 hover:bg-default-100 hover:text-default-900"
          }`;
          return (
            <NavbarItem key={item.path || item.href} isActive={active}>
              {item.external ? (
                <a href={item.href} target="_blank" rel="noopener noreferrer" className={`${cls} inline-flex items-center gap-1`}>
                  {item.title}
                  <ExternalLinkIcon size={13} className="opacity-60" />
                </a>
              ) : (
                <Link href={item.path} className={cls}>
                  {item.title}
                </Link>
              )}
            </NavbarItem>
          );
        })}

        {/* Tiện ích — nhóm liên kết sang các ứng dụng anh em (mở tab mới). */}
        {showApps && (
          <NavbarItem>
            <Dropdown placement="bottom">
              <DropdownTrigger>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium text-default-600 hover:bg-default-100 hover:text-default-900 transition-colors"
                >
                  <LayoutGridIcon size={16} />
                  {t("nav.apps")}
                  <ChevronDownIcon size={14} className="opacity-60" />
                </button>
              </DropdownTrigger>
              <DropdownMenu aria-label={t("nav.apps")}>
                {apps.map((a) => (
                  <DropdownItem
                    key={a.href}
                    as="a"
                    href={a.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    startContent={<a.Icon size={17} className="text-secondary" />}
                    endContent={<ExternalLinkIcon size={13} className="opacity-50" />}
                    description={a.sub}
                  >
                    {a.title}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          </NavbarItem>
        )}
      </NavbarContent>

      {/* Actions */}
      <NavbarContent justify="end">
        {user && (
          <NavbarItem data-tour="bell">
            <NotificationBell />
          </NavbarItem>
        )}
        <NavbarItem className="hidden lg:flex">
          <Link
            href="/guide"
            data-tour="help"
            aria-label={t("nav.help")}
            title={t("nav.help")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-default-600 hover:bg-default-100 hover:text-secondary transition-colors"
          >
            <HelpCircleIcon size={20} />
          </Link>
        </NavbarItem>
        <NavbarItem data-tour="lang">
          <LanguageToggle />
        </NavbarItem>
        <NavbarItem>
          <ThemeToggle />
        </NavbarItem>
        <NavbarItem>
          {user ? (
            <Button
              color="danger"
              variant="flat"
              size="sm"
              startContent={<LogOutIcon size={16} />}
              onPress={() => signOut({ callbackUrl: "/" })}
            >
              {t("nav.logout")}
            </Button>
          ) : (
            <Button
              color="secondary"
              variant="solid"
              size="sm"
              startContent={<LogInIcon size={16} />}
              onPress={() => signIn("google")}
            >
              {t("nav.login")}
            </Button>
          )}
        </NavbarItem>
      </NavbarContent>

      {/* Mobile menu */}
      <NavbarMenu className="gap-1 pt-4">
        {navItems.map((item) => {
          const active = !item.external && isActive(item.path);
          const cls = `w-full px-3 py-3 rounded-lg text-base font-medium transition-colors ${
            active ? "bg-secondary/10 text-secondary" : "text-default-700 hover:bg-default-100"
          }`;
          return (
            <NavbarMenuItem key={item.path || item.href} isActive={active}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${cls} flex items-center gap-2`}
                >
                  {item.title}
                  <ExternalLinkIcon size={15} className="opacity-60" />
                </a>
              ) : (
                <Link href={item.path} onClick={() => setIsMenuOpen(false)} className={`${cls} block`}>
                  {item.title}
                </Link>
              )}
            </NavbarMenuItem>
          );
        })}

        {/* Tiện ích — ứng dụng anh em (mở tab mới). */}
        {showApps && (
          <>
            <NavbarMenuItem className="mt-2 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-default-400">
              {t("nav.apps")}
            </NavbarMenuItem>
            {apps.map((a) => (
              <NavbarMenuItem key={a.href}>
                <a
                  href={a.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMenuOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-3 rounded-lg text-base font-medium text-default-700 hover:bg-default-100"
                >
                  <a.Icon size={18} className="text-secondary" />
                  <span className="flex-1">{a.title}</span>
                  <span className="text-xs text-default-400">{a.sub}</span>
                  <ExternalLinkIcon size={14} className="opacity-50" />
                </a>
              </NavbarMenuItem>
            ))}
          </>
        )}
        <NavbarMenuItem>
          <Link
            href="/guide"
            onClick={() => setIsMenuOpen(false)}
            className="w-full flex items-center gap-2 px-3 py-3 rounded-lg text-base font-medium text-default-700 hover:bg-default-100"
          >
            <HelpCircleIcon size={18} /> {t("nav.help")}
          </Link>
        </NavbarMenuItem>
      </NavbarMenu>
    </Navbar>
  );
};

export default Links;

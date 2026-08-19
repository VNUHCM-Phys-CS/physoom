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
import { CalendarDaysIcon, LogInIcon, LogOutIcon, HelpCircleIcon } from "lucide-react";
import ThemeToggle from "../ThemeToggle";
import LanguageToggle from "../LanguageToggle";
import NotificationBell from "../NotificationBell";
import { useI18n } from "@/i18n/I18nProvider";

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
          className="sm:hidden"
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

      {/* Desktop links */}
      <NavbarContent className="hidden sm:flex gap-1" justify="center" data-tour="nav">
        {navItems.map((item) => (
          <NavbarItem key={item.path} isActive={isActive(item.path)}>
            <Link
              href={item.path}
              className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-secondary/10 text-secondary"
                  : "text-default-600 hover:bg-default-100 hover:text-default-900"
              }`}
            >
              {item.title}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      {/* Actions */}
      <NavbarContent justify="end">
        {user && (
          <NavbarItem data-tour="bell">
            <NotificationBell />
          </NavbarItem>
        )}
        <NavbarItem className="hidden sm:flex">
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
        {navItems.map((item) => (
          <NavbarMenuItem key={item.path} isActive={isActive(item.path)}>
            <Link
              href={item.path}
              onClick={() => setIsMenuOpen(false)}
              className={`w-full block px-3 py-3 rounded-lg text-base font-medium transition-colors ${
                isActive(item.path)
                  ? "bg-secondary/10 text-secondary"
                  : "text-default-700 hover:bg-default-100"
              }`}
            >
              {item.title}
            </Link>
          </NavbarMenuItem>
        ))}
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

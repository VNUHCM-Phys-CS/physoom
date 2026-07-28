"use client";

import { useTheme } from "next-themes";
import { Button } from "@heroui/react";
import { MoonIcon, SunIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      isIconOnly
      variant="light"
      size="sm"
      radius="full"
      // Keep a theme-neutral label until mounted to avoid a hydration mismatch
      aria-label={!mounted ? "Toggle theme" : isDark ? "Switch to light mode" : "Switch to dark mode"}
      onPress={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Render a stable placeholder until mounted to avoid hydration mismatch */}
      {mounted ? (
        isDark ? <SunIcon size={18} /> : <MoonIcon size={18} />
      ) : (
        <span className="w-[18px] h-[18px]" />
      )}
    </Button>
  );
}

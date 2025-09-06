"use client";

import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function Providers({ children }) {
  return <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <HeroUIProvider>{children}</HeroUIProvider>
    </NextThemesProvider>;
}

"use client";

import { Button } from "@heroui/react";
import { useI18n } from "@/i18n/I18nProvider";

export default function LanguageToggle() {
  const { lang, setLang } = useI18n();
  const next = lang === "vi" ? "en" : "vi";
  return (
    <Button
      variant="light"
      size="sm"
      radius="full"
      className="min-w-unit-12 font-semibold"
      aria-label="Change language"
      onPress={() => setLang(next)}
    >
      {lang === "vi" ? "VI" : "EN"}
    </Button>
  );
}

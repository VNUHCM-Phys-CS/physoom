"use client";

import { SearchIcon } from "lucide-react";
import SearchCalender from "@/ui/SearchCalender";
import { useI18n } from "@/i18n/I18nProvider";

// "Find schedule" (Tìm lịch) — admin-only. The admin layout already guards
// access, so no extra auth check is needed here.
export default function AdminSearchPage() {
  const { t } = useI18n();
  return (
    <div className="max-w-6xl">
      <div className="flex items-center gap-3 mb-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary shrink-0">
          <SearchIcon size={20} />
        </span>
        <h1 className="text-2xl md:text-3xl font-bold">{t("search.title")}</h1>
      </div>
      <p className="text-default-500 text-sm mb-5 ml-[52px]">{t("search.subtitle")}</p>

      <div className="rounded-2xl border border-default-200 bg-content1 p-4 md:p-5 flex flex-col gap-3">
        <SearchCalender />
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { SearchIcon } from "lucide-react";
import SearchCalender from "@/ui/SearchCalender";
import { useI18n } from "@/i18n/I18nProvider";

// Dedicated "Find schedule" page — the teacher/room/class schedule search that
// used to live only inside a booking tab, now on its own route for easy access.
export default function SearchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { t } = useI18n();

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.push("/");
  }, [status, session, router]);

  if (status !== "loading" && !session?.user) {
    return <p className="p-6 text-default-500">{t("search.needLogin")}</p>;
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
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

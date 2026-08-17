"use client";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { Button } from "@heroui/react";
import { fetcher } from "@/lib/ulti";
import { CalendarCheckIcon, XIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const DISMISS_KEY = "physoom.gcalBannerDismissed";

// A soft, dismissible reminder to link Google Calendar. Shows only when the
// integration is configured on the server, the user hasn't connected yet, and
// they haven't dismissed it. Auto-hides once connected.
export default function GoogleCalendarBanner() {
  const { t } = useI18n();
  const { data } = useSWR("/api/google/status", fetcher, { revalidateOnFocus: false });
  // Start hidden until we've checked localStorage (avoids a flash).
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!data || !data.configured || data.connected || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-2 mb-1 flex items-center gap-2 rounded-xl border border-secondary-200 bg-secondary-50/70 px-3 py-2 dark:border-secondary-800 dark:bg-secondary-900/20">
      <CalendarCheckIcon size={18} className="shrink-0 text-secondary" />
      <span className="flex-1 text-sm text-default-700">{t("gcal.bannerText")}</span>
      <Button
        size="sm"
        color="secondary"
        variant="flat"
        onPress={() => {
          window.location.href = "/api/google/connect";
        }}
      >
        {t("gcal.connect")}
      </Button>
      <Button size="sm" variant="light" onPress={dismiss}>
        {t("gcal.later")}
      </Button>
      <button
        onClick={dismiss}
        aria-label={t("gcal.later")}
        className="text-default-400 transition-colors hover:text-default-600"
      >
        <XIcon size={16} />
      </button>
    </div>
  );
}

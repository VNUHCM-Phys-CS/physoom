"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection } from "@heroui/react";
import { fetcher } from "@/lib/ulti";
import { RefreshCwIcon, LinkIcon, Link2OffIcon, CalendarCheckIcon } from "lucide-react";
import { toast } from "react-toastify";
import { useI18n } from "@/i18n/I18nProvider";

// Link / sync / unlink the user's Google Calendar (two-way binding: Physoom
// changes push into their Google "Physoom" calendar).
export default function GoogleCalendarButton() {
  const { t } = useI18n();
  const { data, mutate } = useSWR("/api/google/status", fetcher, { revalidateOnFocus: false });
  const [busy, setBusy] = useState(false);

  const connected = !!data?.connected;
  const configured = data ? data.configured : true; // don't hide before load

  if (data && !configured) return null; // integration not set up on the server

  const connect = () => { window.location.href = "/api/google/connect"; };

  const syncNow = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/google/sync", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.success) {
        toast.success(t("gcal.synced") + ` (${(j.inserted || 0) + (j.updated || 0)})`);
      } else {
        toast.error(j.message || t("gcal.syncFailed"));
      }
    } catch {
      toast.error(t("gcal.syncFailed"));
    } finally {
      setBusy(false);
      mutate();
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await fetch("/api/google/disconnect", { method: "POST" });
      toast.success(t("gcal.disconnected"));
    } finally {
      setBusy(false);
      mutate();
    }
  };

  if (!connected) {
    return (
      <Button size="sm" variant="flat" color="secondary" startContent={<LinkIcon size={15} />} onPress={connect}>
        {t("gcal.connect")}
      </Button>
    );
  }

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button size="sm" variant="flat" color="success" isLoading={busy} startContent={<CalendarCheckIcon size={15} />}>
          {t("gcal.connected")}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Google Calendar">
        <DropdownSection title={t("gcal.title")}>
          <DropdownItem key="sync" startContent={<RefreshCwIcon size={15} />} description={t("gcal.syncDesc")} onPress={syncNow}>
            {t("gcal.syncNow")}
          </DropdownItem>
          <DropdownItem key="disconnect" className="text-danger" color="danger" startContent={<Link2OffIcon size={15} />} onPress={disconnect}>
            {t("gcal.disconnect")}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

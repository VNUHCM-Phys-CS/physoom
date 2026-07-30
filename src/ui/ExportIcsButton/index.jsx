"use client";

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Button,
} from "@heroui/react";
import { toast } from "react-toastify";
import { CalendarPlusIcon, DownloadIcon, LinkIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Export a person's approved schedule to a calendar app.
 *  - Download an .ics file (one-time import into Google/Outlook/Apple).
 *  - Copy a subscribe URL so the calendar app keeps it in sync.
 */
export default function ExportIcsButton({ email, label }) {
  const { t } = useI18n();
  if (!email) return null;

  const icsUrl = (origin) =>
    `${origin}/api/booking/export-ics?teacher_email=${encodeURIComponent(email)}`;

  const download = () => {
    const a = document.createElement("a");
    a.href = icsUrl(window.location.origin);
    a.setAttribute("download", `schedule_${email}.ics`);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const copySubscribe = async () => {
    try {
      await navigator.clipboard.writeText(icsUrl(window.location.origin));
      toast.success(t("ics.copied"));
    } catch {
      toast.error(t("ics.copyFailed"));
    }
  };

  return (
    <Dropdown>
      <DropdownTrigger>
        <Button size="sm" variant="flat" color="secondary" startContent={<CalendarPlusIcon size={16} />}>
          {label || t("ics.addToCalendar")}
        </Button>
      </DropdownTrigger>
      <DropdownMenu aria-label="Calendar export">
        <DropdownSection title={t("ics.addToCalendar")}>
          <DropdownItem
            key="download"
            startContent={<DownloadIcon size={15} />}
            description={t("ics.downloadDesc")}
            onPress={download}
          >
            {t("ics.download")}
          </DropdownItem>
          <DropdownItem
            key="subscribe"
            startContent={<LinkIcon size={15} />}
            description={t("ics.subscribeDesc")}
            onPress={copySubscribe}
          >
            {t("ics.subscribe")}
          </DropdownItem>
        </DropdownSection>
      </DropdownMenu>
    </Dropdown>
  );
}

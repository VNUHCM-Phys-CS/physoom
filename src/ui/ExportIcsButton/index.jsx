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
import { GoogleGIcon, AppleGlyphIcon, OutlookIcon } from "@/ui/icons/BrandIcons";
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

  // The ICS feed is standard iCalendar, so it works in every calendar app. These
  // helpers open each app's "subscribe by URL" flow so the calendar auto-syncs.
  const addToGoogle = () => {
    const webcal = icsUrl(window.location.origin).replace(/^https?:\/\//, "webcal://");
    const url = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  // Apple Calendar (macOS/iOS) intercepts the webcal:// scheme and offers to
  // subscribe. Navigate to it so the OS handler kicks in.
  const addToApple = () => {
    const webcal = icsUrl(window.location.origin).replace(/^https?:\/\//, "webcal://");
    window.location.href = webcal;
  };
  // Outlook subscribe-from-URL flow. Two hosts: office.com (work/school 365)
  // and live.com (personal outlook.com / hotmail).
  const openOutlook = (host) => {
    const url = `https://outlook.${host}/calendar/0/addfromweb?url=${encodeURIComponent(
      icsUrl(window.location.origin)
    )}&name=${encodeURIComponent("Physoom")}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };
  const addToOutlook = () => openOutlook("office.com");
  const addToOutlookPersonal = () => openOutlook("live.com");

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
            key="google"
            startContent={<GoogleGIcon size={16} />}
            description={t("ics.googleDesc")}
            onPress={addToGoogle}
          >
            {t("ics.google")}
          </DropdownItem>
          <DropdownItem
            key="apple"
            startContent={<AppleGlyphIcon size={16} />}
            description={t("ics.appleDesc")}
            onPress={addToApple}
          >
            {t("ics.apple")}
          </DropdownItem>
          <DropdownItem
            key="outlook"
            startContent={<OutlookIcon size={16} />}
            description={t("ics.outlookDesc")}
            onPress={addToOutlook}
          >
            {t("ics.outlook")}
          </DropdownItem>
          <DropdownItem
            key="outlook-personal"
            startContent={<OutlookIcon size={16} />}
            description={t("ics.outlookPersonalDesc")}
            onPress={addToOutlookPersonal}
          >
            {t("ics.outlookPersonal")}
          </DropdownItem>
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

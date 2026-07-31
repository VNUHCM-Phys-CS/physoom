"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import {
  Badge,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@heroui/react";
import { BellIcon, CheckCheckIcon, MonitorIcon } from "lucide-react";
import moment from "moment";
import { useI18n } from "@/i18n/I18nProvider";

const typeColor = {
  approval: "text-warning-600",
  approved: "text-success-600",
  rejected: "text-danger-600",
  info: "text-default-600",
};

export default function NotificationBell() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, mutate } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 45000,
    revalidateOnFocus: true,
  });

  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  // ── Web push (OS notifications) ────────────────────────────────────────────
  const [pushState, setPushState] = useState("loading"); // loading|unsupported|ready|on|denied
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setPushState("denied"); return; }
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushState(sub ? "on" : "ready"))
      .catch(() => setPushState("ready"));
  }, []);

  const enablePush = async () => {
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) return;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState(perm === "denied" ? "denied" : "ready"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      setPushState("on");
    } catch (e) {
      console.error("enablePush failed", e);
    }
  };

  const markAll = async () => {
    await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    mutate();
  };

  const openItem = async (n) => {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n._id }),
      });
      mutate();
    }
    if (n.link) router.push(n.link);
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button isIconOnly variant="light" size="sm" radius="full" aria-label={t("notif.title")}>
          <Badge
            content={unread > 9 ? "9+" : unread}
            color="danger"
            size="sm"
            isInvisible={!unread}
            shape="circle"
          >
            <BellIcon size={18} />
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80 max-w-[90vw]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-default-100 w-full">
          <span className="font-semibold text-sm">{t("notif.title")}</span>
          {unread > 0 && (
            <Button size="sm" variant="light" startContent={<CheckCheckIcon size={14} />} onPress={markAll}>
              {t("notif.markAll")}
            </Button>
          )}
        </div>
        {(pushState === "ready") && (
          <button
            onClick={enablePush}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-secondary hover:bg-secondary-50 border-b border-default-100"
          >
            <MonitorIcon size={14} />
            {t("notif.enablePush")}
          </button>
        )}
        {pushState === "on" && (
          <div className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-success-600 border-b border-default-100">
            <MonitorIcon size={13} /> {t("notif.pushOn")}
          </div>
        )}
        {pushState === "denied" && (
          <div className="w-full px-3 py-1.5 text-[11px] text-default-400 border-b border-default-100">
            {t("notif.pushDenied")}
          </div>
        )}
        <div className="max-h-96 overflow-y-auto w-full">
          {items.length === 0 ? (
            <p className="text-sm text-default-400 text-center py-8">{t("notif.empty")}</p>
          ) : (
            items.map((n) => (
              <button
                key={n._id}
                onClick={() => openItem(n)}
                className={`w-full text-left px-3 py-2.5 border-b border-default-50 hover:bg-default-100 transition-colors flex flex-col gap-0.5 ${
                  n.read ? "opacity-70" : "bg-secondary-50/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" />}
                  <span className={`text-sm font-medium ${typeColor[n.type] || ""}`}>{n.title}</span>
                </div>
                {n.message && <span className="text-xs text-default-500 leading-snug">{n.message}</span>}
                <span className="text-[10px] text-default-400">{moment(n.createdAt).fromNow()}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Convert a base64url VAPID public key into the Uint8Array the Push API needs.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

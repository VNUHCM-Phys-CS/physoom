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

  // Đồng bộ theo TỪNG LÔ (batch) và lặp cho tới khi xong: mỗi request chỉ xử lý
  // một số buổi giới hạn nên KHÔNG vượt thời gian cho phép của máy chủ, đồng thời
  // cập nhật một thanh tiến trình sống để người dùng thấy đang chạy tới đâu.
  const BATCH = 40;
  const syncNow = async () => {
    setBusy(true);
    const tid = toast.loading("Đang đồng bộ… 0%");
    let offset = 0;
    let inserted = 0, updated = 0, deleted = 0, failedCount = 0, total = 0, firstErr = "";
    let guard = 0; // chặn vòng lặp vô hạn nếu server không tiến triển
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await fetch("/api/google/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset, limit: BATCH }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.success) throw new Error(j.message || t("gcal.syncFailed"));

        inserted += j.inserted || 0;
        updated += j.updated || 0;
        deleted += j.deleted || 0;
        failedCount += j.failedCount || 0;
        total = j.total || total;
        if (!firstErr && j.failed?.[0]?.error) firstErr = j.failed[0].error;

        const processed = j.processed || 0;
        const pct = total ? Math.round((processed / total) * 100) : 100;
        toast.update(tid, { render: `Đang đồng bộ… ${processed}/${total} (${pct}%)`, isLoading: true });

        if (j.done) break;
        // An toàn: nếu offset không tiến, dừng để tránh lặp vô hạn.
        if (processed <= offset) { if (++guard > 2) break; }
        offset = processed;
      }

      const summary = `Đã đồng bộ: thêm ${inserted}, cập nhật ${updated}${deleted ? `, xoá ${deleted}` : ""} / tổng ${total}`;
      if (failedCount > 0) {
        toast.update(tid, {
          render: `${summary}. ${failedCount} lỗi${firstErr ? ` — ${firstErr}` : ""} — bấm Đồng bộ lại để bổ sung.`,
          type: "warning", isLoading: false, autoClose: 8000,
        });
      } else {
        toast.update(tid, { render: summary, type: "success", isLoading: false, autoClose: 5000 });
      }
    } catch (e) {
      toast.update(tid, { render: e.message || t("gcal.syncFailed"), type: "error", isLoading: false, autoClose: 5000 });
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

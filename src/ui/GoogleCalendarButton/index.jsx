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
  const BATCH = 25;
  const MAX_PASSES = 4;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Chạy MỘT lượt quét toàn bộ (theo lô) và trả về tổng kết của lượt đó.
  const runPass = async (tid, passLabel) => {
    let offset = 0, guard = 0;
    let inserted = 0, updated = 0, deleted = 0, skipped = 0, failedCount = 0, total = 0;
    let firstErr = "", unsynced = null;
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
      skipped += j.skipped || 0;
      failedCount += j.failedCount || 0;
      total = j.total || total;
      if (!firstErr && j.failed?.[0]?.error) firstErr = j.failed[0].error;
      if (offset === 0 && Array.isArray(j.unsynced)) unsynced = j.unsynced;

      const processed = j.processed || 0;
      const pct = total ? Math.round((processed / total) * 100) : 100;
      toast.update(tid, { render: `Đang đồng bộ${passLabel}… ${processed}/${total} (${pct}%)`, isLoading: true });

      if (j.done) break;
      if (processed <= offset) { if (++guard > 2) break; } // không tiến → dừng
      offset = processed;
      await sleep(400); // giãn nhịp giữa các lô
    }
    return { inserted, updated, deleted, skipped, failedCount, total, firstErr, unsynced };
  };

  const syncNow = async () => {
    setBusy(true);
    const tid = toast.loading("Đang đồng bộ… 0%");
    try {
      let last = null;
      let unsynced = [];
      // Lặp NHIỀU LƯỢT trong MỘT lần bấm: sự kiện chưa lên Google (kể cả cái lượt
      // trước bị rate-limit) luôn nằm ở nhóm "chèn mới" nên lượt sau tự bổ sung —
      // KHÔNG mất gì. Giữa hai lượt còn lỗi, chờ ~30s cho quota Google/phút hồi lại
      // rồi tự tiếp tục, tới khi hết lỗi hoặc không còn tiến triển.
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        const label = pass === 0 ? "" : ` (lượt ${pass + 1})`;
        last = await runPass(tid, label);
        if (pass === 0 && Array.isArray(last.unsynced)) unsynced = last.unsynced;
        if (last.failedCount === 0) break; // xong sạch
        // Lượt sau không chèn/cập nhật được gì thêm → đang kẹt quota, dừng để khỏi chờ vô ích.
        if (pass > 0 && last.inserted === 0 && last.updated === 0) break;
        if (pass < MAX_PASSES - 1) {
          toast.update(tid, {
            render: `Chờ hạn mức Google (~30s) rồi tự tiếp tục… còn ${last.failedCount} chưa lên`,
            isLoading: true,
          });
          await sleep(30000);
        }
      }

      const s = last || {};
      const summary = `Đã đồng bộ: thêm ${s.inserted || 0}, cập nhật ${s.updated || 0}${s.deleted ? `, xoá ${s.deleted}` : ""}${s.skipped ? `, giữ nguyên ${s.skipped}` : ""} / tổng ${s.total || 0}`;
      if (s.failedCount > 0) {
        toast.update(tid, {
          render: `${summary}. Còn ${s.failedCount} chưa lên${s.firstErr ? ` — ${s.firstErr}` : ""} — thử lại sau ít phút (quota Google).`,
          type: "warning", isLoading: false, autoClose: 9000,
        });
      } else {
        toast.update(tid, { render: summary, type: "success", isLoading: false, autoClose: 5000 });
      }

      // Báo rõ các môn ĐANG hiện trên lịch cá nhân nhưng KHÔNG lên Google được,
      // kèm lý do (chưa duyệt / đã huỷ). Nếu lớp bạn thấy thiếu KHÔNG nằm trong
      // danh sách này thì lớp đó không gắn với email của bạn (vấn đề dữ liệu).
      if (unsynced.length) {
        const lines = unsynced.map((u) => `• ${u.title} — ${u.reason}`).join("\n");
        toast.warning(`Không đồng bộ được (${unsynced.length}):\n${lines}`, {
          autoClose: 12000,
          style: { whiteSpace: "pre-line" },
        });
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

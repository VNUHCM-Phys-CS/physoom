// Lấy ca trực (duty shifts) của một người từ Offisoom.
//
// Physoom KHÔNG sở hữu dữ liệu này — chỉ proxy endpoint free/busy của Offisoom
// (cùng khoá dùng chung OFFISOOM_SYNC_SECRET). Dùng chung cho: overlay lịch cá
// nhân (/api/duties) và đồng bộ Google Calendar. Best-effort: mọi trục trặc →
// trả [] để không bao giờ làm hỏng lịch.

// Mã cơ sở → nhãn tiếng Việt (Physoom tự đặt chữ để LEAVE/TRIP không hiện thô).
const LABELS = {
  CS1: "Trực CS1",
  CS2: "Trực CS2",
  REMOTE: "Làm từ xa",
  TRIP: "Công tác",
  LEAVE: "Nghỉ phép",
};

export function dutiesConfigured() {
  return !!(process.env.OFFISOOM_BASE_URL && process.env.OFFISOOM_SYNC_SECRET);
}

/**
 * Trả về mảng ca trực đã chuẩn hoá: { start, end, location, note, title }.
 * @param {string} email
 * @param {{from?:string,to?:string}} range ISO strings; mặc định [now-14d, now+120d].
 */
export async function fetchUserDuties(email, { from, to } = {}) {
  const base = (process.env.OFFISOOM_BASE_URL || "").replace(/\/$/, "");
  const secret = process.env.OFFISOOM_SYNC_SECRET;
  if (!base || !secret || !email) return [];

  const now = Date.now();
  const f = from || new Date(now - 14 * 864e5).toISOString();
  const t = to || new Date(now + 120 * 864e5).toISOString();

  try {
    const url = `${base}/api/integration/duties?emails=${encodeURIComponent(
      email
    )}&from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`;
    const res = await fetch(url, {
      headers: { "x-offisoom-secret": secret },
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list = data?.duties?.[String(email).toLowerCase()] || [];
    return list
      .filter((d) => d?.start && d?.end)
      .map((d) => {
        const label = LABELS[d.location] || `Trực ${d.location || ""}`.trim();
        return {
          start: d.start,
          end: d.end,
          location: d.location || "",
          note: d.note || "",
          title: d.note ? `${label} · ${d.note}` : label,
        };
      });
  } catch (e) {
    console.error("fetchUserDuties failed:", e?.message);
    return [];
  }
}

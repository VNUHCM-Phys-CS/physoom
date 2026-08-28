// Kênh máy-với-máy sang web Khoa (hcmus-physic-website, backend NestJS).
//
// Hai chiều:
//  - KÉO: GET  /integration/physoom/staff  → danh sách nhân sự (email + tên) để
//    đồng bộ về Physoom (chỉ định danh, KHÔNG lấy chức vụ/role — Physoom tự giữ).
//  - ĐẨY: POST /integration/physoom/users   → thêm user Physoom vừa tạo sang bên đó.
//
// Xác thực bằng khoá dùng chung: header `x-physoom-secret` = WEBKHOA_SYNC_SECRET
// (đúng bằng PHYSOOM_SYNC_SECRET đặt bên web Khoa). Chưa cấu hình thì coi như
// "chưa bật" — caller tự quyết báo lỗi hay bỏ qua (best-effort).

const base = () => (process.env.WEBKHOA_BASE_URL || "").replace(/\/$/, "");
const secret = () => process.env.WEBKHOA_SYNC_SECRET || "";

export function webkhoaConfigured() {
  return !!(base() && secret());
}

// Kéo roster. `since` (ISO date) → chế độ delta (web Khoa trả {units, items,
// nextSince, hasMore}); không có → trả toàn bộ {units, items}. Ném lỗi nếu chưa
// cấu hình hoặc web Khoa trả != 2xx, để route đồng bộ báo rõ cho admin.
export async function fetchWebkhoaStaff(since) {
  if (!webkhoaConfigured())
    throw new Error("Chưa cấu hình WEBKHOA_BASE_URL / WEBKHOA_SYNC_SECRET");
  const qs = since ? `?since=${encodeURIComponent(since)}` : "";
  const res = await fetch(`${base()}/integration/physoom/staff${qs}`, {
    headers: { "x-physoom-secret": secret() },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`web Khoa trả ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Đẩy một user sang web Khoa. Best-effort ở phía gọi: caller nên bắt lỗi và VẪN
// tạo user ở Physoom (web Khoa lỗi tạm không được chặn admin). Trả về kết quả
// upsert của web Khoa; ném lỗi nếu chưa cấu hình / != 2xx.
export async function pushUserToWebkhoa(user) {
  if (!webkhoaConfigured())
    throw new Error("Chưa cấu hình WEBKHOA_BASE_URL / WEBKHOA_SYNC_SECRET");
  const res = await fetch(`${base()}/integration/physoom/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-physoom-secret": secret(),
    },
    cache: "no-store",
    body: JSON.stringify({
      email: user.email,
      name: user.name || undefined,
      physoomId: user.physoomId ? String(user.physoomId) : undefined,
      teacherId: user.teacher_id || undefined,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`web Khoa trả ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json().catch(() => ({}));
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncUserToGoogle } from "@/lib/googleCalendar";

// A full re-sync makes many Google API calls — allow more time than the default.
export const maxDuration = 60;

// Manual "sync now" — push the current user's schedule to their Google calendar.
// Paginated: the client sends { offset, limit } and loops until `done`, so a full
// term never exceeds the serverless time limit in one request and the UI can show
// progress. Called with no body → syncs everything in one pass (back-compat).
export const POST = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json().catch(() => ({}));
    const offset = Number.isFinite(body?.offset) ? Math.max(0, body.offset) : 0;
    const limit = Number.isFinite(body?.limit) ? Math.max(1, body.limit) : undefined;
    const result = await syncUserToGoogle(email, limit ? { offset, limit } : {});
    // `skipped` là CỜ CHUỖI ("not-connected"/"not-configured") — chỉ chuỗi mới coi
    // là bỏ qua. (Đừng dùng truthy: một trường đếm cùng tên sẽ gây 400 oan.)
    if (typeof result?.skipped === "string") {
      const message =
        result.skipped === "not-configured"
          ? "Tích hợp Google chưa được cấu hình trên máy chủ."
          : "Chưa kết nối Google (hoặc kết nối đã hết hạn). Vào lại và bấm “Kết nối Google”.";
      return NextResponse.json(
        { success: false, skipped: result.skipped, message, detail: result.detail || null },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    console.error("gcal sync failed:", e?.message);
    // Token hết hạn/bị thu hồi (Google trả invalid_grant/401) → hướng dẫn kết nối
    // lại thay vì lỗi 500 khó hiểu. Huy hiệu có thể vẫn "Đã kết nối" vì token cũ
    // còn lưu trong DB nhưng đã mất hiệu lực.
    const raw = e?.message || "";
    const badToken =
      /invalid_grant|invalid_token|unauthorized|No refresh token/i.test(raw) ||
      e?.code === 401 || e?.response?.status === 401;
    if (badToken) {
      return NextResponse.json(
        {
          success: false,
          skipped: "not-connected",
          message: "Kết nối Google đã hết hạn hoặc bị thu hồi. Bấm “Ngắt kết nối” rồi “Kết nối Google” lại.",
          detail: raw || null,
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ success: false, message: raw || "Sync failed", detail: raw || null }, { status: 500 });
  }
};

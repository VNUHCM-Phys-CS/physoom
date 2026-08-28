import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import User from "@/models/user";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/scope";
import { fetchWebkhoaStaff, webkhoaConfigured } from "@/lib/webkhoa";

// Chạy có thể lâu (kéo toàn bộ roster + bulk upsert).
export const maxDuration = 60;

// POST /api/admin/user/sync-webkhoa — KÉO danh sách nhân sự từ web Khoa về, tạo/
// cập nhật User ở Physoom.
//
// QUAN TRỌNG — chỉ đồng bộ ĐỊNH DANH: email + tên (+ MSCB). TUYỆT ĐỐI không đụng
// isAdmin / isSuperAdmin / adminScope / rank / degree / department: chức vị và
// quyền do Physoom tự giữ (yêu cầu của người dùng). Người đã nghỉ (removed) thì
// không tạo mới và cũng không xoá người cũ — chỉ bỏ qua.
export const POST = async () => {
  const session = await auth();
  if (!isSuperAdmin(session?.user))
    return NextResponse.json({ success: false, message: "Chỉ super admin" }, { status: 401 });
  if (!webkhoaConfigured())
    return NextResponse.json(
      { success: false, message: "Chưa cấu hình WEBKHOA_BASE_URL / WEBKHOA_SYNC_SECRET" },
      { status: 400 }
    );

  try {
    await connectToDb();
    const data = await fetchWebkhoaStaff(); // toàn bộ (không truyền since)
    const items = Array.isArray(data?.items) ? data.items : [];

    let skipped = 0;
    const ops = [];
    for (const it of items) {
      const email = String(it?.email || "").trim().toLowerCase();
      if (!email) { skipped++; continue; }
      // Người đã nghỉ việc ở web Khoa: không kéo vào danh sách cho phép, nhưng
      // cũng không xoá nếu Physoom đang có (tránh mất dữ liệu ngoài ý muốn).
      if (it?.removed === true || it?.active === false) { skipped++; continue; }

      const set = {};
      if (it.name) set.name = String(it.name).trim();
      if (it.teacherId) set.teacher_id = String(it.teacherId).trim();

      const update = { $setOnInsert: { email } };
      if (Object.keys(set).length) update.$set = set; // $set rỗng sẽ bị Mongo từ chối

      ops.push({ updateOne: { filter: { email }, update, upsert: true } });
    }

    let created = 0, updated = 0;
    if (ops.length) {
      const r = await User.bulkWrite(ops, { ordered: false });
      created = r.upsertedCount || 0;
      updated = r.modifiedCount || 0;
    }

    return NextResponse.json({
      success: true,
      total: items.length,
      created,
      updated,
      skipped,
    });
  } catch (e) {
    console.error("sync-webkhoa failed", e);
    return NextResponse.json({ success: false, message: e.message }, { status: 502 });
  }
};

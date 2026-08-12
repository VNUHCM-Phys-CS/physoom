"use client";

import { useMemo, useState } from "react";
import { Input, Chip, Switch } from "@heroui/react";
import { useSession } from "next-auth/react";
import { useI18n } from "@/i18n/I18nProvider";
import GuideTour from "@/ui/GuideTour";
import Card from "@/ui/Card";
import {
  BookOpenIcon, DoorOpenIcon, CalendarPlusIcon, CalendarClockIcon,
  FileSpreadsheetIcon, BellIcon, QrCodeIcon, ShieldCheckIcon, LanguagesIcon,
  LayersIcon, UsersIcon, SearchIcon, LightbulbIcon, InfoIcon, AlertTriangleIcon,
  ClipboardCheckIcon, Building2Icon, CalendarRangeIcon, BookMarkedIcon,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Inline, theme-aware illustrations (CSP-safe, no external images), each with a
// caption so every major section carries a visual "chú thích".
// ---------------------------------------------------------------------------
const Figure = ({ children, caption }) => (
  <figure className="my-3 rounded-xl border border-default-200 bg-default-50 p-3">
    <div className="overflow-x-auto">{children}</div>
    {caption && (
      <figcaption className="mt-2 text-xs text-default-500 flex items-start gap-1.5">
        <InfoIcon size={13} className="shrink-0 mt-0.5" />
        <span>{caption}</span>
      </figcaption>
    )}
  </figure>
);

const FIG = {
  nav: (
    <svg viewBox="0 0 520 60" className="w-full max-w-lg h-auto" role="img">
      <rect x="1" y="8" width="518" height="44" rx="10" className="fill-default-100 stroke-default-200" />
      <rect x="14" y="20" width="70" height="20" rx="6" className="fill-secondary/20" />
      <text x="49" y="34" textAnchor="middle" className="fill-secondary text-[11px] font-semibold">Physoom</text>
      {["Đặt lịch", "Lịch phòng", "Quản trị"].map((tx, i) => (
        <text key={tx} x={130 + i * 92} y="34" textAnchor="middle" className="fill-default-600 text-[11px]">{tx}</text>
      ))}
      <circle cx="452" cy="30" r="11" className="fill-default-200" />
      <text x="452" y="34" textAnchor="middle" className="fill-default-600 text-[11px]">?</text>
      <circle cx="484" cy="30" r="11" className="fill-default-200" />
      <text x="484" y="34" textAnchor="middle" className="fill-default-600 text-[10px]">VI</text>
    </svg>
  ),
  import: (
    <svg viewBox="0 0 520 96" className="w-full max-w-lg h-auto" role="img">
      {[
        { t: "1", h: "Chọn học kỳ", c: "fill-secondary" },
        { t: "2", h: "Thả file Excel", c: "fill-primary" },
        { t: "3", h: "Xem báo cáo", c: "fill-success" },
      ].map((s, i) => (
        <g key={s.t} transform={`translate(${8 + i * 172},18)`}>
          <rect x="0" y="0" width="150" height="60" rx="10" className="fill-default-100 stroke-default-200" />
          <circle cx="26" cy="30" r="14" className={s.c} opacity="0.9" />
          <text x="26" y="35" textAnchor="middle" className="fill-white text-[13px] font-bold">{s.t}</text>
          <text x="48" y="34" className="fill-default-700 text-[11px] font-medium">{s.h}</text>
          {i < 2 && <text x="162" y="35" className="fill-default-400 text-[16px]">›</text>}
        </g>
      ))}
    </svg>
  ),
  grid: (
    <svg viewBox="0 0 520 130" className="w-full max-w-lg h-auto" role="img">
      {["T2", "T3", "T4", "T5", "T6"].map((d, i) => (
        <text key={d} x={60 + i * 88} y="16" textAnchor="middle" className="fill-default-500 text-[11px] font-semibold">{d}</text>
      ))}
      {[0, 1, 2].map((r) => (
        <text key={r} x="16" y={44 + r * 30} className="fill-default-400 text-[10px]">{`Tiết ${r * 3 + 1}`}</text>
      ))}
      {[0, 1, 2, 3, 4].map((c) =>
        [0, 1, 2].map((r) => {
          const booked = c === 1 && r === 0;
          const warn = c === 3 && r === 1;
          return (
            <rect key={`${c}-${r}`} x={22 + c * 88} y={26 + r * 30} width="82" height="26" rx="5"
              className={booked ? "fill-secondary/25 stroke-secondary" : warn ? "fill-warning/25 stroke-warning" : "fill-default-50 stroke-default-200"} />
          );
        })
      )}
      <text x={63} y={43} textAnchor="middle" className="fill-secondary text-[10px] font-medium">Đã đặt</text>
      <text x={327} y={73} textAnchor="middle" className="fill-warning-600 text-[10px] font-medium">Trùng lớp</text>
    </svg>
  ),
  report: (
    <svg viewBox="0 0 520 60" className="w-full max-w-lg h-auto" role="img">
      {[
        { t: "Tạo mới", c: "fill-success" },
        { t: "Ghi đè", c: "fill-primary" },
        { t: "Trùng lịch", c: "fill-danger" },
        { t: "Bỏ qua", c: "fill-warning" },
        { t: "Trùng mã môn", c: "fill-warning" },
      ].map((s, i) => {
        const x = 8 + i * 102;
        return (
          <g key={s.t} transform={`translate(${x},18)`}>
            <rect x="0" y="0" width="96" height="24" rx="12" className={s.c} opacity="0.18" />
            <circle cx="14" cy="12" r="5" className={s.c} />
            <text x="26" y="16" className="fill-default-700 text-[10px] font-medium">{s.t}</text>
          </g>
        );
      })}
    </svg>
  ),
  share: (
    <svg viewBox="0 0 520 110" className="w-full max-w-lg h-auto" role="img">
      <rect x="150" y="10" width="220" height="90" rx="12" className="fill-default-100 stroke-default-200" />
      <rect x="166" y="26" width="58" height="58" rx="6" className="fill-white stroke-default-300" />
      {[[172, 32], [172, 66], [206, 32], [190, 50], [178, 44], [200, 60], [212, 72]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="10" height="10" className="fill-default-700" />
      ))}
      <text x="240" y="44" className="fill-default-600 text-[11px]">Mã truy cập</text>
      <rect x="240" y="52" width="104" height="24" rx="6" className="fill-secondary/15" />
      <text x="292" y="68" textAnchor="middle" className="fill-secondary text-[13px] font-bold tracking-widest">7K2P9</text>
    </svg>
  ),
  group: (
    <svg viewBox="0 0 520 96" className="w-full max-w-lg h-auto" role="img">
      {["25VLH_A", "25VLH_B", "25VLH_C"].map((tx, i) => (
        <g key={tx} transform={`translate(${8 + i * 96},20)`}>
          <rect x="0" y="0" width="86" height="24" rx="6" className="fill-default-100 stroke-default-200" />
          <text x="43" y="16" textAnchor="middle" className="fill-default-600 text-[10px]">{tx}</text>
        </g>
      ))}
      <text x="300" y="37" className="fill-default-400 text-[18px]">→</text>
      <g transform="translate(330,20)">
        <rect x="0" y="0" width="120" height="24" rx="6" className="fill-success/20 stroke-success" />
        <text x="60" y="16" textAnchor="middle" className="fill-success-600 text-[11px] font-semibold">25VLH (gộp)</text>
      </g>
      <text x="8" y="70" className="fill-default-500 text-[10px]">Nhưng 25VLH_DKD1 ≠ 25VLH ≠ 25VLH_DKD2 (khác nhau, không gộp)</text>
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Callouts (chú thích): tip / note / warning.
// ---------------------------------------------------------------------------
const CALLOUT = {
  tip: { icon: LightbulbIcon, cls: "bg-success-50 border-success-200 text-success-700", Icon: "text-success" },
  note: { icon: InfoIcon, cls: "bg-primary-50 border-primary-200 text-primary-700", Icon: "text-primary" },
  warn: { icon: AlertTriangleIcon, cls: "bg-warning-50 border-warning-200 text-warning-700", Icon: "text-warning-600" },
};
const Callout = ({ type = "note", children }) => {
  const c = CALLOUT[type] || CALLOUT.note;
  const Ic = c.icon;
  return (
    <div className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${c.cls}`}>
      <Ic size={15} className={`shrink-0 mt-0.5 ${c.Icon}`} />
      <span>{children}</span>
    </div>
  );
};

// Strip Vietnamese accents so search matches "bo mon" ~ "bộ môn".
const norm = (s) =>
  String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

// audience: who the section is for. all = everyone (incl. guests), user = any
// logged-in account, admin = admins only. Sections are filtered by the viewer's
// role so people only see guidance they can actually act on.
const LEVEL = { all: 0, user: 1, admin: 2 };

// ---------------------------------------------------------------------------
// Bilingual, data-driven help content.
// ---------------------------------------------------------------------------
const SECTIONS = {
  vi: [
    { id: "overview", audience: "all", icon: BookOpenIcon, title: "Physoom là gì?", intro: "Physoom là hệ thống xem và đặt lịch phòng của Khoa Vật lý — VNU-HCMUS.", fig: "nav", figCaption: "Thanh điều hướng: Đặt lịch · Lịch phòng · Quản trị, cùng nút ? (trợ giúp) và VI/EN.", points: [
      "Xem lịch sử dụng của từng phòng theo tuần hoặc theo lưới tiết.",
      "Giảng viên đặt phòng cho sự kiện; quản trị xếp lịch môn học và lịch họp.",
      "Mặc định tiếng Việt, có thể chuyển sang tiếng Anh bất cứ lúc nào.",
    ], tips: [{ type: "tip", text: "Bấm 'Xem hướng dẫn nhanh' ở góc trên để chạy tour giới thiệu các khu vực chính." }]},

    { id: "view", audience: "all", icon: DoorOpenIcon, title: "Xem lịch phòng", intro: "Vào mục Lịch phòng trên thanh điều hướng.", points: [
      "Khi đã đăng nhập: nhập mã cán bộ (MSCB) để xem, hoặc dùng mã chia sẻ.",
      "Chưa đăng nhập vẫn xem được nếu có liên kết / mã chia sẻ / QR.",
      "Chọn phòng để xem lịch; bấm vào một buổi để mở popup thông tin đầy đủ.",
      "Popup hiện theo quyền: người không đủ quyền chỉ thấy thông tin cơ bản.",
    ], tips: [{ type: "note", text: "Mỗi ô lịch hiện tên môn (đậm), lớp · phòng, và tên giảng viên (nhạt) — cỡ chữ thay đổi theo nội dung để dễ nhìn." }]},

    { id: "book", audience: "user", icon: CalendarPlusIcon, title: "Đặt phòng sự kiện", intro: "Trong trang Đặt lịch → tab Đặt phòng sự kiện.", fig: "grid", figCaption: "Lưới phòng: ô xanh là đã đặt, ô vàng cảnh báo khung trùng giờ lớp học đang diễn ra.", points: [
      "Chọn phòng, khung giờ và điền tiêu đề để gửi yêu cầu.",
      "Lịch phòng hiện sẵn cả các buổi lớp học đang chiếm chỗ để bạn tránh.",
      "Nếu bạn không phải admin/quản lý phòng, yêu cầu ở trạng thái Chờ duyệt.",
      "Bạn sẽ nhận thông báo khi yêu cầu được duyệt, bị từ chối, hoặc bị xoá.",
    ], tips: [{ type: "warn", text: "Khi kéo chọn một khung đã có lớp, hệ thống cảnh báo ngay và không mở form — hãy chọn khung khác." }]},

    { id: "room-manager", audience: "user", icon: ClipboardCheckIcon, title: "Quản lý phòng (duyệt mượn phòng)", intro: "Menu 'Quản lý phòng' khi đã đăng nhập.", points: [
      "Xem các yêu cầu mượn phòng và trạng thái: Chờ duyệt / Đã duyệt / Từ chối.",
      "Nếu bạn là người quản lý của phòng: duyệt hoặc từ chối yêu cầu mượn phòng đó.",
      "Tạo nhanh một yêu cầu đặt phòng ngay trên trang.",
    ], tips: [{ type: "note", text: "Người quản lý phòng và admin được thông báo khi có yêu cầu mới cần duyệt." }]},

    { id: "notify", audience: "user", icon: BellIcon, title: "Thông báo", intro: "Chuông thông báo ở góc phải thanh điều hướng (khi đã đăng nhập).", points: [
      "Người đặt: được báo khi yêu cầu được duyệt / bị từ chối / bị xoá.",
      "Quản lý phòng & admin: được báo khi có yêu cầu mượn phòng cần duyệt.",
    ]},

    { id: "schedule", audience: "admin", icon: CalendarClockIcon, title: "Xếp lịch môn học (quản trị)", intro: "Trong Quản trị → Đặt phòng môn học.", points: [
      "Chọn môn ở danh sách bên trái (tìm được theo tên môn, mã lớp), sau đó xếp phòng ở tab Lịch phòng học.",
      "Môn chưa có giảng viên sẽ bị chặn xếp lịch (hiện cảnh báo, không cho chọn phòng).",
      "Ô chọn phòng cho gõ để lọc; có gợi ý ⭐ và chip sức chứa / loại phòng.",
      "Bật 'Tự nhảy tới ngày bắt đầu' để lịch nhảy tới tuần môn bắt đầu khi chọn môn.",
      "Bật 'Chế độ gọn' để xem lưới theo thứ, chỉnh khoảng ngày.",
    ], tips: [{ type: "note", text: "Nút 'Chuyển sang chờ xếp' (biểu tượng gọn) gỡ toàn bộ lịch của môn để xếp lại từ đầu." }]},

    { id: "import", audience: "admin", icon: FileSpreadsheetIcon, title: "Nhập lịch từ Excel", intro: "Quản trị → Đặt phòng môn học → Nhập từ file. Nhớ chọn Học kỳ trước.", fig: "import", figCaption: "Ba bước: chọn học kỳ → thả file Excel → đọc báo cáo kết quả.", points: [
      "Có sẵn file mẫu để tải về và điền đúng cột (Mã mh, Lớp, Tên phòng, Thứ, Tiết bắt đầu, Số tiết, Giảng viên…).",
      "Mỗi dòng được xếp theo đúng 'Số tiết' của dòng đó — Lý thuyết, Bài tập, Thực hành cùng mã môn vẫn xếp đúng độ dài riêng.",
      "Nếu một tên giảng viên khớp nhiều người, hệ thống hỏi chọn đúng người (kèm MSCB) và ghi nhớ cho lần sau.",
      "Môn thiếu giảng viên vẫn được tạo nhưng không xếp lịch, và bị gắn cảnh báo ⚠.",
      "Nhập lại sẽ thay sạch lịch cũ của các lớp trong file rồi dựng lại — không để rác cũ gây trùng.",
    ], fig2: "report", fig2Caption: "Báo cáo phân loại từng dòng theo màu; tải được Excel/CSV để rà soát.", tips: [
      { type: "warn", text: "Số tiết sai/bỏ trống thì dòng đó bị BỎ QUA và báo lỗi — hệ thống không tự bịa số tiết. Sửa file rồi nhập lại." },
      { type: "note", text: "Cảnh báo 'Trùng mã môn': nhiều dòng dùng chung (Mã mh + mã lớp 2 + Lớp) sẽ gộp một môn. Bình thường với LT + Bài tập; chỉ đáng lo khi trùng cả Thứ + Tiết (đè mất buổi)." },
    ]},

    { id: "courses", audience: "admin", icon: BookMarkedIcon, title: "Quản lý môn học", intro: "Quản trị → Môn học.", points: [
      "Sửa thông tin môn: tên, số tiết, giảng viên, sĩ số, mã lớp.",
      "Khoá / mở khoá môn để tránh chỉnh nhầm — khoá KHÔNG làm mất lịch đã xếp.",
      "Cột ⚠ và bộ lọc 'Có cảnh báo' giúp tìm nhanh môn cần xử lý.",
    ]},

    { id: "rooms", audience: "admin", icon: Building2Icon, title: "Quản lý phòng học", intro: "Quản trị → Phòng.", points: [
      "Thêm/sửa phòng: tên, cơ sở, sức chứa, loại phòng, người quản lý.",
      "Nhập danh sách phòng từ Excel (có file mẫu).",
      "Cơ sở của phòng quyết định lưới tiết — giờ mỗi tiết khác nhau giữa các cơ sở, nên đặt đúng cơ sở là quan trọng.",
    ]},

    { id: "terms", audience: "admin", icon: CalendarRangeIcon, title: "Học kỳ & Ngày nghỉ", intro: "Quản trị → Học kỳ.", points: [
      "Tạo/sửa Học kỳ (khoảng ngày) — bắt buộc chọn khi nhập lịch và xếp lịch.",
      "Khai báo Ngày nghỉ (lễ, tết) — buổi rơi vào ngày nghỉ được bỏ qua và bù sang tuần sau khi tạo lịch.",
      "Có sẵn danh sách ngày lễ quốc gia Việt Nam để thêm nhanh.",
    ], tips: [{ type: "warn", text: "Thiếu Học kỳ thì không tạo được buổi khi nhập/xếp lịch — hãy tạo học kỳ trước." }]},

    { id: "classgroup", audience: "admin", icon: LayersIcon, title: "Quản lý lớp (gộp lớp)", intro: "Quản trị → Quản lý lớp. Kiểm soát việc gộp các lớp thành phần.", fig: "group", figCaption: "Hậu tố _A/_B/_C được gộp về lớp gốc; nhưng _DKD1 và _DKD2 là các lớp KHÁC nhau.", points: [
      "Các lớp thành phần có hậu tố _A, _B, _C (vd 25VLH_A) được gộp chung khi hiển thị lịch.",
      "Các lớp như 25VLH_DKD1, 25VLH, 25VLH_DKD2 là KHÁC nhau — không gộp.",
      "Trang tổng quan liệt kê các nhóm đang gộp; có thể đặt ghi đè thủ công cho từng lớp nếu quy tắc tự động chưa đúng.",
    ], tips: [{ type: "tip", text: "Dùng ghi đè thủ công khi một mã lớp đặc biệt cần tách khỏi (hoặc nhập vào) một nhóm nhất định." }]},

    { id: "meeting", audience: "admin", icon: CalendarClockIcon, title: "Lịch họp (tìm khung rảnh chung)", intro: "Quản trị → Lịch họp. Tìm khung thời gian nhiều người cùng rảnh.", points: [
      "Kéo chọn các khung giờ ưu tiên; hệ thống tính mức độ rảnh của mọi người theo khung đó.",
      "Lọc theo Bộ môn (chọn nhiều), có cả nhóm 'Không có bộ môn'; mặc định chọn tất cả trừ nhóm không bộ môn.",
      "Mỗi bộ môn hiện số lượng người; có nút 'Tất cả' / 'Bỏ chọn' để thao tác nhanh.",
    ], tips: [{ type: "note", text: "Muốn lọc theo bộ môn cần người dùng đã có Bộ môn — cập nhật ở trang Người dùng." }]},

    { id: "users", audience: "admin", icon: UsersIcon, title: "Người dùng & bộ môn", intro: "Quản trị → Người dùng.", points: [
      "Mỗi người có thể gắn Bộ môn, Học hàm, Học vị — dùng cho lọc lịch họp và hiển thị.",
      "Nhập danh sách cán bộ từ Excel; khớp theo MSCB kể cả khi số có/không có số 0 ở đầu.",
      "Có file mẫu để tải về và điền đúng định dạng trước khi nhập.",
    ], tips: [{ type: "note", text: "MSCB dạng '0365' và '365' được coi là cùng một người khi nhập." }]},

    { id: "track", audience: "admin", icon: ShieldCheckIcon, title: "Theo dõi cảnh báo (track)", intro: "Các môn có vấn đề được gắn cờ để dễ tìm và sửa.", points: [
      "Bảng Môn học có cột ⚠ và nút lọc 'Có cảnh báo'.",
      "Danh sách chọn môn khi đặt lịch cũng hiện ⚠ + tô vàng; rê chuột để xem lý do.",
      "Lý do gồm: thiếu giảng viên, giảng viên chưa có trong hệ thống, trùng lịch.",
    ]},

    { id: "share", audience: "admin", icon: QrCodeIcon, title: "Chia sẻ lịch (QR / mã)", intro: "Quản trị → Chia sẻ lịch.", fig: "share", figCaption: "Mỗi liên kết chia sẻ kèm mã QR và mã truy cập nhanh để người xem nhập.", points: [
      "Tạo liên kết chia sẻ cho một hoặc nhiều phòng, kèm mã QR và mã truy cập nhanh.",
      "Người xem mở bằng link, quét QR, hoặc nhập mã tại trang Lịch phòng.",
      "Chọn thông tin được hiển thị (giảng viên / mã lớp / tên môn) và có yêu cầu đăng nhập hay không.",
    ]},

    { id: "lang", audience: "all", icon: LanguagesIcon, title: "Ngôn ngữ & giao diện", intro: "Tuỳ chỉnh nhanh trên thanh điều hướng.", points: [
      "Nút VI/EN đổi ngôn ngữ tức thì; nút mặt trăng đổi sáng/tối.",
      "App cài được như ứng dụng (PWA) trên điện thoại/máy tính.",
    ]},
  ],
  en: [
    { id: "overview", audience: "all", icon: BookOpenIcon, title: "What is Physoom?", intro: "Physoom is the room viewing & booking system for the Physics department, VNU-HCMUS.", fig: "nav", figCaption: "Nav bar: Booking · Room schedule · Admin, plus the ? (help) and VI/EN buttons.", points: [
      "View each room's usage by week or by period (tiết) grid.",
      "Lecturers book rooms for events; admins schedule courses and meetings.",
      "Vietnamese by default; switch to English anytime.",
    ], tips: [{ type: "tip", text: "Click 'Quick tour' at the top to walk through the main areas." }]},

    { id: "view", audience: "all", icon: DoorOpenIcon, title: "View room schedule", intro: "Open Room schedule in the nav bar.", points: [
      "When logged in: enter your staff code (MSCB), or use a share code.",
      "Not logged in? You can still view via a share link / code / QR.",
      "Pick a room to see its schedule; click a session for a full info popup.",
      "The popup respects permissions: users without access see only basic info.",
    ], tips: [{ type: "note", text: "Each cell shows the course (bold), class · room, and lecturer (muted) — font sizes adapt to content for readability." }]},

    { id: "book", audience: "user", icon: CalendarPlusIcon, title: "Book a room for an event", intro: "Booking page → Event booking tab.", fig: "grid", figCaption: "Room grid: blue = booked, amber = the slot you dragged overlaps an ongoing class.", points: [
      "Pick a room, time slot and title to submit a request.",
      "The room grid already shows class sessions occupying it, so you can avoid them.",
      "If you're not an admin/room manager, the request stays Pending.",
      "You get notified when it's approved, rejected, or deleted.",
    ], tips: [{ type: "warn", text: "Dragging over a slot that already has a class warns immediately and won't open the form — pick another slot." }]},

    { id: "room-manager", audience: "user", icon: ClipboardCheckIcon, title: "Room manager (approve requests)", intro: "The 'Room manager' menu when logged in.", points: [
      "See room requests and their status: Pending / Approved / Rejected.",
      "If you manage a room: approve or reject requests for that room.",
      "Quickly create a booking request from the same page.",
    ], tips: [{ type: "note", text: "Room managers and admins are notified when a new request needs approval." }]},

    { id: "notify", audience: "user", icon: BellIcon, title: "Notifications", intro: "The bell at the top-right of the nav bar (when logged in).", points: [
      "Requester: notified when a request is approved / rejected / deleted.",
      "Room managers & admins: notified when a booking needs approval.",
    ]},

    { id: "schedule", audience: "admin", icon: CalendarClockIcon, title: "Schedule courses (admin)", intro: "Admin → Course booking.", points: [
      "Pick a course on the left (searchable by course name / class id), then place it in the Classroom schedule tab.",
      "Courses without a lecturer are blocked from scheduling (a warning shows).",
      "The room picker is type-to-filter, with ⭐ suggestions and capacity / category chips.",
      "Enable 'Auto jump to start day' to jump to the course's first week on select.",
      "Enable 'Compact mode' for a date-less weekday grid with an adjustable range.",
    ], tips: [{ type: "note", text: "The 'Move to unscheduled' button removes all of a course's bookings so you can reschedule it." }]},

    { id: "import", audience: "admin", icon: FileSpreadsheetIcon, title: "Import from Excel", intro: "Admin → Course booking → Import from file. Select a Term first.", fig: "import", figCaption: "Three steps: pick a term → drop the Excel file → read the result report.", points: [
      "A template file is available to download and fill with the right columns (course code, class, room, weekday, start period, number of periods, lecturer…).",
      "Each row is scheduled by its OWN 'number of periods' — lecture, exercise and lab under one code keep their own lengths.",
      "If a lecturer name matches several people, you're asked to pick (with MSCB); the choice is remembered.",
      "Courses without a lecturer are still created but not scheduled, and flagged ⚠.",
      "Re-importing wipes the file's classes' old schedule then rebuilds it — no stale leftovers causing phantom conflicts.",
    ], fig2: "report", fig2Caption: "The report classifies every row by colour; downloadable as Excel/CSV.", tips: [
      { type: "warn", text: "An invalid/empty period count SKIPS that row and reports it — the system never fabricates a duration. Fix the file and re-import." },
      { type: "note", text: "'Duplicate course key' warning: several rows sharing (code + class-id-2 + class) merge into one course. Normal for lecture + exercise; only a problem when they also share weekday + period (overwriting each other)." },
    ]},

    { id: "courses", audience: "admin", icon: BookMarkedIcon, title: "Course management", intro: "Admin → Courses.", points: [
      "Edit a course: name, number of periods, lecturers, class size, class id.",
      "Lock / unlock a course to prevent accidental edits — locking does NOT drop its existing schedule.",
      "The ⚠ column and 'Has warnings' filter quickly surface courses that need attention.",
    ]},

    { id: "rooms", audience: "admin", icon: Building2Icon, title: "Room management", intro: "Admin → Rooms.", points: [
      "Add/edit rooms: name, campus, capacity, category, manager.",
      "Import the room list from Excel (a template is provided).",
      "A room's campus decides its period grid — period times differ per campus, so setting the right campus matters.",
    ]},

    { id: "terms", audience: "admin", icon: CalendarRangeIcon, title: "Terms & holidays", intro: "Admin → Terms.", points: [
      "Create/edit Terms (date ranges) — required when importing and scheduling.",
      "Declare Holidays — sessions falling on a holiday are skipped and pushed to a later week when generating a schedule.",
      "A list of Vietnamese national holidays is available to add quickly.",
    ], tips: [{ type: "warn", text: "Without a Term, sessions can't be created on import/schedule — create the term first." }]},

    { id: "classgroup", audience: "admin", icon: LayersIcon, title: "Class management (grouping)", intro: "Admin → Class management. Control how sub-classes are grouped.", fig: "group", figCaption: "_A/_B/_C suffixes merge into the base class; but _DKD1 and _DKD2 are DIFFERENT classes.", points: [
      "Sub-classes with an _A, _B, _C suffix (e.g. 25VLH_A) are merged when showing schedules.",
      "Classes like 25VLH_DKD1, 25VLH, 25VLH_DKD2 are DIFFERENT — not merged.",
      "The overview lists current groups; you can set a manual override per class when the automatic rule isn't right.",
    ], tips: [{ type: "tip", text: "Use a manual override when a special class id must split from (or join) a specific group." }]},

    { id: "meeting", audience: "admin", icon: CalendarClockIcon, title: "Meeting planner (find a common slot)", intro: "Admin → Meetings. Find a time when many people are free.", points: [
      "Drag to select preferred slots; the system scores everyone's availability for them.",
      "Filter by Department (multi-select), including a 'No department' group; by default all are selected except 'No department'.",
      "Each department shows its headcount, with 'All' / 'Clear' shortcuts.",
    ], tips: [{ type: "note", text: "Department filtering needs users to have a Department set — update it on the Users page." }]},

    { id: "users", audience: "admin", icon: UsersIcon, title: "Users & departments", intro: "Admin → Users.", points: [
      "Each person can carry a Department, Rank and Degree — used for meeting filters and display.",
      "Import the staff list from Excel; matching is by MSCB even with/without a leading zero.",
      "A template is available to download and fill in the right format before importing.",
    ], tips: [{ type: "note", text: "MSCB '0365' and '365' are treated as the same person on import." }]},

    { id: "track", audience: "admin", icon: ShieldCheckIcon, title: "Warning track", intro: "Problem courses are flagged so they're easy to find and fix.", points: [
      "The Courses table has a ⚠ column and a 'Has warnings' filter.",
      "The course picker also shows ⚠ + a yellow highlight; hover to see reasons.",
      "Reasons include: missing lecturer, lecturer not in the system, scheduling conflict.",
    ]},

    { id: "share", audience: "admin", icon: QrCodeIcon, title: "Share schedules (QR / code)", intro: "Admin → Share.", fig: "share", figCaption: "Each share link comes with a QR and a quick-access code for viewers to enter.", points: [
      "Create a share link for one or more rooms, with a QR and a quick-access code.",
      "Viewers open the link, scan the QR, or enter the code on the Room schedule page.",
      "Choose what's shown (lecturer / class IDs / course names) and whether login is required.",
    ]},

    { id: "lang", audience: "all", icon: LanguagesIcon, title: "Language & appearance", intro: "Quick controls in the nav bar.", points: [
      "The VI/EN button switches language instantly; the moon toggles light/dark.",
      "The app is installable (PWA) on phone/desktop.",
    ]},
  ],
};

export default function GuidePage() {
  const { t, lang } = useI18n();
  const { data: session } = useSession();
  const allSections = SECTIONS[lang] || SECTIONS.vi;
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const vi = lang !== "en";
  const level = session?.user?.isAdmin ? LEVEL.admin : session?.user ? LEVEL.user : LEVEL.all;
  const roleLabel = vi
    ? level === LEVEL.admin ? "Quản trị" : level === LEVEL.user ? "Giảng viên / cán bộ" : "Khách"
    : level === LEVEL.admin ? "Admin" : level === LEVEL.user ? "Staff" : "Guest";

  const sections = useMemo(() => {
    const byRole = showAll
      ? allSections
      : allSections.filter((s) => LEVEL[s.audience ?? "all"] <= level);
    const q = norm(query).trim();
    if (!q) return byRole;
    const terms = q.split(/\s+/);
    return byRole.filter((s) => {
      const hay = norm(
        [s.title, s.intro, ...(s.points || []), ...((s.tips || []).map((tp) => tp.text)), s.figCaption, s.fig2Caption]
          .filter(Boolean)
          .join(" ")
      );
      return terms.every((term) => hay.includes(term));
    });
  }, [allSections, query, level, showAll]);

  const hiddenCount = allSections.length - allSections.filter((s) => LEVEL[s.audience ?? "all"] <= level).length;
  const searchPlaceholder = vi ? "Tìm trong hướng dẫn… (vd: bộ môn, nhập excel, trùng)" : "Search the guide… (e.g. department, import, conflict)";
  const noResult = vi ? "Không tìm thấy mục nào khớp." : "No matching section.";
  const matchLabel = vi ? "kết quả" : "results";

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold">{t("guide.title")}</h1>
          <p className="text-default-500 mt-1 max-w-2xl">{t("guide.subtitle")}</p>
        </div>
        <GuideTour />
      </div>

      {/* Search + role scope */}
      <div className="mb-5 flex flex-col gap-2">
        <Input
          value={query}
          onValueChange={setQuery}
          isClearable
          onClear={() => setQuery("")}
          startContent={<SearchIcon size={18} className="text-default-400" />}
          placeholder={searchPlaceholder}
          variant="bordered"
          classNames={{ inputWrapper: "bg-content1", input: "text-default-700" }}
          aria-label={searchPlaceholder}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-default-400 px-1">
          <span className="flex items-center gap-1">
            {vi ? "Đang hiển thị cho vai trò:" : "Showing for role:"}
            <Chip size="sm" variant="flat" color="secondary" className="h-5">{roleLabel}</Chip>
          </span>
          {hiddenCount > 0 && (
            <Switch size="sm" isSelected={showAll} onValueChange={setShowAll} classNames={{ label: "text-xs text-default-500" }}>
              {vi ? `Hiện tất cả mục (kể cả ngoài quyền, +${hiddenCount})` : `Show all sections (+${hiddenCount})`}
            </Switch>
          )}
          {query.trim() && <span>· {sections.length} {matchLabel}</span>}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Table of contents */}
        <aside className="lg:w-60 shrink-0">
          <div className="lg:sticky lg:top-20">
            <p className="text-xs font-semibold uppercase tracking-wide text-default-400 mb-2 px-1">
              {t("guide.toc")}
            </p>
            <nav className="flex lg:flex-col gap-1 flex-wrap">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-default-600 hover:bg-default-100 hover:text-secondary transition-colors"
                >
                  <s.icon size={15} className="shrink-0" />
                  <span>{s.title}</span>
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {sections.length === 0 && (
            <Card className="p-6 text-center text-default-500">{noResult}</Card>
          )}
          {sections.map((s) => (
            <Card key={s.id} id={s.id} className="scroll-mt-24 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <s.icon size={18} />
                </span>
                <h2 className="text-xl font-bold">{s.title}</h2>
                {showAll && s.audience && s.audience !== "all" && LEVEL[s.audience] > level && (
                  <Chip size="sm" variant="flat" color="warning" className="ml-auto h-5">
                    {s.audience === "admin" ? (vi ? "Quản trị" : "Admin") : (vi ? "Cần đăng nhập" : "Login")}
                  </Chip>
                )}
              </div>
              {s.intro && <p className="text-default-600 mb-2">{s.intro}</p>}

              {s.fig && FIG[s.fig] && <Figure caption={s.figCaption}>{FIG[s.fig]}</Figure>}

              <ul className="list-disc pl-5 space-y-1 text-sm text-default-700">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>

              {s.fig2 && FIG[s.fig2] && <Figure caption={s.fig2Caption}>{FIG[s.fig2]}</Figure>}

              {(s.tips || []).map((tp, i) => (
                <Callout key={i} type={tp.type}>{tp.text}</Callout>
              ))}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

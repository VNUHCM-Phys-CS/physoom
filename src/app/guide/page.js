"use client";

import { useI18n } from "@/i18n/I18nProvider";
import GuideTour from "@/ui/GuideTour";
import Card from "@/ui/Card";
import {
  BookOpenIcon, DoorOpenIcon, CalendarPlusIcon, CalendarClockIcon,
  FileSpreadsheetIcon, BellIcon, QrCodeIcon, ShieldCheckIcon, LanguagesIcon,
} from "lucide-react";

// Bilingual, data-driven help content. Each section renders in an anchored card
// with a matching entry in the sticky table of contents.
const SECTIONS = {
  vi: [
    { id: "overview", icon: BookOpenIcon, title: "Physoom là gì?", intro: "Physoom là hệ thống xem và đặt lịch phòng của Khoa Vật lý — VNU-HCMUS.", points: [
      "Xem lịch sử dụng của từng phòng theo tuần hoặc theo lưới tiết.",
      "Giảng viên đặt phòng cho sự kiện; quản trị xếp lịch môn học.",
      "Mặc định tiếng Việt, có thể chuyển sang tiếng Anh bất cứ lúc nào.",
    ]},
    { id: "view", icon: DoorOpenIcon, title: "Xem lịch phòng", intro: "Vào mục Lịch phòng trên thanh điều hướng.", points: [
      "Khi đã đăng nhập: nhập mã cán bộ (MSCB) để xem, hoặc dùng mã chia sẻ.",
      "Chọn phòng để xem lịch; bấm vào một buổi để mở popup thông tin đầy đủ.",
      "Popup hiện theo quyền: người không đủ quyền chỉ thấy thông tin cơ bản.",
    ]},
    { id: "book", icon: CalendarPlusIcon, title: "Đặt phòng sự kiện", intro: "Trong trang Đặt lịch → tab Đặt phòng sự kiện.", points: [
      "Chọn phòng, khung giờ và điền tiêu đề để gửi yêu cầu.",
      "Nếu bạn không phải admin/quản lý phòng, yêu cầu ở trạng thái Chờ duyệt.",
      "Bạn sẽ nhận thông báo khi yêu cầu được duyệt, bị từ chối, hoặc bị xoá.",
    ]},
    { id: "schedule", icon: CalendarClockIcon, title: "Xếp lịch môn học (quản trị)", intro: "Trong Quản trị → Đặt phòng môn học.", points: [
      "Chọn môn ở danh sách bên trái, sau đó xếp phòng ở tab Lịch phòng học.",
      "Môn chưa có giảng viên sẽ bị chặn xếp lịch (hiện cảnh báo, không cho chọn phòng).",
      "Bật 'Tự nhảy tới ngày bắt đầu' để lịch nhảy tới tuần môn bắt đầu khi chọn môn.",
      "Bật 'Chế độ gọn' để xem lưới theo thứ, chỉnh khoảng ngày.",
    ]},
    { id: "import", icon: FileSpreadsheetIcon, title: "Nhập lịch từ Excel", intro: "Quản trị → Đặt phòng môn học → Nhập từ file. Nhớ chọn Học kỳ trước.", points: [
      "Nếu một tên giảng viên khớp nhiều người, hệ thống hỏi chọn đúng người (kèm MSCB) và ghi nhớ cho lần sau.",
      "Môn thiếu giảng viên vẫn được tạo nhưng không xếp lịch, và bị gắn cảnh báo ⚠.",
      "Sau khi nhập có báo cáo đầy đủ: Tạo mới / Ghi đè / Trùng lịch / Bỏ qua — tải được Excel hoặc CSV.",
      "Nhập lại đè lên lịch cũ của chính môn đó được tính là 'Ghi đè', không phải 'Trùng lịch'.",
    ]},
    { id: "track", icon: ShieldCheckIcon, title: "Theo dõi cảnh báo (track)", intro: "Các môn có vấn đề được gắn cờ để dễ tìm và sửa.", points: [
      "Bảng Môn học có cột ⚠ và nút lọc 'Có cảnh báo'.",
      "Danh sách chọn môn khi đặt lịch cũng hiện ⚠ + tô vàng; rê chuột để xem lý do.",
      "Lý do gồm: thiếu giảng viên, giảng viên chưa có trong hệ thống, trùng lịch.",
    ]},
    { id: "notify", icon: BellIcon, title: "Thông báo", intro: "Chuông thông báo ở góc phải thanh điều hướng.", points: [
      "Người đặt: được báo khi yêu cầu được duyệt / bị từ chối / bị xoá.",
      "Quản lý phòng & admin: được báo khi có yêu cầu mượn phòng cần duyệt.",
    ]},
    { id: "share", icon: QrCodeIcon, title: "Chia sẻ lịch (QR / mã)", intro: "Quản trị → Chia sẻ lịch.", points: [
      "Tạo liên kết chia sẻ cho một hoặc nhiều phòng, kèm mã QR và mã truy cập nhanh.",
      "Người xem mở bằng link, quét QR, hoặc nhập mã tại trang Lịch phòng.",
      "Chọn thông tin được hiển thị (giảng viên / mã lớp / tên môn) và có yêu cầu đăng nhập hay không.",
    ]},
    { id: "lang", icon: LanguagesIcon, title: "Ngôn ngữ & giao diện", intro: "Tuỳ chỉnh nhanh trên thanh điều hướng.", points: [
      "Nút VI/EN đổi ngôn ngữ tức thì; nút mặt trăng đổi sáng/tối.",
      "App cài được như ứng dụng (PWA) trên điện thoại/máy tính.",
    ]},
  ],
  en: [
    { id: "overview", icon: BookOpenIcon, title: "What is Physoom?", intro: "Physoom is the room viewing & booking system for the Physics department, VNU-HCMUS.", points: [
      "View each room's usage by week or by period (tiết) grid.",
      "Lecturers book rooms for events; admins schedule courses.",
      "Vietnamese by default; switch to English anytime.",
    ]},
    { id: "view", icon: DoorOpenIcon, title: "View room schedule", intro: "Open Room schedule in the nav bar.", points: [
      "When logged in: enter your staff code (MSCB), or use a share code.",
      "Pick a room to see its schedule; click a session for a full info popup.",
      "The popup respects permissions: users without access see only basic info.",
    ]},
    { id: "book", icon: CalendarPlusIcon, title: "Book a room for an event", intro: "Booking page → Event booking tab.", points: [
      "Pick a room, time slot and title to submit a request.",
      "If you're not an admin/room manager, the request stays Pending.",
      "You get notified when it's approved, rejected, or deleted.",
    ]},
    { id: "schedule", icon: CalendarClockIcon, title: "Schedule courses (admin)", intro: "Admin → Course booking.", points: [
      "Pick a course on the left, then place it in the Classroom schedule tab.",
      "Courses without a lecturer are blocked from scheduling (a warning shows).",
      "Enable 'Auto jump to start day' to jump to the course's first week on select.",
      "Enable 'Compact mode' for a date-less weekday grid with an adjustable range.",
    ]},
    { id: "import", icon: FileSpreadsheetIcon, title: "Import from Excel", intro: "Admin → Course booking → Import from file. Select a Term first.", points: [
      "If a lecturer name matches several people, you're asked to pick (with MSCB); the choice is remembered.",
      "Courses without a lecturer are still created but not scheduled, and flagged ⚠.",
      "A full report follows: Created / Overwrite / Conflict / Skipped — downloadable as Excel or CSV.",
      "Re-importing over a course's own schedule counts as 'Overwrite', not 'Conflict'.",
    ]},
    { id: "track", icon: ShieldCheckIcon, title: "Warning track", intro: "Problem courses are flagged so they're easy to find and fix.", points: [
      "The Courses table has a ⚠ column and a 'Has warnings' filter.",
      "The course picker also shows ⚠ + a yellow highlight; hover to see reasons.",
      "Reasons include: missing lecturer, lecturer not in the system, scheduling conflict.",
    ]},
    { id: "notify", icon: BellIcon, title: "Notifications", intro: "The bell at the top-right of the nav bar.", points: [
      "Requester: notified when a request is approved / rejected / deleted.",
      "Room managers & admins: notified when a booking needs approval.",
    ]},
    { id: "share", icon: QrCodeIcon, title: "Share schedules (QR / code)", intro: "Admin → Share.", points: [
      "Create a share link for one or more rooms, with a QR and a quick-access code.",
      "Viewers open the link, scan the QR, or enter the code on the Room schedule page.",
      "Choose what's shown (lecturer / class IDs / course names) and whether login is required.",
    ]},
    { id: "lang", icon: LanguagesIcon, title: "Language & appearance", intro: "Quick controls in the nav bar.", points: [
      "The VI/EN button switches language instantly; the moon toggles light/dark.",
      "The app is installable (PWA) on phone/desktop.",
    ]},
  ],
};

export default function GuidePage() {
  const { t, lang } = useI18n();
  const sections = SECTIONS[lang] || SECTIONS.vi;

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t("guide.title")}</h1>
          <p className="text-default-500 mt-1 max-w-2xl">{t("guide.subtitle")}</p>
        </div>
        <GuideTour />
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
          {sections.map((s) => (
            <Card key={s.id} id={s.id} className="scroll-mt-24 p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                  <s.icon size={18} />
                </span>
                <h2 className="text-xl font-bold">{s.title}</h2>
              </div>
              {s.intro && <p className="text-default-600 mb-2">{s.intro}</p>}
              <ul className="list-disc pl-5 space-y-1 text-sm text-default-700">
                {s.points.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { Button } from "@heroui/react";
import { PlayCircleIcon } from "lucide-react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useI18n } from "@/i18n/I18nProvider";

// Bilingual tour content. Element-anchored steps target stable data-tour hooks
// on the persistent app shell (nav, help, language, bell) — all present on the
// /guide page, which renders inside the shell.
const CONTENT = {
  vi: {
    intro: { title: "Chào mừng đến Physoom 👋", description: "Hệ thống xem & đặt lịch phòng của Khoa Vật lý - Vật lý Kỹ thuật. Xem nhanh các khu vực chính." },
    nav: { title: "Thanh điều hướng", description: "Chuyển giữa Trang chủ, Thời khóa biểu, Lịch phòng và Quản trị (nếu bạn là admin)." },
    help: { title: "Nút Trợ giúp", description: "Bấm biểu tượng ? bất cứ lúc nào để mở lại trang hướng dẫn này." },
    lang: { title: "Đổi ngôn ngữ", description: "Chuyển Việt / Anh — toàn bộ giao diện dịch ngay lập tức." },
    bell: { title: "Thông báo", description: "Báo khi yêu cầu mượn phòng được duyệt/từ chối, hoặc khi có việc cần bạn duyệt." },
    outro: { title: "Xong! 🎉", description: "Cuộn xuống để đọc hướng dẫn chi tiết từng chức năng bên dưới." },
  },
  en: {
    intro: { title: "Welcome to Physoom 👋", description: "The room viewing & booking system for Physics & Engineering Physics. Here's a quick tour of the main areas." },
    nav: { title: "Navigation bar", description: "Switch between Home, Timetable, Room schedule and Admin (if you're an admin)." },
    help: { title: "Help button", description: "Click the ? icon anytime to reopen this guide." },
    lang: { title: "Change language", description: "Toggle Vietnamese / English — the whole UI translates instantly." },
    bell: { title: "Notifications", description: "Alerts when your room request is approved/rejected, or when something needs your approval." },
    outro: { title: "All set! 🎉", description: "Scroll down for the detailed, feature-by-feature guide." },
  },
};

// Page-specific tour for the Timetable (/booking) page.
const BOOKING_CONTENT = {
  vi: {
    intro: { title: "Thời khóa biểu của bạn 📅", description: "Nơi xem lịch cá nhân, lịch lớp và đăng ký mượn phòng cho sự kiện. Xem nhanh các khu vực chính." },
    sidebar: { title: "Học kỳ · Môn · Sự kiện", description: "Lọc theo học kỳ, chọn một môn để xem lịch của môn đó, hoặc mở \"My Events\" để xem các buổi mượn phòng của bạn." },
    tabs: { title: "Các khung xem", description: "Lịch cá nhân, Lịch phòng học, Lịch lớp và Đặt phòng sự kiện — chuyển qua lại tại đây." },
    outro: { title: "Cần thêm? 🎉", description: "Bấm biểu tượng ? trên thanh trên cùng để mở hướng dẫn đầy đủ." },
  },
  en: {
    intro: { title: "Your timetable 📅", description: "View your personal schedule, class schedule, and request rooms for events. Here's a quick tour." },
    sidebar: { title: "Term · Courses · Events", description: "Filter by term, pick a course to see its schedule, or open \"My Events\" to see your room requests." },
    tabs: { title: "The views", description: "Personal schedule, Classroom schedule, Class schedule and Event booking — switch between them here." },
    outro: { title: "Need more? 🎉", description: "Click the ? icon in the top bar for the full guide." },
  },
};

export default function GuideTour({ className, variant = "app", label, size, buttonVariant = "shadow", steps: customSteps }) {
  const { t, lang } = useI18n();

  const startTour = () => {
    let all;
    if (Array.isArray(customSteps) && customSteps.length) {
      // Caller-provided steps (already driver.js step objects, e.g. a page tour
      // that switches tabs via onHighlightStarted).
      all = customSteps;
    } else if (variant === "booking") {
      const c = BOOKING_CONTENT[lang] || BOOKING_CONTENT.vi;
      all = [
        { popover: c.intro },
        { element: '[data-tour="booking-sidebar"]', popover: { ...c.sidebar, side: "right", align: "center" } },
        { element: '[data-tour="booking-tabs"]', popover: { ...c.tabs, side: "bottom", align: "start" } },
        { element: '[data-tour="help"]', popover: { ...(CONTENT[lang] || CONTENT.vi).help, side: "bottom", align: "end" } },
        { popover: c.outro },
      ];
    } else {
      const c = CONTENT[lang] || CONTENT.vi;
      all = [
        { popover: c.intro },
        { element: '[data-tour="nav"]', popover: { ...c.nav, side: "bottom", align: "center" } },
        { element: '[data-tour="help"]', popover: { ...c.help, side: "bottom", align: "end" } },
        { element: '[data-tour="lang"]', popover: { ...c.lang, side: "bottom", align: "end" } },
        { element: '[data-tour="bell"]', popover: { ...c.bell, side: "bottom", align: "end" } },
        { popover: c.outro },
      ];
    }
    // Degrade gracefully: drop steps whose target isn't on the page (e.g. the
    // bell only exists when logged in; mobile hides desktop-only hooks).
    const steps = all.filter((s) => !s.element || document.querySelector(s.element));

    driver({
      showProgress: true,
      nextBtnText: t("tour.next"),
      prevBtnText: t("tour.prev"),
      doneBtnText: t("tour.done"),
      progressText: "{{current}}/{{total}}",
      steps,
    }).drive();
  };

  return (
    <Button
      color="secondary"
      variant={buttonVariant}
      size={size}
      startContent={<PlayCircleIcon size={18} />}
      onPress={startTour}
      className={className}
    >
      {label || t("guide.startTour")}
    </Button>
  );
}

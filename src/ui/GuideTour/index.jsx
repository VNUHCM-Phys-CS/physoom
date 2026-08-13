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
    nav: { title: "Thanh điều hướng", description: "Chuyển giữa Trang chủ, Đặt lịch, Lịch phòng và Quản trị (nếu bạn là admin)." },
    help: { title: "Nút Trợ giúp", description: "Bấm biểu tượng ? bất cứ lúc nào để mở lại trang hướng dẫn này." },
    lang: { title: "Đổi ngôn ngữ", description: "Chuyển Việt / Anh — toàn bộ giao diện dịch ngay lập tức." },
    bell: { title: "Thông báo", description: "Báo khi yêu cầu mượn phòng được duyệt/từ chối, hoặc khi có việc cần bạn duyệt." },
    outro: { title: "Xong! 🎉", description: "Cuộn xuống để đọc hướng dẫn chi tiết từng chức năng bên dưới." },
  },
  en: {
    intro: { title: "Welcome to Physoom 👋", description: "The room viewing & booking system for Physics & Engineering Physics. Here's a quick tour of the main areas." },
    nav: { title: "Navigation bar", description: "Switch between Home, Booking, Room schedule and Admin (if you're an admin)." },
    help: { title: "Help button", description: "Click the ? icon anytime to reopen this guide." },
    lang: { title: "Change language", description: "Toggle Vietnamese / English — the whole UI translates instantly." },
    bell: { title: "Notifications", description: "Alerts when your room request is approved/rejected, or when something needs your approval." },
    outro: { title: "All set! 🎉", description: "Scroll down for the detailed, feature-by-feature guide." },
  },
};

export default function GuideTour({ className }) {
  const { t, lang } = useI18n();

  const startTour = () => {
    const c = CONTENT[lang] || CONTENT.vi;
    const all = [
      { popover: c.intro },
      { element: '[data-tour="nav"]', popover: { ...c.nav, side: "bottom", align: "center" } },
      { element: '[data-tour="help"]', popover: { ...c.help, side: "bottom", align: "end" } },
      { element: '[data-tour="lang"]', popover: { ...c.lang, side: "bottom", align: "end" } },
      { element: '[data-tour="bell"]', popover: { ...c.bell, side: "bottom", align: "end" } },
      { popover: c.outro },
    ];
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
      variant="shadow"
      startContent={<PlayCircleIcon size={18} />}
      onPress={startTour}
      className={className}
    >
      {t("guide.startTour")}
    </Button>
  );
}

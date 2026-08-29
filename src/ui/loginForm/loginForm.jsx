"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@heroui/react";
import { GoogleGIcon } from "@/ui/icons/BrandIcons";
import { useI18n } from "@/i18n/I18nProvider";

// Cổng đăng nhập dùng chung: các app anh em (Offisoom, ACADsoom…) chuyển hướng
// người dùng tới đây qua /api/sso/authorize khi chưa đăng nhập. Vì vậy trang này
// PHẢI giữ nguyên `callbackUrl` để sau khi đăng nhập Google xong quay lại đúng
// điểm SSO (mint token rồi trả về app gọi), thay vì rơi về "/".
const LoginForm = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [error, setError] = useState("");

  // Đọc callbackUrl + error từ URL ở client (tránh ràng buộc Suspense của
  // useSearchParams). `error=AccessDenied` là khi khóa danh sách chặn đăng nhập.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const cb = q.get("callbackUrl");
      if (cb) setCallbackUrl(cb);
      if (q.get("error")) setError(q.get("error"));
    } catch {
      /* noop */
    }
  }, []);

  const errorMessage =
    error === "AccessDenied"
      ? "Tài khoản này chưa có trong danh sách của Khoa nên không thể đăng nhập. Vui lòng liên hệ quản trị để được thêm."
      : error
      ? "Đăng nhập không thành công. Vui lòng thử lại."
      : "";

  const handleGoogle = async () => {
    setLoading(true);
    // prompt: 'select_account' → luôn cho chọn tài khoản, tránh dính nhầm phiên cũ.
    await signIn("google", { callbackUrl }, { prompt: "select_account" });
  };

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-2xl border border-default-200 bg-content1 shadow-xl">
      {/* Dải thương hiệu */}
      <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-primary-50 to-transparent px-8 pt-8 pb-5 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icon-192.png"
          alt="Physoom"
          width={60}
          height={60}
          className="rounded-2xl shadow-sm"
        />
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-primary">Physoom</h1>
          <p className="text-[12.5px] text-default-500">
            Khoa Vật lý – Vật lý Kỹ thuật · VNU-HCMUS
          </p>
        </div>
      </div>

      {/* Nội dung đăng nhập */}
      <div className="flex flex-col gap-5 px-8 pb-8 pt-2 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-foreground">{t("auth.login")}</h2>
          <p className="text-[13px] leading-relaxed text-default-500">
            Dùng tài khoản Google của Trường (HCMUS) để tiếp tục.
          </p>
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-left text-[12.5px] leading-relaxed text-danger-600">
            {errorMessage}
          </div>
        ) : null}

        <Button
          onPress={handleGoogle}
          isLoading={loading}
          size="lg"
          variant="bordered"
          className="h-12 w-full border-default-300 bg-content1 font-semibold hover:bg-default-100"
          startContent={!loading ? <GoogleGIcon size={20} /> : null}
        >
          Đăng nhập bằng Google
        </Button>

        <p className="text-[11.5px] leading-relaxed text-default-400">
          Đây là cổng đăng nhập dùng chung cho các ứng dụng của Khoa. Chỉ tài khoản
          có trong danh sách của Khoa mới đăng nhập được — nếu chưa có, vui lòng liên
          hệ quản trị.
        </p>
      </div>
    </div>
  );
};

export default LoginForm;

"use client";

import { register } from '@/lib/action';
import styles from "./registerForm.module.css";
import { useFormState } from "react-dom";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

const RegisterForm = () => {
  const [state, formAction] = useFormState(register, undefined);
  const { t } = useI18n();

  const router = useRouter();

  useEffect(() => {
    state?.success && router.push("/login");
  }, [state?.success, router]);

  return (
    <form className={styles.form} action={formAction}>
      <input type="text" placeholder={t("auth.username")} name="username" />
      <input type="email" placeholder={t("auth.email")} name="email" />
      <input type="password" placeholder={t("auth.password")} name="password" />
      <input
        type="password"
        placeholder={t("auth.passwordAgain")}
        name="passwordRepeat"
      />
      <button>{t("auth.register")}</button>
      {state?.error}
      <Link href="/login">
        {t("auth.haveAccount")} <b>{t("auth.login")}</b>
      </Link>
    </form>
  );
};

export default RegisterForm;
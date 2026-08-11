"use client";

import { login } from "@/lib/action";
import { useFormState } from "react-dom";
import Link from "next/link";
import { useI18n } from "@/i18n/I18nProvider";

const LoginForm = () => {
  const [state, formAction] = useFormState(login, undefined);
  const { t } = useI18n();

  return (
    <form className="form" action={formAction}>
      {/* <input type="text" placeholder="username" name="username" />
      <input type="password" placeholder="password" name="password" /> */}
      <button className="btn ">{t("auth.login")}</button>
      {/* {state?.error}
      <Link href="/register">
        {"Don't have an account?"} <b>Register</b>
      </Link> */}
    </form>
  );
};

export default LoginForm;

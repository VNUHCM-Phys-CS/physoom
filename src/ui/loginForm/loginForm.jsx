"use client";

import { login } from "@/lib/action";
import { useFormState } from "react-dom";
import Link from "next/link";

const LoginForm = () => {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <form className="form" action={formAction}>
      {/* <input type="text" placeholder="username" name="username" />
      <input type="password" placeholder="password" name="password" /> */}
      <button className="btn ">Login</button>
      {/* {state?.error}
      <Link href="/register">
        {"Don't have an account?"} <b>Register</b>
      </Link> */}
    </form>
  );
};

export default LoginForm;

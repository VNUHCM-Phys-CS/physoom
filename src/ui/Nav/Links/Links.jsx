"use client";
import { handleLogout } from "@/lib/action";
import NavLink from "../NavLink/NavLink";
import { useFormState } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const Links = ({ session }) => {
  const [state, formAction] = useFormState(handleLogout, undefined);
  const router = useRouter();
  useEffect(() => {
    state?.success && router.push("/");
  }, [state?.success, router]);
  return (
    <div className="flex justify-between px-10">
      <div className="flex">
        <NavLink item={{ title: "Home", path: "/" }} />
        <NavLink item={{ title: "Booking", path: "/booking" }} />
        {session?.user?.isAdmin && (
          <NavLink item={{ title: "Admin Dashboard", path: "/admin" }} />
        )}
        <NavLink item={{ title: "About", path: "/about" }} />
      </div>
      <div className="flex">
        {session?.user ? (
          <>
            <form action={formAction}>
              <button className="navLink !font-bold cursor-pointer" type="submit">
                Logout
              </button>
            </form>
          </>
        ) : (
          <NavLink item={{ title: "Login", path: "/login" }} />
        )}
      </div>
    </div>
  );
};

export default Links;

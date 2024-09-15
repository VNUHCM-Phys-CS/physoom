import NavLink from "../NavLink/NavLink";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";

const Links = ({ session }) => {
  const router = useRouter();
  return (
    <div className="flex justify-between px-10">
      <div className="flex">
        <NavLink item={{ title: "Home", path: "/" }} />
        {session?.user && (
          <>
            <NavLink item={{ title: "Booking", path: "/booking" }} />
          </>
        )}
        <NavLink item={{ title: "Room Schedule", path: "/view/room" }} />
        {session?.user?.isAdmin && (
          <NavLink item={{ title: "Admin Dashboard", path: "/admin" }} />
        )}
        <NavLink item={{ title: "About", path: "/about" }} />
      </div>
      <div className="flex">
        {session?.user ? (
          <>
            <button
              className="navLink !font-bold cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              Logout
            </button>
          </>
        ) : (
          // <NavLink item={{ title: "Login", path: "/login" }} />
          <button
            className="navLink !font-bold cursor-pointer"
            onClick={() => signIn("google")}
          >
            Login
          </button>
        )}
      </div>
    </div>
  );
};

export default Links;

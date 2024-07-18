"use client";
import { handleLogout } from "@/lib/action";
import NavLink from "../NavLink/NavLink";

const Links = ({session}) => {
    return <div className="flex justify-between px-10">
        <div className="flex">
            <NavLink item={{ title: "Home", path: "/" }} />
            <NavLink item={{ title: "Presentation List", path: "/list" }} />
            <NavLink item={{ title: "Now", path: "/now" }} />
        </div>
        <div className="flex">
            {session?.user ? (
            <>
                {session.user?.isAdmin && <NavLink item={{ title: "Admin", path: "/admin" }} />}
                <form action={handleLogout}>
                    <button className="navLink !font-bold cursor-pointer">Logout</button>
                </form>
            </>
            ) : (
            <NavLink item={{ title: "Login", path: "/login" }} />
            )}
        </div>
    </div>
}

export default Links;
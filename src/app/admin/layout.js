"use client";
import NavLink from "@/ui/Nav/NavLink/NavLink";
export default function Layout({ children, course, room, booking }) {
  return (
    <div className="md:container md:mx-auto flex-col max-h-dvh">
      <div className=" flex-row justify-between shadow-xl bg-white rounded-md py-2 px-4 mx-auto">
        <NavLink item={{ title: "Course", path: "/admin/course" }} />

        <NavLink item={{ title: "Room", path: "/admin/room" }} />

        <NavLink item={{ title: "Booking Request", path: "/admin/booking" }} />
      </div>
      <div className="p-2 mt-5">{children}</div>
    </div>
  );
}

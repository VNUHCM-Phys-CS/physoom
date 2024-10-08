"use client";
import NavLink from "@/ui/Nav/NavLink/NavLink";
import { useRouter } from 'next/navigation';
import { useSession } from "next-auth/react";
import { useEffect } from "react";
export default function Layout({ children, course, room, booking }) {
  const router = useRouter();
  const data = useSession();
  const {data:session,status} = data;
  useEffect(() => {
    if (status!=='loading'){
        // Example: Redirect after some condition is met
        const shouldRedirect = !session || (session && (!session.isAdmin)); // Replace with your condition
        if (shouldRedirect) {
          router.push('/');
        }
    }
  }, [router,session, status]);
  if (!session)
    return (<p>You need to be signed in to view this page. Redirecting...</p>);
  return (
    <div className="md:container md:mx-auto flex-col max-h-dvh">
      <div className=" flex-row justify-between shadow-xl bg-white rounded-md py-2 px-4 mx-auto">
        <NavLink item={{ title: "Dashboard", path: "/admin" }} />
        <NavLink item={{ title: "Course", path: "/admin/course" }} />
        <NavLink item={{ title: "Room", path: "/admin/room" }} />
        <NavLink item={{ title: "Booking Request", path: "/admin/booking" }} />
        <NavLink item={{ title: "View Share", path: "/admin/view-share" }} />
      </div>
      <div className="p-2 mt-5">{children}</div>
    </div>
  );
}

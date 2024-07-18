"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavLink ({item,className}){
    const pathName = usePathname();
    return (
        <Link
          href={item.path}
          className={`navLink ${
            pathName === item.path && `underline-offset-1`
          } ${className}`}
        >
          {item.title}
        </Link>
      );
}
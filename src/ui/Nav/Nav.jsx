"use client";
import React from "react";
import { useSession } from "next-auth/react";
import Links from "./Links/Links";
import "./Nav.scss";

const Nav = () => {
  const { data: session } = useSession();
  return (
    <div className="md:container md:mx-auto">
      <div className="p-5">
        <Links session={session} />
      </div>
    </div>
  );
};

export default Nav;

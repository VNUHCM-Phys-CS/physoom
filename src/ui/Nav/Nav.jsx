import React from "react";
import { auth } from "@/lib/auth";
import Links from "./Links/Links";
import "./Nav.css";

const Nav = async () => {
  const session = await auth();
  return (
    <div className="md:container md:mx-auto">
      <div className="p-5">
        <Links session={session} />
      </div>
    </div>
  );
};

export default Nav;

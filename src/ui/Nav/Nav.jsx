"use client";
import React from "react";
import { useSession } from "next-auth/react";
import Links from "./Links/Links";
import "./Nav.scss";

const Nav = () => {
  const { data: session } = useSession();
  return <Links session={session} />;
};

export default Nav;

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { authConfig } from "./lib/auth.config";

const secret = process.env.NEXTAUTH_SECRET;
const { auth } = NextAuth(authConfig);
export default auth(
  async function middleware(req) {
  // console.log("authorization:", req.headers.authorization?.split(" ")[1]);
  // const token = await getToken({
  //   req,
  //   secret,
  // });
  // console.log(token);
  // // console.log("Test middleware on server", token);
  // const isAdmin = token?.isAdmin;
  // // 1. Specify protected and public routes
  // const isNeededAdmin = req.nextUrl?.pathname.startsWith("/admin");
  // // 5. Redirect to /login if the user is not authenticated
  // if (isNeededAdmin && !isAdmin) {
  //   return NextResponse.redirect(new URL("/", req.nextUrl));
  // }

  // if (token) {
  //   // Clone the request to modify headers
  //   const modifiedRequest = req.clone({
  //     headers: {
  //       ...req.headers,
  //       Authorization: `Bearer ${token}`,
  //     },
  //   });
  //   return NextResponse.next({
  //     request: {
  //       headers: modifiedRequest.headers,
  //     },
  //   });
  // }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next).*)"],
};

// FOR MORE INFORMATION CHECK: https://nextjs.org/docs/app/building-your-application/routing/middleware

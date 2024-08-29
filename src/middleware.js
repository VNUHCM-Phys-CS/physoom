import NextAuth from "next-auth";
import { getSession } from "next-auth/react";
import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
const secret = process.env.NEXTAUTH_SECRET;
// const { auth } = NextAuth(authConfig);

// export default auth(async function middleware(req) {
//   // Your custom middleware logic goes here
//   const token = await getToken({ req, secret });
//   if (token) {
//     // Clone the request to modify headers
//     const modifiedRequest = req.clone({
//       headers: {
//         ...req.headers,
//         Authorization: `Bearer ${token}`,
//       },
//     });
//     return NextResponse.next({
//       request: {
//         headers: modifiedRequest.headers,
//       },
//     });
//   }
// });

export async function middleware(req) {
  const token = await getToken({
    req,
    secret,
    cookieName: "next-auth.session-token",
  });
  console.log("Test middleware on server", token);
  const isAdmin = token?.isAdmin;
  // 1. Specify protected and public routes
  const isNeededAdmin = req.nextUrl?.pathname.startsWith("/admin");
  // 5. Redirect to /login if the user is not authenticated
  if (isNeededAdmin && !isAdmin) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (token) {
    // Clone the request to modify headers
    const modifiedRequest = req.clone({
      headers: {
        ...req.headers,
        Authorization: `Bearer ${token}`,
      },
    });
    return NextResponse.next({
      request: {
        headers: modifiedRequest.headers,
      },
    });
  }
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next).*)"],
};

// FOR MORE INFORMATION CHECK: https://nextjs.org/docs/app/building-your-application/routing/middleware

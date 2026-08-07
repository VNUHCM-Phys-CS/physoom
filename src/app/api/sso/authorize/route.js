// SSO authorize endpoint — makes Physoom a lightweight identity provider for
// Offisoom (a separate app/repo). Flow:
//   1. Offisoom redirects the browser here with ?redirect_uri=&state=
//   2. If the user isn't logged into Physoom, send them through Physoom's normal
//      Google sign-in, then return here.
//   3. Once authenticated, mint a short-lived signed token and 302 back to
//      Offisoom's redirect_uri with ?token=&state=.
// Only additive: does not touch any existing Physoom behaviour.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signSsoToken } from "@/lib/ssoToken";

export const dynamic = "force-dynamic";

export const GET = async (request) => {
  const { searchParams, origin } = new URL(request.url);
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state") || "";

  if (!redirectUri) {
    return NextResponse.json({ error: "missing redirect_uri" }, { status: 400 });
  }

  let target;
  try {
    target = new URL(redirectUri);
  } catch {
    return NextResponse.json({ error: "invalid redirect_uri" }, { status: 400 });
  }

  // Allowlist: comma-separated origins in OFFISOOM_ORIGIN.
  const allow = (process.env.OFFISOOM_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const okOrigin = allow.some((a) => {
    try {
      return new URL(a).origin === target.origin;
    } catch {
      return false;
    }
  });
  if (!okOrigin) {
    return NextResponse.json({ error: "redirect_uri not allowed" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    // Not logged in → run Physoom's sign-in, then return to this same URL.
    const signInUrl = new URL("/api/auth/signin", origin);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  const secret = process.env.OFFISOOM_SSO_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "SSO not configured" }, { status: 500 });
  }

  const token = signSsoToken(
    {
      email: session.user.email,
      name: session.user.name || "",
      teacher_id: session.user.teacher_id ?? session.teacher_id ?? null,
      isAdmin: !!(session.user.isAdmin ?? session.isAdmin),
    },
    secret,
    120
  );

  target.searchParams.set("token", token);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target);
};

// SSO authorize endpoint — makes Physoom a lightweight identity provider for the
// sibling apps (Offisoom, ACADsoom), each a separate repo/database. Flow:
//   1. The client redirects the browser here with ?client=&redirect_uri=&state=
//   2. If the user isn't logged into Physoom, send them through Physoom's normal
//      sign-in, then return here.
//   3. Once authenticated, mint a short-lived token signed with THAT client's
//      secret and 302 back to its redirect_uri with ?token=&state=.
//
// Per-client secrets (see src/lib/ssoClients.js) mean a token minted for one app
// cannot be replayed against another. Omitting ?client= still behaves exactly as
// before — it resolves to "offisoom".
// Only additive: does not touch any existing Physoom behaviour.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signSsoToken } from "@/lib/ssoToken";
import { ssoClient, originAllowed } from "@/lib/ssoClients";

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

  const client = ssoClient(searchParams.get("client"));
  if (!client) {
    return NextResponse.json({ error: "unknown client" }, { status: 400 });
  }
  if (!originAllowed(client, target)) {
    return NextResponse.json({ error: "redirect_uri not allowed" }, { status: 403 });
  }

  const session = await auth();
  if (!session?.user?.email) {
    // Not logged in → send to Physoom's branded sign-in page, then return here.
    const signInUrl = new URL("/login", origin);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  if (!client.secret) {
    return NextResponse.json(
      { error: `SSO not configured for ${client.name}` },
      { status: 500 }
    );
  }

  const token = signSsoToken(
    {
      // `aud` lets the receiving app reject a token minted for a different
      // client even if the two ever shared a secret by mistake.
      aud: client.name,
      // `sub` là _id của user bên Physoom — định danh bất biến. App nhận nên
      // khoá hồ sơ vào đây; email đổi thì hồ sơ vẫn là một, không sinh bản sao.
      sub: String(session.user.id ?? session.user._id ?? ""),
      email: session.user.email,
      name: session.user.name || "",
      teacher_id: session.user.teacher_id ?? session.teacher_id ?? null,
      isAdmin: !!(session.user.isAdmin ?? session.isAdmin),
    },
    client.secret,
    120
  );

  target.searchParams.set("token", token);
  if (state) target.searchParams.set("state", state);
  return NextResponse.redirect(target);
};

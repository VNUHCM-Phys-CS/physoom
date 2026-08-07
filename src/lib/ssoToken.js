// Minimal, dependency-free HS256 JWT signer for the Physoom→Offisoom SSO
// handshake. After Physoom authenticates the user it signs a short-lived token
// with the shared OFFISOOM_SSO_SECRET; Offisoom verifies it on its side.
// Kept self-contained so it adds no new npm dependency to Physoom.
import crypto from "crypto";

const b64url = (input) =>
  Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const b64urlJson = (obj) => b64url(JSON.stringify(obj));

export function signSsoToken(payload, secret, expSeconds = 120) {
  if (!secret) throw new Error("Missing SSO secret");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expSeconds };
  const data = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

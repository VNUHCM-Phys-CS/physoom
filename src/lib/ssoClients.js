// Registry of the sibling apps that Physoom acts as identity provider for.
//
// Each client gets its own env pair, so a leaked secret in one app never lets it
// mint tokens for another:
//
//   <CLIENT>_SSO_SECRET   ký token SSO (đăng nhập)
//   <CLIENT>_ORIGIN       allowlist redirect_uri, nhiều origin cách nhau bởi dấu phẩy
//   <CLIENT>_SYNC_SECRET  bảo vệ các endpoint /api/integration/* của client đó
//
// Ví dụ: OFFISOOM_SSO_SECRET, ACADSOOM_ORIGIN, ACADSOOM_SYNC_SECRET.
//
// SSO_CLIENTS giới hạn tên client được chấp nhận. Tên client đi vào tên biến môi
// trường, nên nó PHẢI nằm trong allowlist — nếu không, một redirect_uri lạ có thể
// dò được các biến khác của tiến trình.
const CLIENT_NAME = /^[a-z][a-z0-9]{1,31}$/;
const DEFAULT_CLIENTS = "offisoom,acadsoom";

const list = (v) =>
  String(v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function knownClients() {
  return list(process.env.SSO_CLIENTS || DEFAULT_CLIENTS).map((s) => s.toLowerCase());
}

// Trả về null nếu tên client không hợp lệ hoặc không nằm trong allowlist.
export function ssoClient(name) {
  // Không có tham số `client` nghĩa là Offisoom bản cũ — giữ nguyên hành vi trước đây.
  const client = String(name || "offisoom").toLowerCase();
  if (!CLIENT_NAME.test(client) || !knownClients().includes(client)) return null;

  const KEY = client.toUpperCase();
  return {
    name: client,
    secret: process.env[`${KEY}_SSO_SECRET`] || "",
    syncSecret: process.env[`${KEY}_SYNC_SECRET`] || "",
    origins: list(process.env[`${KEY}_ORIGIN`]),
  };
}

// redirect_uri phải trùng origin với một mục trong allowlist của chính client đó.
export function originAllowed(client, target) {
  return client.origins.some((a) => {
    try {
      return new URL(a).origin === target.origin;
    } catch {
      return false;
    }
  });
}

// Guard cho /api/integration/*: header x-<client>-secret phải khớp <CLIENT>_SYNC_SECRET.
// Trả về client đã xác thực, hoặc null.
export function authIntegration(request, name) {
  const client = ssoClient(name);
  if (!client || !client.syncSecret) return null;
  const sent = request.headers.get(`x-${client.name}-secret`);
  if (!sent || sent !== client.syncSecret) return null;
  return client;
}

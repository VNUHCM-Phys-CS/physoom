import webpush from "web-push";
import PushSubscription from "@/models/pushSubscription";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

/**
 * Send a web-push notification to every subscription of the given recipients.
 * Best-effort: prunes dead subscriptions, never throws.
 */
export async function sendPush(recipients, payload) {
  if (!ensureConfigured()) return; // VAPID keys not set — silently skip
  const list = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean))];
  if (!list.length) return;

  const subs = await PushSubscription.find({ recipient: { $in: list } }).lean();
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          body
        );
      } catch (err) {
        // 404/410 → subscription gone; remove it.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: s.endpoint }).catch(() => {});
        }
      }
    })
  );
}

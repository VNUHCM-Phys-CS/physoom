import Notification from "@/models/notification";
import { sendPush } from "@/lib/push";

/**
 * Create one in-app notification per recipient AND send a web-push so the OS
 * shows a popup (like Zalo/Facebook). Deduplicates recipients, drops empty
 * emails, and never throws — notifications are best-effort.
 */
export async function notify(recipients, { title, message = "", link = "", type = "info", event } = {}) {
  const list = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean))];
  if (!list.length || !title) return;
  try {
    await Notification.insertMany(
      list.map((recipient) => ({ recipient, title, message, link, type, event }))
    );
  } catch (err) {
    console.error("notify (db) failed:", err);
  }
  // Best-effort OS push (no-op if VAPID keys aren't configured).
  await sendPush(list, { title, message, link, tag: String(event || title) });
}

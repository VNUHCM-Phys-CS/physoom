import Notification from "@/models/notification";

/**
 * Create one notification per recipient. Deduplicates recipients and drops
 * empty/undefined emails. Never throws — notifications are best-effort.
 */
export async function notify(recipients, { title, message = "", link = "", type = "info", event } = {}) {
  try {
    const list = [...new Set((Array.isArray(recipients) ? recipients : [recipients]).filter(Boolean))];
    if (!list.length || !title) return;
    await Notification.insertMany(
      list.map((recipient) => ({ recipient, title, message, link, type, event }))
    );
  } catch (err) {
    console.error("notify failed:", err);
  }
}

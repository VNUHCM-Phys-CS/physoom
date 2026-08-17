// Google Calendar integration: link a user's Google account (OAuth) and push
// their Physoom schedule (approved classes + event bookings) into a dedicated
// "Physoom" calendar. One-way sync (Physoom → Google) with full reconciliation:
// changes/cancellations on Physoom are reflected in Google.
import { google } from "googleapis";
import { unstable_after as after } from "next/server";
import moment from "moment";
import CalendarEvent from "@/models/calendarEvent";
import User from "@/models/user";
import "@/models/course";
import "@/models/room";
import { connectToDb } from "@/lib/mongodb";

const CLIENT_ID = process.env.NEXT_GOOGLE_ID;
const CLIENT_SECRET = process.env.NEXT_GOOGLE_SECRET;
const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar"];
const CAL_NAME = "Physoom";
const TAG = "physoom"; // extendedProperties.private.physoomSource

export function isGoogleConfigured() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

function baseUrl() {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function oauthClient() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, `${baseUrl()}/api/google/callback`);
}

/** Consent URL — offline + consent so we always get a refresh token. */
export function googleAuthUrl(state) {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/** Exchange the OAuth code, store the refresh token + ensure a Physoom calendar. */
export async function connectGoogle(code, email) {
  await connectToDb();
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) throw new Error("No refresh token returned (revoke access and retry with prompt=consent).");
  client.setCredentials(tokens);

  const calendarId = await ensureCalendar(client);
  await User.updateOne(
    { email },
    { $set: { "google.refreshToken": refreshToken, "google.calendarId": calendarId, "google.connectedAt": new Date() } }
  );
  return { calendarId };
}

export async function disconnectGoogle(email) {
  await connectToDb();
  await User.updateOne({ email }, { $unset: { google: "" } });
}

/** Find (or create) the dedicated "Physoom" secondary calendar. */
async function ensureCalendar(authClient) {
  const cal = google.calendar({ version: "v3", auth: authClient });
  const list = await cal.calendarList.list({ maxResults: 250 });
  const found = (list.data.items || []).find((c) => c.summary === CAL_NAME && c.accessRole === "owner");
  if (found) return found.id;
  const created = await cal.calendars.insert({
    requestBody: { summary: CAL_NAME, description: "Lịch giảng dạy & sự kiện đồng bộ từ Physoom", timeZone: "Asia/Ho_Chi_Minh" },
  });
  return created.data.id;
}

/** Build a Google event body from a Physoom CalendarEvent. */
function toGoogleEvent(ev) {
  const cls = Array.isArray(ev.course?.class_id) ? ev.course.class_id.filter(Boolean).join(", ") : ev.course?.class_id || "";
  const name = ev.course?.title || ev.title || "Sự kiện";
  const room = ev.room?.title || "";
  const summary = [name, cls, room].filter(Boolean).join(" · ");
  const desc = [
    ev.course?.title ? `Môn: ${ev.course.title}` : null,
    cls ? `Lớp: ${cls}` : null,
    room ? `Phòng: ${room}` : null,
    (ev.teacher_email || []).length ? `Giảng viên: ${(ev.teacher_email || []).join(", ")}` : null,
  ].filter(Boolean).join("\n");
  return {
    summary,
    description: desc,
    location: room,
    start: { dateTime: new Date(ev.start).toISOString(), timeZone: "Asia/Ho_Chi_Minh" },
    end: { dateTime: new Date(ev.end).toISOString(), timeZone: "Asia/Ho_Chi_Minh" },
    extendedProperties: { private: { physoomSource: TAG, physoomId: String(ev._id) } },
  };
}

/**
 * All approved events that belong to a user — the same set their personal
 * calendar shows (classes they teach + meetings/events they host or are invited
 * to), minus holidays/terms. A single $or on teacher/host/attendees matches how
 * the personal calendar fetches, so no event type is accidentally dropped.
 */
async function userEvents(email) {
  return CalendarEvent.find({
    type: { $nin: ["holiday", "term"] },
    status: "approved",
    isCancelled: { $ne: true },
    $or: [{ teacher_email: email }, { host: email }, { attendees: email }],
  })
    .populate("course room")
    .lean();
}

/**
 * Reconcile a user's Physoom schedule into their Physoom Google calendar:
 * insert new, patch changed, delete removed. Returns counts.
 */
export async function syncUserToGoogle(email) {
  if (!isGoogleConfigured()) return { skipped: "not-configured" };
  await connectToDb();
  const user = await User.findOne({ email }, "google").lean();
  const refreshToken = user?.google?.refreshToken;
  const calendarId = user?.google?.calendarId;
  if (!refreshToken || !calendarId) return { skipped: "not-connected" };

  const client = oauthClient();
  client.setCredentials({ refresh_token: refreshToken });
  const cal = google.calendar({ version: "v3", auth: client });

  // Existing Physoom-tagged Google events → map physoomId → googleEventId.
  const existing = new Map();
  let pageToken;
  do {
    const res = await cal.events.list({
      calendarId,
      privateExtendedProperty: [`physoomSource=${TAG}`],
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    });
    (res.data.items || []).forEach((it) => {
      const pid = it.extendedProperties?.private?.physoomId;
      if (pid) existing.set(pid, it.id);
    });
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  const evs = await userEvents(email);
  const seen = new Set(evs.map((ev) => String(ev._id)));
  const counts = { inserted: 0, updated: 0, deleted: 0 };

  // Run Google API calls with bounded concurrency so a full re-sync (dozens of
  // sessions) doesn't run for tens of seconds and hit the serverless timeout.
  const runPool = async (items, worker, limit = 6) => {
    let i = 0;
    const next = async () => {
      while (i < items.length) {
        const item = items[i++];
        try {
          await worker(item);
        } catch (e) {
          console.error("gcal op failed:", e?.message);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  };

  // Insert new / patch changed events.
  await runPool(evs, async (ev) => {
    const pid = String(ev._id);
    const body = toGoogleEvent(ev);
    const gid = existing.get(pid);
    if (gid) {
      await cal.events.patch({ calendarId, eventId: gid, requestBody: body });
      counts.updated++;
    } else {
      await cal.events.insert({ calendarId, requestBody: body });
      counts.inserted++;
    }
  });

  // Delete Google events that no longer exist in Physoom.
  const stale = [...existing].filter(([pid]) => !seen.has(pid));
  await runPool(stale, async ([, gid]) => {
    await cal.events.delete({ calendarId, eventId: gid });
    counts.deleted++;
  });

  return { ...counts, total: evs.length };
}

/**
 * Sync a set of emails to Google AFTER the response is sent. Uses Next's
 * post-response hook so the work runs to completion on Vercel serverless
 * (a bare fire-and-forget gets killed when the handler returns). Falls back to
 * inline best-effort if the hook isn't available.
 */
export function syncEmailsInBackground(emails) {
  const uniq = [...new Set((emails || []).filter(Boolean))];
  if (!uniq.length) return;
  const run = async () => {
    for (const email of uniq) {
      try {
        await syncUserToGoogle(email);
      } catch (e) {
        console.error("bg sync failed:", email, e?.message);
      }
    }
  };
  try {
    after(run);
  } catch {
    // after() unavailable outside a request scope — best effort.
    run();
  }
}

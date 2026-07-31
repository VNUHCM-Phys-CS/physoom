// Minimal service worker — enables installability (PWA) and a network-first
// fetch so the app keeps working. No aggressive caching to avoid serving stale
// pages after a deploy.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Pass through to the network (default behaviour); presence of the handler
  // is what makes the app installable.
});

// Service worker: enables installability (PWA) and web-push notifications.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Show an OS notification when a push arrives (works even when the app/tab is
// closed, as long as the browser is running).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Physoom", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Physoom";
  const options = {
    body: data.message || data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: data.tag || undefined,
    renotify: false,
    data: { link: data.link || "/" },
  };
  // Don't pop an OS notification when the app is already open & visible — the
  // in-app bell already shows it, otherwise the user sees it TWICE (OS popup +
  // in-app). Only show the OS notification when no tab is focused/visible.
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const visible = clients.some((c) => c.visibilityState === "visible" || c.focused);
      if (visible) return;
      return self.registration.showNotification(title, options);
    })()
  );
});

// Focus an existing tab (or open one) and navigate to the notification's link.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(link).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});

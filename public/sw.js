// public/sw.js
self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/icons/icon-192x192.png",
    badge: data.badge || "/icons/badge-72x72.png",
    data: data.data,
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    tag: "low-stock-alert",
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "view") {
    event.waitUntil(
      clients.openWindow(
        event.notification.data.url || "/parts/priority-actions"
      )
    );
  } else if (event.action === "dismiss") {
    // Just close the notification
    console.log("Notification dismissed");
  } else {
    // Default action when clicking notification body
    event.waitUntil(
      clients.openWindow(
        event.notification.data.url || "/parts/priority-actions"
      )
    );
  }
});

self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then(function (subscription) {
        // Resubscribe and send new subscription to server
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
      })
  );
});

// lib/push-notifications.ts
import * as webpush from "web-push";

// Generate VAPID keys (run once and add to .env)
// npx web-push generate-vapid-keys

const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

// Only set VAPID details if both keys are available
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    "mailto:abdulsaboor.saboor2024@gmail.com",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} else {
  console.warn("VAPID keys not found. Push notifications will be disabled.");
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function sendPushNotification(
  subscription: PushSubscription,
  title: string,
  body: string,
  data?: any
) {
  try {
    // Check if VAPID keys are configured
    if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
      console.warn("Push notifications disabled: VAPID keys not configured");
      return false;
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/badge-72x72.png",
      data: {
        url: "/parts/priority-actions",
        ...data,
      },
      actions: [
        {
          action: "view",
          title: "مشاهده",
        },
        {
          action: "dismiss",
          title: "بستن",
        },
      ],
    });

    await webpush.sendNotification(subscription, payload);
    console.log("Push notification sent successfully");
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);

    // Check if subscription is expired/invalid
    if (typeof error === "object" && error !== null && "statusCode" in error) {
      const errorWithStatus = error as { statusCode?: number };
      if (
        errorWithStatus.statusCode === 410 ||
        errorWithStatus.statusCode === 404
      ) {
        // Mark subscription as invalid in database
        await deleteInvalidSubscription(subscription);
      }
    }
    return false;
  }
}

// Send to multiple users
export async function sendBulkPushNotifications(
  subscriptions: PushSubscription[],
  title: string,
  body: string,
  data?: any
) {
  // Check if VAPID keys are configured
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    console.warn("Push notifications disabled: VAPID keys not configured");
    return { successful: 0, failed: 0, disabled: true };
  }

  const results = await Promise.allSettled(
    subscriptions.map((sub) => sendPushNotification(sub, title, body, data))
  );

  const successful = results.filter(
    (result) => result.status === "fulfilled" && result.value
  ).length;
  const failed = results.length - successful;

  console.log(`Push notifications: ${successful} successful, ${failed} failed`);
  return { successful, failed, disabled: false };
}

// Helper function to delete invalid subscriptions
async function deleteInvalidSubscription(subscription: PushSubscription) {
  // You'll implement this based on your database structure
  console.log("Deleting invalid subscription:", subscription.endpoint);
}

import webpush from 'web-push';
import { db } from './db.js';

export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAWzSAmrANX41jHCprpizhTRAfeZSbdamfs1Op9mjNYtlRFUOsgUh5VjvMCOtwIhucGK6Z_6sGQSgWEDYi7RO7Q';
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'pIuUxqX-Y5ncnhjLFbZ1V4ZToR9Kb9awYCMjpaFLbUU';
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@lovecare.app';

try {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[WebPush] VAPID details configured successfully.');
} catch (e) {
  console.warn('[WebPush] VAPID configuration error:', e.message);
}

/**
 * Send a web push notification to a single PushSubscription
 */
export async function sendPushNotification(subscription, payload) {
  if (!subscription || !subscription.endpoint) return false;

  const pushPayload = JSON.stringify({
    title: payload.title || 'LoveCare',
    body: payload.body || '',
    tag: payload.tag || `lovecare-${Date.now()}`,
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    url: payload.url || '/',
    data: {
      url: payload.url || '/'
    }
  });

  const options = {
    TTL: 86400, // 24 hours
    urgency: 'high' // Highest priority for immediate delivery to iOS lock screen
  };

  try {
    await webpush.sendNotification(subscription, pushPayload, options);
    console.log(`[WebPush] Sent push notification successfully: "${payload.title}" to ${subscription.endpoint.slice(0, 40)}...`);
    return true;
  } catch (err) {
    console.warn(`[WebPush] Push delivery error (${err.statusCode || err.code}):`, err.message);
    // If endpoint is expired or unsubscribed (HTTP 410 or 404), clean it up
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[WebPush] Cleaning up expired push subscription: ${subscription.endpoint.slice(0, 40)}...`);
      db.removePushSubscription(subscription.endpoint);
    }
    return false;
  }
}

/**
 * Send push notification to all devices registered to a specific user
 */
export async function sendPushToUser(userId, payload) {
  if (!userId) return;
  const subscriptions = db.getSubscriptionsForUser(userId);
  if (!subscriptions || subscriptions.length === 0) {
    console.log(`[WebPush] No push subscriptions found for user: ${userId}`);
    return;
  }

  console.log(`[WebPush] Dispatching push to ${subscriptions.length} device(s) for user: ${userId}`);
  return Promise.allSettled(
    subscriptions.map((subRecord) => sendPushNotification(subRecord.subscription, payload))
  );
}

/**
 * Send push notification to all devices in a couple room
 */
export async function sendPushToCouple(coupleId, payload, excludeUserId = null) {
  if (!coupleId) return;
  const subscriptions = db.getSubscriptionsForCouple(coupleId);
  const targets = excludeUserId
    ? subscriptions.filter((s) => s.userId !== excludeUserId)
    : subscriptions;

  if (targets.length === 0) return;
  console.log(`[WebPush] Dispatching push to ${targets.length} device(s) for couple: ${coupleId}`);
  return Promise.allSettled(
    targets.map((subRecord) => sendPushNotification(subRecord.subscription, payload))
  );
}

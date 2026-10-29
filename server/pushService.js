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
 * Curated Pool of Loving, Caring & Health-Promoting Messages
 */
export const SWEET_CARE_MESSAGES = [
  // Health & Ergonomics & Posture
  {
    category: 'posture',
    title: '🌸 Lời Nhắn Từ Anh: Thẳng lưng lên nha',
    body: 'Bé yêu ơi, ngồi làm việc nhớ ngồi thẳng lưng và thả lỏng vai nha! Đừng ngồi khom lưng quá lâu kẻo đau cổ nhé ❤️',
    timeSlot: 'daytime'
  },
  {
    category: 'eyes',
    title: '👀 Lời Nhắn Từ Anh: Cho mắt nghỉ tí nhé',
    body: 'Nhìn màn hình liên tục mỏi mắt lắm đó em! Hãy chớp mắt và nhìn ra xa 20 giây cho đôi mắt xinh đẹp được thư giãn nha ✨',
    timeSlot: 'daytime'
  },
  {
    category: 'hydration',
    title: '💧 Lời Nhắn Từ Anh: Uống ngụm nước ấm nào',
    body: 'Nghỉ tay uống một ngụm nước ấm nào em ơi! Bổ sung nước cho da dẻ lúc nào cũng tươi tắn và căng mọng nhé 💕',
    timeSlot: 'daytime'
  },
  {
    category: 'stretch',
    title: '🧘‍♀️ Lời Nhắn Từ Anh: Vươn vai thư giãn 1 phút',
    body: 'Hít một hơi thật sâu 3 nhịp và vươn vai thư giãn nào em! Em đã làm việc rất chăm chỉ rồi, luôn có anh bên cạnh cổ vũ nè ❤️',
    timeSlot: 'afternoon'
  },
  {
    category: 'snack',
    title: '🍎 Lời Nhắn Từ Anh: Ăn nhẹ nạp năng lượng',
    body: 'Bé ơi, chiều rồi nhớ ăn chút hoa quả ngọt ngào hoặc sữa chua lót dạ nhé! Đừng để bụng đói làm việc mệt nha 🥰',
    timeSlot: 'afternoon'
  },
  {
    category: 'mood',
    title: '🌈 Lời Nhắn Từ Anh: Cười một cái thật tươi nào',
    body: 'Cười lên một cái nào công chúa của anh! Nụ cười của em là điều xinh đẹp, ấm áp và đáng yêu nhất hôm nay ✨',
    timeSlot: 'all'
  },
  {
    category: 'encouragement',
    title: '🥰 Lời Nhắn Từ Anh: Em đã làm rất tốt hôm nay',
    body: 'Dù công việc có bận rộn hay áp lực thì vẫn luôn có anh yêu thương và đồng hành cùng em nhé. Yêu em nhiều lắm! ❤️',
    timeSlot: 'all'
  },
  {
    category: 'winddown',
    title: '🏡 Lời Nhắn Từ Anh: Sắp được về nghỉ ngơi rồi',
    body: 'Sắp hết giờ làm việc rồi em ơi! Cố gắng chút nữa rồi về nhà nghỉ ngơi và chia sẻ ngày hôm nay với anh nha 💕',
    timeSlot: 'afternoon'
  },
  {
    category: 'cozy_night',
    title: '🌙 Lời Nhắn Từ Anh: Tối nay thư giãn thật sâu nhé',
    body: 'Một ngày dài khép lại rồi, buông bỏ mọi mệt mỏi và nghỉ ngơi thật thoải mái nha bé. Chúc em yêu ngủ thật ngon ❤️',
    timeSlot: 'evening'
  }
];

export function getRandomSweetCare(category = null, timeSlot = 'all') {
  let filtered = SWEET_CARE_MESSAGES;
  if (category) {
    filtered = filtered.filter(m => m.category === category);
  }
  if (timeSlot && timeSlot !== 'all') {
    const slotMatches = filtered.filter(m => m.timeSlot === timeSlot || m.timeSlot === 'all');
    if (slotMatches.length > 0) filtered = slotMatches;
  }
  if (filtered.length === 0) filtered = SWEET_CARE_MESSAGES;
  const randomIndex = Math.floor(Math.random() * filtered.length);
  return filtered[randomIndex];
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
    alarmId: payload.alarmId || null,
    data: {
      url: payload.url || '/',
      alarmId: payload.alarmId || null
    }
  });

  const options = {
    TTL: 86400, // 24 hours
    urgency: 'high' // Highest priority for immediate delivery to iOS lock screen
  };

  try {
    await webpush.sendNotification(subscription, pushPayload, options);
    console.log(`[WebPush] Sent push notification successfully: "${payload.title}" to ${subscription.endpoint.slice(0, 45)}...`);
    return true;
  } catch (err) {
    console.warn(`[WebPush] Push delivery error (${err.statusCode || err.code}):`, err.message);
    // If endpoint is expired or unsubscribed (HTTP 410 or 404), clean it up
    if (err.statusCode === 410 || err.statusCode === 404) {
      console.log(`[WebPush] Cleaning up expired push subscription: ${subscription.endpoint.slice(0, 45)}...`);
      db.removePushSubscription(subscription.endpoint);
    }
    return false;
  }
}

/**
 * Get all push subscriptions belonging to the lover/girlfriend in a couple
 */
export function getLoverSubscriptions(coupleId, loverId = null) {
  const subs = db.data.pushSubscriptions || [];
  const couple = coupleId ? db.findCoupleById(coupleId) : null;
  const caretakerId = couple?.caretakerId;

  const loverSubs = subs.filter((s) => {
    // 1. Explicit exclusion of caretaker
    if (caretakerId && s.userId === caretakerId) return false;
    if (s.role === 'caretaker') return false;

    // 2. Direct match with loverId
    if (loverId && s.userId === loverId) return true;

    // 3. Match coupleId with lover role or default
    if (coupleId && s.coupleId === coupleId) {
      return s.role === 'lover' || !s.role;
    }

    return false;
  });

  // Deduplicate by endpoint to avoid double-pinging the same device
  const unique = [];
  const seenEndpoints = new Set();
  for (const item of loverSubs) {
    const ep = item.subscription?.endpoint;
    if (ep && !seenEndpoints.has(ep)) {
      seenEndpoints.add(ep);
      unique.push(item);
    }
  }

  return unique;
}

/**
 * Send push notification to all devices registered to the lover/girlfriend
 */
export async function sendPushToLover(coupleId, loverId, payload) {
  const targets = getLoverSubscriptions(coupleId, loverId);
  if (!targets || targets.length === 0) {
    console.log(`[WebPush] No lover push subscriptions found (couple: ${coupleId}, loverId: ${loverId})`);
    return [];
  }

  console.log(`[WebPush] Dispatching push to ${targets.length} lover device(s) for couple: ${coupleId}`);
  return Promise.allSettled(
    targets.map((s) => sendPushNotification(s.subscription, payload))
  );
}

/**
 * Send push notification to all devices registered to a specific user
 */
export async function sendPushToUser(userId, payload) {
  if (!userId) return [];
  const subscriptions = db.getSubscriptionsForUser(userId);
  if (!subscriptions || subscriptions.length === 0) {
    console.log(`[WebPush] No push subscriptions found for user: ${userId}`);
    return [];
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
  if (!coupleId) return [];
  const subscriptions = db.getSubscriptionsForCouple(coupleId);
  const targets = excludeUserId
    ? subscriptions.filter((s) => s.userId !== excludeUserId)
    : subscriptions;

  if (targets.length === 0) return [];
  console.log(`[WebPush] Dispatching push to ${targets.length} device(s) for couple: ${coupleId}`);
  return Promise.allSettled(
    targets.map((subRecord) => sendPushNotification(subRecord.subscription, payload))
  );
}

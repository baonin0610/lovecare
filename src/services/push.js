// Web Push Service for iPhone (iOS 16.4+) and Android Lock Screen / Background Notifications

export const VAPID_PUBLIC_KEY = 'BAWzSAmrANX41jHCprpizhTRAfeZSbdamfs1Op9mjNYtlRFUOsgUh5VjvMCOtwIhucGK6Z_6sGQSgWEDYi7RO7Q';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isIosDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalonePwa() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isPushSupported() {
  if (typeof window === 'undefined') return false;
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/**
 * Register Apple APNs / Web Push subscription with LoveCare server
 */
export async function subscribePushNotifications(user, couple) {
  if (!isPushSupported()) {
    console.warn('[Push] Web Push is not supported in this browser environment.');
    return {
      success: false,
      reason: 'unsupported',
      isIos: isIosDevice(),
      isStandalone: isStandalonePwa()
    };
  }

  try {
    // 1. Request notification permission (must be user gesture on iOS)
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, reason: 'permission_denied' };
    }

    // 2. Wait for Service Worker registration
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) {
      return {
        success: false,
        reason: 'no_push_manager',
        isIos: isIosDevice(),
        isStandalone: isStandalonePwa()
      };
    }

    // 3. Subscribe or get existing subscription
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    // 4. Send subscription to server
    const headers = { 'Content-Type': 'application/json' };
    if (user?.id) headers['x-user-id'] = user.id;
    if (couple?.id) headers['x-couple-id'] = couple.id;

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers,
      body: JSON.stringify({ subscription })
    });

    const data = await res.json();
    console.log('[Push] Registered Web Push on server:', data);
    return { success: true, subscription };
  } catch (err) {
    console.error('[Push] Error subscribing to push:', err);
    return {
      success: false,
      reason: err.message,
      isIos: isIosDevice(),
      isStandalone: isStandalonePwa()
    };
  }
}

/**
 * Send an immediate test push to the current user's phone to verify lock screen delivery
 */
export async function testPushNotification(user) {
  if (!user?.id) return { success: false, error: 'User not logged in' };
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id
      },
      body: JSON.stringify({
        title: '❤️ LoveCare Báo Thức iPhone',
        body: 'Thành công! Thông báo khoá màn hình đã được kích hoạt. Ngay cả khi bạn tắt app hoặc khoá máy, chuông báo vẫn sẽ reo đúng giờ!'
      })
    });
    return res.json();
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * App Badging API Service
 * Controls the native red badge counter on the LoveCare PWA app icon (iOS 16.4+ Home Screen and Android/Desktop Chrome).
 */

export const badgeService = {
  isSupported() {
    return typeof navigator !== 'undefined' && ('setAppBadge' in navigator || 'clearAppBadge' in navigator);
  },

  async setBadge(count) {
    if (typeof navigator === 'undefined') return;

    // 1. Direct Window Navigator Badging API
    if ('setAppBadge' in navigator) {
      try {
        if (typeof count === 'number') {
          if (count > 0) {
            await navigator.setAppBadge(count);
          } else {
            await navigator.clearAppBadge();
          }
        } else {
          await navigator.setAppBadge();
        }
      } catch (err) {
        console.debug('[BadgeService] navigator.setAppBadge failed:', err);
      }
    }

    // 2. Also notify Service Worker to keep badge in sync
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: count > 0 ? 'SET_BADGE' : 'CLEAR_BADGE',
          count: count || 1
        });
      } catch (e) {
        // Safe ignore
      }
    }
  },

  async clearBadge() {
    if (typeof navigator === 'undefined') return;

    // 1. Direct clear
    if ('clearAppBadge' in navigator) {
      try {
        await navigator.clearAppBadge();
      } catch (err) {
        console.debug('[BadgeService] navigator.clearAppBadge failed:', err);
      }
    }

    // 2. Relay clear to Service Worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_BADGE'
        });
      } catch (e) {
        // Safe ignore
      }
    }
  }
};

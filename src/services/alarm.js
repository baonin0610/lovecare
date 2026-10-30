// Alarm Service: Sound, Persistent Vibration Loop, and Phone Push Notifications

class AlarmService {
  constructor() {
    this.audioCtx = null;
    this.alarmOsc = null;
    this.alarmGain = null;
    this.alarmInterval = null;
    this.vibrationInterval = null;
    this.isPlayingSound = false;
    this.isVibrating = false;
    this.recentNotifications = new Map();
  }

  // Request Notification permission (required for Lock Screen notifications on iOS 16.4+)
  async requestNotificationPermission() {
    if (!('Notification' in window)) {
      return 'unsupported';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Notification permission error', e);
      return 'denied';
    }
  }

  // Send native phone notification to Lock Screen / Notification Center
  async sendPhoneNotification(title, body, tag = 'alarm') {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    // Deduplication 1: If user is actively looking at the app in foreground with window focused,
    // suppress the redundant OS banner to avoid double alerting alongside the in-app modal/toast
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && (typeof document.hasFocus === 'function' ? document.hasFocus() : true)) {
      return false;
    }

    // Deduplication 2: Suppress identical notification tags sent within 6 seconds
    const now = Date.now();
    const finalTag = tag || `alarm-${now}`;
    if (this.recentNotifications.has(finalTag)) {
      if (now - this.recentNotifications.get(finalTag) < 6000) {
        return false;
      }
    }
    this.recentNotifications.set(finalTag, now);
    if (this.recentNotifications.size > 50) {
      for (const [k, t] of this.recentNotifications.entries()) {
        if (now - t > 30000) this.recentNotifications.delete(k);
      }
    }

    if (Notification.permission !== 'granted') {
      console.warn('[Alarm] Notification permission is not granted:', Notification.permission);
      return false;
    }

    const options = {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: finalTag,
      vibrate: [500, 200, 500, 200, 500, 200, 1000],
      requireInteraction: true, // Stays on screen until dismissed or acted upon
      renotify: false,
      silent: false,
      data: { url: '/' }
    };

    // 1. Try Service Worker showNotification first (Mandatory for iOS 16.4+ PWA & best for mobile)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(title, options);
          return true;
        }
      }
    } catch (e) {
      console.warn('[Alarm] ServiceWorker showNotification notice:', e);
    }

    // 2. Desktop browser fallback
    try {
      if (typeof Notification === 'function') {
        new Notification(title, options);
        return true;
      }
    } catch (e) {
      console.warn('[Alarm] Desktop Notification constructor notice:', e);
    }

    return false;
  }

  // Start continuous vibration loop
  startVibrationLoop() {
    this.isVibrating = true;

    const vibratePulse = () => {
      if (!this.isVibrating) return;
      if ('vibrate' in navigator) {
        // Vibrate 600ms, pause 200ms, vibrate 600ms, pause 400ms
        navigator.vibrate([600, 200, 600, 400]);
      }
    };

    vibratePulse();
    clearInterval(this.vibrationInterval);
    this.vibrationInterval = setInterval(vibratePulse, 1800);
  }

  // Stop vibration only (when photo is captured)
  stopVibration() {
    this.isVibrating = false;
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0); // Cancel immediately
    }
  }

  // Start iOS-style alarm chime
  startAlarmSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioCtx();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      this.isPlayingSound = true;

      // Play double-beep alarm pattern every 1.2s
      const playBeeps = () => {
        if (!this.isPlayingSound || !this.audioCtx) return;

        const now = this.audioCtx.currentTime;
        const freqs = [880, 1046.5]; // A5, C6 (classic alarm frequencies)

        freqs.forEach((freq, idx) => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + idx * 0.15);

          gain.gain.setValueAtTime(0, now + idx * 0.15);
          gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.15 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.12);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(now + idx * 0.15);
          osc.stop(now + idx * 0.15 + 0.14);
        });
      };

      playBeeps();
      clearInterval(this.alarmInterval);
      this.alarmInterval = setInterval(playBeeps, 1200);
    } catch (e) {
      console.warn('Audio alarm error:', e);
    }
  }

  // Stop sound (can be silenced by user)
  stopAlarmSound() {
    this.isPlayingSound = false;
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
  }

  // Stop everything (when photo verification is completed)
  stopAll() {
    this.stopAlarmSound();
    this.stopVibration();
  }
}

export const alarm = new AlarmService();

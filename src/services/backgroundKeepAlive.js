// Background Keep-Alive Service for LoveCare PWA (iOS 16.4+ & Android)
// Ensures the app thread stays alive in the background and reconnects seamlessly upon unlock

let audioCtx = null;
let silentInterval = null;
let wakeLock = null;

/**
 * Start low-power silent audio keep-alive
 * Tells iOS Safari / WebKit that this app has active audio capability, preventing background freezing
 */
export function startBackgroundKeepAlive() {
  if (typeof window === 'undefined') return;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext && !audioCtx) {
      audioCtx = new AudioContext();
    }

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    if (!silentInterval) {
      silentInterval = setInterval(() => {
        try {
          if (audioCtx && audioCtx.state === 'running') {
            // Play a 10ms inaudible buffer (gain 0.001) to keep the audio session alive
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            gain.gain.value = 0.0001; // completely inaudible
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.02);
          }
        } catch (e) {
          // Ignore
        }
      }, 25000); // Pulse every 25s
    }
  } catch (e) {
    console.warn('[KeepAlive] Audio keep-alive notice:', e.message);
  }
}

export function stopBackgroundKeepAlive() {
  if (silentInterval) {
    clearInterval(silentInterval);
    silentInterval = null;
  }
  if (audioCtx) {
    try {
      audioCtx.close().catch(() => {});
    } catch (e) {}
    audioCtx = null;
  }
  releaseWakeLock();
}

/**
 * Request Screen Wake Lock (prevents screen from turning off during alarms/alerts)
 */
export async function requestWakeLock() {
  if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
    try {
      if (!wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
          wakeLock = null;
        });
        console.log('[KeepAlive] Screen Wake Lock active.');
      }
    } catch (err) {
      // Non-fatal if battery saver denies
    }
  }
}

export function releaseWakeLock() {
  if (wakeLock) {
    try {
      wakeLock.release();
    } catch (e) {}
    wakeLock = null;
  }
}

/**
 * Setup lifecycle listeners (visibility change & focus) to automatically resume keepalive
 */
export function initLifecycleKeepAlive(onWakeup) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      console.log('[KeepAlive] App returned to foreground, re-syncing...');
      startBackgroundKeepAlive();
      if (typeof onWakeup === 'function') {
        onWakeup();
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleVisibilityChange);
  window.addEventListener('pageshow', handleVisibilityChange);

  // Start initial keep-alive
  startBackgroundKeepAlive();

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleVisibilityChange);
    window.removeEventListener('pageshow', handleVisibilityChange);
    stopBackgroundKeepAlive();
  };
}

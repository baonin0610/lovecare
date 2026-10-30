/**
 * Offline Upload Queue Service (IndexedDB)
 * Safely persists photo check-ins and metadata when user loses cellular/WiFi connection
 * (e.g. in elevators, basements, subways) and automatically resumes uploading when connection restores.
 */

import { api } from './api';

const DB_NAME = 'lovecare_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'pending_checkins';

let dbInstance = null;
let isProcessing = false;
const listeners = new Set();

function notifyListeners(queueCount) {
  listeners.forEach((fn) => {
    try {
      fn(queueCount);
    } catch (e) {
      console.warn('[OfflineQueue] Listener error:', e);
    }
  });
}

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export const offlineQueue = {
  /**
   * Subscribe to queue count changes
   */
  subscribe(fn) {
    listeners.add(fn);
    this.getPendingCount().then((count) => fn(count)).catch(() => {});
    return () => listeners.delete(fn);
  },

  /**
   * Save a check-in to offline IndexedDB storage
   */
  async enqueueCheckin({
    photoBlob,
    fileName = 'checkin.jpg',
    reminderId = '',
    type = 'water',
    title = 'Uống nước',
    note = '',
    waterAmountMl = null,
    mealCategory = null,
    date = ''
  }) {
    const db = await openDB();
    const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const item = {
      id,
      createdAt: new Date().toISOString(),
      photoBlob,
      fileName,
      reminderId,
      type,
      title,
      note,
      waterAmountMl,
      mealCategory,
      date,
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(item);

      req.onsuccess = async () => {
        const count = await this.getPendingCount();
        notifyListeners(count);
        resolve(item);
      };

      req.onerror = () => reject(req.error);
    });
  },

  /**
   * Get pending queue count
   */
  async getPendingCount() {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.count();
        req.onsuccess = () => resolve(req.result || 0);
        req.onerror = () => resolve(0);
      });
    } catch (e) {
      return 0;
    }
  },

  /**
   * Retrieve all pending checkin items
   */
  async getAllPending() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      return [];
    }
  },

  /**
   * Remove a successfully processed item
   */
  async removePending(id) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = async () => {
          const count = await this.getPendingCount();
          notifyListeners(count);
          resolve();
        };
        req.onerror = () => resolve();
      });
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Process all pending uploads
   */
  async processQueue(user, couple, callbacks = {}) {
    if (isProcessing) {
      console.log('[OfflineQueue] Already processing queue, skipping concurrent run.');
      return { skipped: true };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[OfflineQueue] Device is currently offline, delaying queue processing.');
      return { skipped: true, reason: 'offline' };
    }

    isProcessing = true;
    let successCount = 0;
    let failCount = 0;

    try {
      const items = await this.getAllPending();
      if (!items || items.length === 0) {
        isProcessing = false;
        return { successCount: 0, failCount: 0, remaining: 0 };
      }

      console.log(`[OfflineQueue] Processing ${items.length} pending offline checkin(s)...`);

      for (const item of items) {
        try {
          const formData = new FormData();
          const file = new File([item.photoBlob], item.fileName || 'checkin.jpg', {
            type: item.photoBlob.type || 'image/jpeg'
          });
          formData.append('photo', file);
          formData.append('reminderId', item.reminderId || '');
          formData.append('type', item.type || 'water');
          formData.append('title', item.title || 'Uống nước');
          formData.append('note', item.note || '');
          if (item.waterAmountMl) formData.append('waterAmountMl', item.waterAmountMl);
          if (item.mealCategory) formData.append('mealCategory', item.mealCategory);

          const saved = await api.createCheckin(user, couple, formData);
          if (saved && !saved.error) {
            await this.removePending(item.id);
            successCount++;
            callbacks.onItemSuccess?.(saved, item);
          } else {
            failCount++;
            // If failed with network error, stop queue run
            if (!navigator.onLine) break;
          }
        } catch (itemErr) {
          console.warn('[OfflineQueue] Failed to send queued item:', itemErr);
          failCount++;
          if (!navigator.onLine) break;
        }
      }

      const remaining = await this.getPendingCount();
      notifyListeners(remaining);

      if (successCount > 0) {
        callbacks.onBatchComplete?.(successCount);
      }

      return { successCount, failCount, remaining };
    } finally {
      isProcessing = false;
    }
  }
};

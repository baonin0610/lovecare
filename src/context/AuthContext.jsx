import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../services/audio';
import { alarm } from '../services/alarm';
import { unsubscribePushNotifications } from '../services/push';
import { badgeService } from '../services/badgeService';
import { offlineQueue } from '../services/offlineQueue';
import { getLocalTodayString } from '../services/date';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lovecare_user');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse lovecare_user from localStorage', e);
    }
    return null;
  });

  const [couple, setCouple] = useState(() => {
    try {
      const saved = localStorage.getItem('lovecare_couple');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse lovecare_couple from localStorage', e);
    }
    return null;
  });

  const [socket, setSocket] = useState(null);
  const [activeNudge, setActiveNudge] = useState(null);
  const [activeAlarm, setActiveAlarm] = useState(null);
  const [activeSweetCare, setActiveSweetCare] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Resume Sync & Offline Queue state
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState(() => Date.now());
  const [pendingQueueCount, setPendingQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const lastSyncCallRef = useRef(0);

  // Locket Chat Box state
  const [isChatBoxOpen, setIsChatBoxOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [lastChatMessage, setLastChatMessage] = useState(null);

  // Show floating toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Resume Sync: re-fetch missing events & process offline queue when waking up
  const triggerResumeSync = useCallback(async (reason = 'auto') => {
    const now = Date.now();
    // Cooldown 3.5 seconds to avoid double rapid calls
    if (now - lastSyncCallRef.current < 3500) {
      return;
    }
    lastSyncCallRef.current = now;
    console.log(`[ResumeSync] Triggering sync (reason: ${reason}) at ${new Date().toLocaleTimeString()}`);
    setLastSyncTimestamp(now);

    // Re-join socket rooms if connected
    if (socket?.connected) {
      if (couple?.id) socket.emit('join_couple', couple.id);
      if (user?.id) socket.emit('join_user', user.id);
    }

    // Process pending offline checkin queue
    if (user && couple && (typeof navigator === 'undefined' || navigator.onLine)) {
      try {
        await offlineQueue.processQueue(user, couple, {
          onItemSuccess: (saved, item) => {
            showToast(`✨ Đã tự động gửi ảnh xác thực [${item.title || 'Uống nước'}] khi có sóng!`);
            sounds.playSuccess();
          }
        });
      } catch (e) {
        console.warn('[ResumeSync] Offline queue processing error:', e);
      }
    }
  }, [socket, user, couple]);

  // Manually retry all pending offline uploads
  const retryOfflineQueue = useCallback(async () => {
    if (!user || !couple) return { remaining: 0 };
    try {
      const res = await offlineQueue.processQueue(user, couple, {
        onItemSuccess: (saved, item) => {
          showToast(`✨ Đã gửi thành công ảnh [${item.title || 'Uống nước'}]!`);
          sounds.playSuccess();
        }
      });
      if (res.successCount > 0) {
        setLastSyncTimestamp(Date.now());
        showToast(`Đã gửi thành công ${res.successCount} ảnh trong hàng đợi!`);
      } else if (res.remaining > 0) {
        showToast(`Còn ${res.remaining} ảnh chưa gửi được, vui lòng kiểm tra kết nối mạng nhé!`);
      } else {
        showToast('Hàng đợi trống, không có ảnh nào cần gửi.');
      }
      return res;
    } catch (e) {
      showToast('Lỗi khi gửi lại: ' + e.message);
      return { remaining: 0 };
    }
  }, [user, couple]);

  // Subscribe to offline queue changes
  useEffect(() => {
    const unsub = offlineQueue.subscribe((count) => {
      setPendingQueueCount(count);
    });
    return unsub;
  }, []);

  // Update native App Badge (iOS 16.4+ & Chromium) when unread count changes
  useEffect(() => {
    if (unreadChatCount > 0) {
      badgeService.setBadge(unreadChatCount);
    } else {
      badgeService.clearBadge();
    }
  }, [unreadChatCount]);

  // Listen to Phone Unlock (visibilitychange), Window Focus, Network Online/Offline
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerResumeSync('phone_unlocked');
        if (unreadChatCount === 0) {
          badgeService.clearBadge();
        }
      }
    };

    const handleFocus = () => {
      triggerResumeSync('window_focus');
      if (unreadChatCount === 0) {
        badgeService.clearBadge();
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      showToast('📶 Đã khôi phục kết nối mạng!');
      triggerResumeSync('network_online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('⚠️ Mất kết nối mạng. Ảnh chụp sẽ được lưu tạm trong máy.');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerResumeSync, unreadChatCount]);

  // Socket connection
  useEffect(() => {
    const s = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    const joinRooms = () => {
      if (couple?.id) {
        s.emit('join_couple', couple.id);
      }
      if (user?.id) {
        s.emit('join_user', user.id);
      }
    };

    s.on('connect', () => {
      joinRooms();
    });
    s.on('reconnect', () => {
      joinRooms();
      triggerResumeSync('socket_reconnect');
    });
    if (s.connected) {
      joinRooms();
    }

    s.on('alarm_trigger', ({ reminder, message, time }) => {
      // Triggered automatically at exact scheduled times
      if (user?.role === 'lover') {
        const isMandatory = reminder.mandatory !== false && couple?.mandatoryAlarmEnabled !== false && localStorage.getItem('lovecare_mandatory_alarm') !== 'false';

        if (isMandatory) {
          setActiveAlarm(reminder);
          if (localStorage.getItem('lovecare_alarm_sound') !== 'false') {
            alarm.startAlarmSound();
          }
          if (localStorage.getItem('lovecare_vibration') !== 'false') {
            alarm.startVibrationLoop();
          }
        }

        const remTime = reminder.time || time;
        const notifTitle = isMandatory
          ? `🚨 [BÁO THỨC] ${reminder.title} (${remTime})`
          : `⏰ Đến giờ: ${reminder.title} (${remTime})`;

        let notifBody = reminder.message;
        if (!notifBody) {
          if (reminder.type === 'water') {
            notifBody = `Uống ngay ${reminder.waterAmountMl || 250}ml nước và chụp ảnh xác thực cho bạn trai nhé.`;
          } else if (reminder.type === 'meal') {
            notifBody = `Đến giờ ăn rồi! Hãy ăn uống đầy đủ và chụp ảnh bữa ăn gửi bạn trai nhé.`;
          } else if (reminder.type === 'sleep') {
            notifBody = `Đến giờ đi ngủ rồi em ơi! Tắt điện thoại đi ngủ sớm cho khỏe nha.`;
          } else if (reminder.type === 'rest') {
            notifBody = `Làm việc mệt rồi! Hãy đứng dậy vươn vai hoặc nhắm mắt thư giãn 5-10 phút nhé.`;
          } else if (reminder.type === 'meds') {
            notifBody = `Đến giờ uống thuốc / vitamin rồi! Nhớ uống đều đặn và chụp gửi bạn trai kiểm tra nhé.`;
          } else {
            notifBody = `Đến giờ rồi nè! Hãy hoàn thành và chụp ảnh xác thực cho bạn trai kiểm tra nhé.`;
          }
        }

        // Only trigger phone OS lock screen notification if app is hidden in background
        if (typeof document !== 'undefined' && document.hidden) {
          alarm.sendPhoneNotification(notifTitle, notifBody, `alarm-${reminder.id}-${remTime}`);
        }
      }
    });

    s.on('nudge_alert', (nudge) => {
      if (nudge.senderId !== user?.id) {
        setActiveNudge(nudge);
        alarm.startVibrationLoop();
        sounds.playNudge();

        // Only trigger phone OS lock screen notification if app is hidden in background
        if (typeof document !== 'undefined' && document.hidden) {
          const sender = nudge.senderName || 'Bạn trai';
          const notifTitle = nudge.reminderTitle 
            ? `🔔 ${sender} nhắc: ${nudge.reminderTitle}`
            : `🔔 Nhắc nhở từ ${sender}`;
          const notifBody = nudge.message || 'Mau chụp ảnh xác thực gửi bạn trai kiểm tra nhé! ❤️';

          alarm.sendPhoneNotification(notifTitle, notifBody, `nudge-${nudge.id}`);
        }
      }
    });

    s.on('new_checkin', (checkin) => {
      if (checkin.userId !== user?.id) {
        showToast(`${checkin.userName} vừa gửi ảnh xác thực mới.`);
        sounds.playSuccess();
      }
    });

    s.on('checkin_reaction', ({ reaction, checkin }) => {
      if (reaction.userId !== user?.id) {
        showToast(`${reaction.userName} vừa phản hồi ảnh: "${reaction.text || '❤️'}".`);
        sounds.playWaterDrop();
      }
    });

    s.on('chat_message', (msg) => {
      if (msg.userId !== user?.id) {
        setLastChatMessage(msg);
        sounds.playWaterDrop();
        setUnreadChatCount((prev) => prev + 1);
        if (msg.checkinTitle) {
          showToast(`${msg.userName} phản hồi hoạt động [${msg.checkinTitle}]: "${msg.text}"`);
        } else {
          showToast(`${msg.userName} vừa nhắn: "${msg.text}"`);
        }
      }
    });

    s.on('couple_updated', (updatedCouple) => {
      setCouple(updatedCouple);
      localStorage.setItem('lovecare_couple', JSON.stringify(updatedCouple));
    });

    s.on('couple_connected', ({ couple: updatedCouple, caretakerName, loverName }) => {
      setCouple(updatedCouple);
      localStorage.setItem('lovecare_couple', JSON.stringify(updatedCouple));
      if (user?.role === 'lover') {
        showToast(`Đã kết nối với bạn trai tên: ${caretakerName || 'Bạn trai'}`);
      } else {
        showToast(`Đã kết nối với bạn gái tên: ${loverName || 'Bạn gái'}`);
      }
      sounds.playSuccess();
    });

    s.on('sweet_care_received', (care) => {
      if (user?.role === 'lover') {
        setActiveSweetCare(care);
        sounds.playWaterDrop();
        if (typeof document !== 'undefined' && document.hidden) {
          alarm.sendPhoneNotification(care.title || '💌 Lời Nhắn Yêu Thương', care.body, `care-${Date.now()}`);
        }
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [user?.id, couple?.id, user?.role]);

  const login = (userData, coupleData) => {
    setUser(userData);
    setCouple(coupleData);
    localStorage.setItem('lovecare_user', JSON.stringify(userData));
    if (coupleData) {
      localStorage.setItem('lovecare_couple', JSON.stringify(coupleData));
    }
  };

  const logout = async () => {
    try {
      // 1. Unsubscribe push on this device and remove from server database
      await unsubscribePushNotifications(user, couple);
    } catch (e) {
      console.warn('Error unsubscribing push on logout:', e);
    }

    // 2. Leave socket rooms
    if (socket) {
      if (couple?.id) socket.emit('leave_couple', couple.id);
      if (user?.id) socket.emit('leave_user', user.id);
    }

    // 3. Clear auth state and storage
    setUser(null);
    setCouple(null);
    localStorage.removeItem('lovecare_user');
    localStorage.removeItem('lovecare_couple');
    showToast('Đã đăng xuất và tắt thông báo tài khoản trên thiết bị này.');
  };

  const quickSwitch = async (role) => {
    try {
      // Unsubscribe push of previous user role before switching
      await unsubscribePushNotifications(user, couple);
      const res = await fetch('/api/auth/quick-switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.couple);
        showToast(`Đã chuyển sang vai: ${data.user.name}`, '🔄');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const dismissAlarm = () => {
    setActiveAlarm(null);
    alarm.stopAll();
  };

  const testAlarm = (customRem = null) => {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const rem = customRem || {
      id: 'test-alarm',
      title: 'Thử nghiệm Báo thức toàn màn hình',
      time: nowStr,
      message: 'Giao diện báo thức khẩn cấp sẽ tự động bung toàn màn hình khi đến giờ hoặc khi chạm thông báo! Hãy bấm nút chụp ảnh bên dưới để tắt rung.',
      type: 'water',
      waterAmountMl: 250
    };
    setActiveAlarm(rem);
    if (localStorage.getItem('lovecare_alarm_sound') !== 'false') {
      alarm.startAlarmSound();
    }
    if (localStorage.getItem('lovecare_vibration') !== 'false') {
      alarm.startVibrationLoop();
    }
  };

  // Listen to Service Worker message and URL query params when tapping notification on iPhone / Android
  useEffect(() => {
    // 1. Check URL parameters (from tapping notification banner on lock screen)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const alarmId = urlParams.get('alarmId');
      const forceAlarm = urlParams.get('forceAlarm');
      const sweetCare = urlParams.get('sweetCare');
      const timeParam = urlParams.get('time') || '';

      if (sweetCare) {
        setIsChatBoxOpen(true);
        window.history.replaceState({}, '', '/');
      } else if (alarmId || forceAlarm) {
        const savedUser = JSON.parse(localStorage.getItem('lovecare_user') || 'null');
        if (savedUser && savedUser.role === 'lover') {
          testAlarm({
            id: alarmId || 'urgent-alarm',
            title: 'Báo thức đến giờ',
            time: timeParam || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            message: 'Đến giờ uống nước hoặc ăn uống rồi! Hãy chụp ảnh xác thực để tắt rung nhé ❤️'
          });
        }
        window.history.replaceState({}, '', '/');
      }
    }

    // 2. Listen to SW postMessage (when notification is clicked while app window is open/focused)
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const handleSwMessage = (e) => {
        if (e.data && e.data.type === 'TRIGGER_MANDATORY_ALARM') {
          const payload = e.data.payload || {};
          testAlarm({
            id: payload.alarmId || 'sw-alarm',
            title: payload.title || 'Báo thức đến giờ',
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            message: payload.body || 'Chụp ảnh xác thực để tắt rung nhé!'
          });
        }
      };
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  }, []);

  const handleSetIsChatBoxOpen = (openOrFn) => {
    setIsChatBoxOpen((prev) => {
      const next = typeof openOrFn === 'function' ? openOrFn(prev) : openOrFn;
      if (next) {
        setUnreadChatCount(0);
        badgeService.clearBadge();
      }
      return next;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        couple,
        socket,
        login,
        logout,
        quickSwitch,
        activeNudge,
        setActiveNudge,
        activeAlarm,
        setActiveAlarm,
        activeSweetCare,
        setActiveSweetCare,
        dismissAlarm,
        testAlarm,
        toastMessage,
        showToast,
        isChatBoxOpen,
        setIsChatBoxOpen: handleSetIsChatBoxOpen,
        unreadChatCount,
        setUnreadChatCount,
        lastChatMessage,
        lastSyncTimestamp,
        triggerResumeSync,
        pendingQueueCount,
        retryOfflineQueue,
        isOnline
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../services/audio';
import { alarm } from '../services/alarm';

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
  const [toastMessage, setToastMessage] = useState(null);

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

    s.on('connect', joinRooms);
    s.on('reconnect', joinRooms);
    if (s.connected) {
      joinRooms();
    }

    s.on('alarm_trigger', ({ reminder, message, time }) => {
      // Triggered automatically at exact scheduled times
      if (user?.role === 'lover') {
        setActiveAlarm(reminder);
        alarm.startAlarmSound();
        alarm.startVibrationLoop();

        const remTime = reminder.time || time;
        const notifTitle = `⏰ Đến giờ: ${reminder.title} (${remTime})`;
        let notifBody = reminder.message;
        if (!notifBody) {
          if (reminder.type === 'water') {
            notifBody = `💧 Uống ngay ${reminder.waterAmountMl || 250}ml nước và chụp ảnh xác thực gửi bạn trai nhé!`;
          } else if (reminder.type === 'meal') {
            notifBody = `🍱 Đến giờ ăn rồi! Hãy ăn uống đầy đủ và chụp ảnh bữa ăn gửi bạn trai nhé! ❤️`;
          } else {
            notifBody = `✨ Đến giờ rồi nè! Hãy hoàn thành và chụp ảnh xác thực cho bạn trai kiểm tra nhé! ❤️`;
          }
        }

        alarm.sendPhoneNotification(notifTitle, notifBody, `alarm-${reminder.id}-${remTime}`);
      }
    });

    s.on('nudge_alert', (nudge) => {
      if (nudge.senderId !== user?.id) {
        setActiveNudge(nudge);
        alarm.startVibrationLoop();
        sounds.playNudge();

        const sender = nudge.senderName || 'Bạn trai';
        const notifTitle = nudge.reminderTitle 
          ? `🔔 ${sender} nhắc: ${nudge.reminderTitle}`
          : `🔔 Nhắc nhở từ ${sender}`;
        const notifBody = nudge.message || 'Mau chụp ảnh xác thực gửi bạn trai kiểm tra nhé! ❤️';

        alarm.sendPhoneNotification(notifTitle, notifBody, `nudge-${nudge.id}`);
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

  const logout = () => {
    setUser(null);
    setCouple(null);
    localStorage.removeItem('lovecare_user');
    localStorage.removeItem('lovecare_couple');
  };

  const quickSwitch = async (role) => {
    try {
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
        dismissAlarm,
        toastMessage,
        showToast,
        isChatBoxOpen,
        setIsChatBoxOpen,
        unreadChatCount,
        setUnreadChatCount,
        lastChatMessage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

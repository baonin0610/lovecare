// Vietnam Timezone Date & Time Helpers
export const getLocalTodayString = () => {
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  } catch (e) {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
};

// Extracts canonical Vietnam YYYY-MM-DD date string from any checkin
export const getCheckinDateString = (checkin) => {
  if (!checkin) return '';
  // 1. Authoritative check: createdAt timestamp derived in Asia/Ho_Chi_Minh timezone
  if (checkin.createdAt) {
    try {
      const d = new Date(checkin.createdAt);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }).format(d);
      }
    } catch (e) {}
  }
  // 2. Fallback to checkin.date YYYY-MM-DD string
  if (checkin.date && typeof checkin.date === 'string') {
    const clean = checkin.date.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  }
  return '';
};

// Returns true ONLY if checkin was completed TODAY in Vietnam calendar
export const isCheckinFromToday = (checkin) => {
  if (!checkin) return false;
  const today = getLocalTodayString();
  const cDate = getCheckinDateString(checkin);
  return cDate === today;
};

export const getVietnamTimeString = (date = new Date()) => {
  try {
    return date.toLocaleTimeString('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (e) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
};

// Returns 'morning' (< 12:00), 'afternoon' (12:00 - 17:59), or 'evening' (>= 18:00)
export const getCurrentSessionId = () => {
  try {
    const vnHourStr = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: 'numeric',
      hour12: false
    }).format(new Date());
    const h = parseInt(vnHourStr, 10);
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  } catch (e) {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
  }
};

// Session ordering for progression through the day
export const SESSION_RANK = {
  morning: 0,
  afternoon: 1,
  evening: 2
};

// Determines which session a reminder belongs to based on HH:mm string
export const getSessionForReminder = (timeStr) => {
  if (!timeStr) return 'morning';
  const [h] = timeStr.split(':').map(Number);
  if (isNaN(h) || h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
};

// Returns user-friendly session label
export const getSessionTitle = (sessionId) => {
  if (sessionId === 'morning') return 'Buổi Sáng';
  if (sessionId === 'afternoon') return 'Buổi Chiều';
  if (sessionId === 'evening') return 'Buổi Tối';
  return 'Buổi';
};

// Returns the start time of a given session
export const getSessionOpenTime = (sessionId) => {
  if (sessionId === 'afternoon') return '12:00';
  if (sessionId === 'evening') return '18:00';
  return '00:00';
};

// Checks whether a reminder belongs to a FUTURE session (not yet arrived)
// When in 'morning', afternoon and evening are upcoming.
// All items in the current session are completely unlocked and open for taking photos.
export const isSessionUpcoming = (reminderTime) => {
  if (!reminderTime) return false;
  const currentSession = getCurrentSessionId();
  const remSession = getSessionForReminder(reminderTime);
  return (SESSION_RANK[remSession] ?? 0) > (SESSION_RANK[currentSession] ?? 0);
};

// Checks whether a reminder belongs to an ALREADY PASSED session (expired)
// e.g. Morning reminders when current session is Afternoon or Evening
export const isSessionExpired = (reminderTime) => {
  if (!reminderTime) return false;
  const currentSession = getCurrentSessionId();
  const remSession = getSessionForReminder(reminderTime);
  return (SESSION_RANK[remSession] ?? 0) < (SESSION_RANK[currentSession] ?? 0);
};

// Checks whether a reminder slot has NOT arrived yet (now < scheduled time)
export const isReminderUpcoming = (reminderTime) => {
  if (!reminderTime) return false;
  try {
    const vnTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
    const [nowH, nowM] = vnTimeStr.split(':').map(Number);
    const nowMinutes = nowH * 60 + nowM;

    const [remH, remM] = reminderTime.split(':').map(Number);
    const remMinutes = remH * 60 + remM;

    return nowMinutes < remMinutes;
  } catch (e) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [remH, remM] = reminderTime.split(':').map(Number);
    return nowMinutes < remH * 60 + remM;
  }
};

// Checks whether a reminder slot has expired (e.g. 30 minutes past scheduled time)
export const isReminderExpired = (reminderTime, bufferMinutes = 30) => {
  if (!reminderTime) return false;
  try {
    const vnTimeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
    const [nowH, nowM] = vnTimeStr.split(':').map(Number);
    const nowMinutes = nowH * 60 + nowM;

    const [remH, remM] = reminderTime.split(':').map(Number);
    const remMinutes = remH * 60 + remM;

    return nowMinutes > remMinutes + bufferMinutes;
  } catch (e) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [remH, remM] = reminderTime.split(':').map(Number);
    return nowMinutes > remH * 60 + remM + bufferMinutes;
  }
};

// Group reminders into SÁNG - CHIỀU - TỐI in chronological order
export const groupRemindersBySession = (reminders = [], getCheckinFn = null) => {
  const sorted = [...(reminders || [])].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const morning = [];
  const afternoon = [];
  const evening = [];

  for (const rem of sorted) {
    if (!rem.time) {
      morning.push(rem);
      continue;
    }
    const [h] = rem.time.split(':').map(Number);
    if (h < 12) {
      morning.push(rem);
    } else if (h < 18) {
      afternoon.push(rem);
    } else {
      evening.push(rem);
    }
  }

  return [
    {
      id: 'morning',
      title: 'Buổi Sáng',
      shortTitle: 'SÁNG',
      timeRange: 'Trước 12:00',
      items: morning,
      completedCount: getCheckinFn ? morning.filter(r => !!getCheckinFn(r)).length : 0
    },
    {
      id: 'afternoon',
      title: 'Buổi Chiều',
      shortTitle: 'CHIỀU',
      timeRange: '12:00 - 17:59',
      items: afternoon,
      completedCount: getCheckinFn ? afternoon.filter(r => !!getCheckinFn(r)).length : 0
    },
    {
      id: 'evening',
      title: 'Buổi Tối',
      shortTitle: 'TỐI',
      timeRange: 'Từ 18:00',
      items: evening,
      completedCount: getCheckinFn ? evening.filter(r => !!getCheckinFn(r)).length : 0
    }
  ];
};

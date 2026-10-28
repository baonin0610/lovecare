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

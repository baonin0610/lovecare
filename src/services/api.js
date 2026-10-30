export const getHeaders = (user, couple) => {
  const headers = {
    'Content-Type': 'application/json'
  };
  if (user?.id) headers['x-user-id'] = user.id;
  if (couple?.id) headers['x-couple-id'] = couple.id;
  return headers;
};

export const api = {
  // Reminders
  async getReminders(user, couple) {
    if (!couple?.id) return [];
    try {
      const res = await fetch('/api/reminders', {
        headers: getHeaders(user, couple)
      });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  async createReminder(user, couple, data) {
    if (!couple?.id) return null;
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateReminder(user, couple, id, data) {
    if (!couple?.id) return null;
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteReminder(user, couple, id) {
    if (!couple?.id) return null;
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  // Checkins with pagination support
  async getCheckins(user, couple, dateOrOptions) {
    if (!couple?.id) return [];
    try {
      let url = '/api/checkins';
      if (typeof dateOrOptions === 'string' && dateOrOptions) {
        url = `/api/checkins?date=${dateOrOptions}`;
      } else if (typeof dateOrOptions === 'object' && dateOrOptions) {
        const params = new URLSearchParams();
        if (dateOrOptions.date) params.set('date', dateOrOptions.date);
        if (dateOrOptions.limit) params.set('limit', dateOrOptions.limit);
        if (dateOrOptions.offset !== undefined) params.set('offset', dateOrOptions.offset);
        if (dateOrOptions.page) params.set('page', dateOrOptions.page);
        url = `/api/checkins?${params.toString()}`;
      }
      const res = await fetch(url, {
        headers: getHeaders(user, couple)
      });
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data?.items && Array.isArray(data.items)) return data.items;
      return [];
    } catch (e) {
      return [];
    }
  },

  async createCheckin(user, couple, formData) {
    // Note: Do not set Content-Type header when sending FormData
    const headers = {};
    if (user?.id) headers['x-user-id'] = user.id;
    if (couple?.id) headers['x-couple-id'] = couple.id;

    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers,
        body: formData
      });
      return await res.json();
    } catch (err) {
      return { error: err.message || 'Lỗi kết nối mạng khi tải ảnh', isNetworkError: true };
    }
  },

  async reactToCheckin(user, couple, id, reaction) {
    if (!couple?.id) return null;
    const res = await fetch(`/api/checkins/${id}/reaction`, {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(reaction)
    });
    return res.json();
  },

  async deleteCheckin(user, couple, id) {
    if (!couple?.id) return null;
    const res = await fetch(`/api/checkins/${id}`, {
      method: 'DELETE',
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  // Nudge
  async sendNudge(user, couple, data) {
    if (!couple?.id) return null;
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Stats
  async getStats(user, couple) {
    if (!couple?.id) {
      return {
        today: { waterMl: 0, targetWaterMl: 2000, waterPercent: 0, waterCount: 0, mealsCount: 0, totalCheckins: 0 },
        currentStreak: 1,
        past7Days: []
      };
    }
    try {
      const res = await fetch('/api/stats', {
        headers: getHeaders(user, couple)
      });
      const data = await res.json();
      return data && !data.error ? data : null;
    } catch (e) {
      return null;
    }
  },

  // Couple info & settings
  async getCoupleInfo(user, couple) {
    const res = await fetch('/api/couple/info', {
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  async updateWaterTarget(user, couple, targetWaterMl) {
    const res = await fetch('/api/couple/target', {
      method: 'PUT',
      headers: getHeaders(user, couple),
      body: JSON.stringify({ targetWaterMl })
    });
    return res.json();
  },

  async updateAlarmSettings(user, couple, settings) {
    const res = await fetch('/api/couple/alarm-settings', {
      method: 'PUT',
      headers: getHeaders(user, couple),
      body: JSON.stringify(settings)
    });
    return res.json();
  },

  // Locket Chat Box Messages with Pagination support
  async getMessages(user, couple, options = {}) {
    if (!couple?.id) return { items: [], hasMore: false, total: 0 };
    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit);
      if (options.before) params.set('before', options.before);
      params.set('paginated', 'true');

      const res = await fetch(`/api/messages?${params.toString()}`, {
        headers: getHeaders(user, couple)
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        return { items: data, hasMore: false, total: data.length };
      }
      return {
        items: Array.isArray(data?.items) ? data.items : [],
        hasMore: !!data?.hasMore,
        total: data?.total || 0
      };
    } catch (e) {
      return { items: [], hasMore: false, total: 0 };
    }
  },

  async sendMessage(user, couple, data) {
    if (!couple?.id) return null;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Push Notifications Status & Lover Testing
  async getPushStatus(user, couple) {
    if (!couple?.id) return { hasLoverDevice: false, loverDeviceCount: 0 };
    try {
      const res = await fetch('/api/push/status', {
        headers: getHeaders(user, couple)
      });
      return await res.json();
    } catch (e) {
      return { hasLoverDevice: false, loverDeviceCount: 0 };
    }
  },

  async testLoverPush(user, couple) {
    if (!couple?.id) return { success: false, message: 'Chưa có thông tin cặp đôi' };
    const res = await fetch('/api/push/test-lover', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify({ coupleId: couple.id })
    });
    return res.json();
  },

  // Sweet Health & Encouragement Care Notifications
  async sendSweetCare(user, couple, { title, message, category } = {}) {
    if (!couple?.id) return { success: false, message: 'Chưa có thông tin cặp đôi' };
    const res = await fetch('/api/push/send-care', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify({ coupleId: couple.id, title, message, category })
    });
    return res.json();
  },

  // System Diagnostics & Health Audit
  async getDiagnostic(user, couple) {
    try {
      const res = await fetch('/api/diagnostic', {
        headers: getHeaders(user, couple)
      });
      return await res.json();
    } catch (e) {
      return { error: e.message };
    }
  }
};

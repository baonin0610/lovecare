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

  // Checkins
  async getCheckins(user, couple, date) {
    if (!couple?.id) return [];
    try {
      const url = date ? `/api/checkins?date=${date}` : '/api/checkins';
      const res = await fetch(url, {
        headers: getHeaders(user, couple)
      });
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  },

  async createCheckin(user, couple, formData) {
    // Note: Do not set Content-Type header when sending FormData
    const headers = {};
    if (user?.id) headers['x-user-id'] = user.id;
    if (couple?.id) headers['x-couple-id'] = couple.id;

    const res = await fetch('/api/checkins', {
      method: 'POST',
      headers,
      body: formData
    });
    return res.json();
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
  }
};

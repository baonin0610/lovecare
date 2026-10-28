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
    const res = await fetch('/api/reminders', {
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  async createReminder(user, couple, data) {
    const res = await fetch('/api/reminders', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateReminder(user, couple, id, data) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'PUT',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteReminder(user, couple, id) {
    const res = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  // Checkins
  async getCheckins(user, couple, date) {
    const url = date ? `/api/checkins?date=${date}` : '/api/checkins';
    const res = await fetch(url, {
      headers: getHeaders(user, couple)
    });
    return res.json();
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
    const res = await fetch(`/api/checkins/${id}/reaction`, {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(reaction)
    });
    return res.json();
  },

  async deleteCheckin(user, couple, id) {
    const res = await fetch(`/api/checkins/${id}`, {
      method: 'DELETE',
      headers: getHeaders(user, couple)
    });
    return res.json();
  },

  // Nudge
  async sendNudge(user, couple, data) {
    const res = await fetch('/api/nudge', {
      method: 'POST',
      headers: getHeaders(user, couple),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Stats
  async getStats(user, couple) {
    const res = await fetch('/api/stats', {
      headers: getHeaders(user, couple)
    });
    return res.json();
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

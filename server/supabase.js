// Supabase Integration Layer for 24/7 Persistent Storage & CDN Photos
// Uses native Node.js fetch (no extra dependencies required)

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || '';

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
};

const getHeaders = (contentType = 'application/json') => ({
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': contentType,
  'Prefer': 'return=representation'
});

export const supabase = {
  // Upload photo to Supabase Storage bucket 'checkins'
  async uploadPhoto(filename, buffer, mimeType = 'image/jpeg') {
    if (!isSupabaseConfigured()) return null;

    try {
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/checkins/${filename}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: getHeaders(mimeType),
        body: buffer
      });

      if (res.ok) {
        // Return permanent public CDN URL
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/checkins/${filename}`;
        console.log(`[Supabase Storage] Photo uploaded: ${publicUrl}`);
        return publicUrl;
      } else {
        const errText = await res.text();
        console.warn(`[Supabase Storage] Upload error:`, errText);
        return null;
      }
    } catch (err) {
      console.warn(`[Supabase Storage] Network error:`, err.message);
      return null;
    }
  },

  // Load existing data from Supabase PostgreSQL on server startup
  async loadAll() {
    if (!isSupabaseConfigured()) return null;

    try {
      const fetchTable = async (table) => {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, {
          headers: getHeaders()
        });
        if (res.ok) return await res.json();
        return [];
      };

      const [users, couples, reminders, checkins, nudges] = await Promise.all([
        fetchTable('users'),
        fetchTable('couples'),
        fetchTable('reminders'),
        fetchTable('checkins'),
        fetchTable('nudges')
      ]);

      console.log(`[Supabase DB] Loaded from cloud: ${users.length} users, ${couples.length} couples, ${reminders.length} reminders, ${checkins.length} checkins`);

      // Transform snake_case from DB into camelCase used by frontend
      const camelUsers = users.map(u => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        avatar: u.avatar || '',
        coupleId: u.couple_id,
        createdAt: u.created_at
      }));

      const camelCouples = couples.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        caretakerId: c.caretaker_id,
        loverId: c.lover_id,
        targetWaterMl: c.target_water_ml || 2000,
        createdAt: c.created_at
      }));

      const camelReminders = reminders.map(r => ({
        id: r.id,
        coupleId: r.couple_id,
        title: r.title,
        type: r.type,
        time: r.time,
        waterAmountMl: r.water_amount_ml,
        mealCategory: r.meal_category,
        message: r.message,
        enabled: r.enabled !== false,
        createdAt: r.created_at
      }));

      const camelCheckins = checkins.map(k => ({
        id: k.id,
        coupleId: k.couple_id,
        userId: k.user_id,
        userName: k.user_name,
        reminderId: k.reminder_id,
        type: k.type,
        title: k.title,
        waterAmountMl: k.water_amount_ml,
        mealCategory: k.meal_category,
        photoUrl: k.photo_url,
        note: k.note,
        date: k.date,
        time: k.time,
        reactions: k.reactions || [],
        createdAt: k.created_at
      }));

      return {
        users: camelUsers,
        couples: camelCouples,
        reminders: camelReminders,
        checkins: camelCheckins,
        nudges: nudges || []
      };
    } catch (err) {
      console.warn('[Supabase DB] Startup load failed:', err.message);
      return null;
    }
  },

  // Asynchronous sync methods to persist records in Supabase PostgreSQL
  async saveUser(user) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          avatar: user.avatar || '',
          couple_id: user.coupleId || null
        })
      });
    } catch (e) {
      console.warn('[Supabase DB] saveUser error:', e.message);
    }
  },

  async updateUser(id, updates) {
    if (!isSupabaseConfigured()) return;
    try {
      const payload = {};
      if (updates.coupleId !== undefined) payload.couple_id = updates.coupleId;
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.avatar !== undefined) payload.avatar = updates.avatar;

      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[Supabase DB] updateUser error:', e.message);
    }
  },

  async saveCouple(couple) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/couples`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: couple.id,
          code: couple.code,
          name: couple.name,
          caretaker_id: couple.caretakerId || null,
          lover_id: couple.loverId || null,
          target_water_ml: couple.targetWaterMl || 2000
        })
      });
    } catch (e) {
      console.warn('[Supabase DB] saveCouple error:', e.message);
    }
  },

  async updateCouple(id, updates) {
    if (!isSupabaseConfigured()) return;
    try {
      const payload = {};
      if (updates.caretakerId !== undefined) payload.caretaker_id = updates.caretakerId;
      if (updates.loverId !== undefined) payload.lover_id = updates.loverId;
      if (updates.targetWaterMl !== undefined) payload.target_water_ml = updates.targetWaterMl;
      if (updates.name !== undefined) payload.name = updates.name;

      await fetch(`${SUPABASE_URL}/rest/v1/couples?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[Supabase DB] updateCouple error:', e.message);
    }
  },

  async saveReminder(rem) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/reminders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: rem.id,
          couple_id: rem.coupleId,
          title: rem.title,
          type: rem.type,
          time: rem.time,
          water_amount_ml: rem.waterAmountMl,
          meal_category: rem.mealCategory,
          message: rem.message,
          enabled: rem.enabled !== false
        })
      });
    } catch (e) {
      console.warn('[Supabase DB] saveReminder error:', e.message);
    }
  },

  async updateReminder(id, updates) {
    if (!isSupabaseConfigured()) return;
    try {
      const payload = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.time !== undefined) payload.time = updates.time;
      if (updates.enabled !== undefined) payload.enabled = updates.enabled;
      if (updates.message !== undefined) payload.message = updates.message;
      if (updates.waterAmountMl !== undefined) payload.water_amount_ml = updates.waterAmountMl;

      await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
    } catch (e) {
      console.warn('[Supabase DB] updateReminder error:', e.message);
    }
  },

  async deleteReminder(id) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    } catch (e) {
      console.warn('[Supabase DB] deleteReminder error:', e.message);
    }
  },

  async saveCheckin(chk) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: chk.id,
          couple_id: chk.coupleId,
          user_id: chk.userId,
          user_name: chk.userName,
          reminder_id: chk.reminderId || null,
          type: chk.type,
          title: chk.title,
          water_amount_ml: chk.waterAmountMl || null,
          meal_category: chk.mealCategory || null,
          photo_url: chk.photoUrl,
          note: chk.note || '',
          date: chk.date,
          time: chk.time,
          reactions: chk.reactions || []
        })
      });
    } catch (e) {
      console.warn('[Supabase DB] saveCheckin error:', e.message);
    }
  },

  async deleteCheckin(id) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/checkins?id=eq.${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    } catch (e) {
      console.warn('[Supabase DB] deleteCheckin error:', e.message);
    }
  },

  async updateCheckinReactions(checkinId, reactions) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/checkins?id=eq.${checkinId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ reactions })
      });
    } catch (e) {
      console.warn('[Supabase DB] updateReactions error:', e.message);
    }
  }
};

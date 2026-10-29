// Supabase Integration Layer for 24/7 Persistent Storage & CDN Photos
// Uses native Node.js fetch (no extra dependencies required)

let rawUrl = (process.env.SUPABASE_URL || '').trim();
// Automatically clean URL if user pasted with /rest/v1 or trailing slashes
rawUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
const SUPABASE_URL = rawUrl;
const SUPABASE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
};

const ensureUuid = (id) => {
  if (!id) return null;
  const match = String(id).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
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
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': mimeType || 'image/jpeg',
          'x-upsert': 'true'
        },
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

      const [users, couples, reminders, checkins, nudges, pushSubs] = await Promise.all([
        fetchTable('users'),
        fetchTable('couples'),
        fetchTable('reminders'),
        fetchTable('checkins'),
        fetchTable('nudges'),
        fetchTable('push_subscriptions').catch(() => [])
      ]);

      console.log(`[Supabase DB] Loaded from cloud: ${users.length} users, ${couples.length} couples, ${reminders.length} reminders, ${checkins.length} checkins, ${Array.isArray(pushSubs) ? pushSubs.length : 0} push subscriptions`);

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

      const camelCheckins = checkins.map(k => {
        let normalizedDate = '';
        if (k.created_at) {
          try {
            normalizedDate = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(new Date(k.created_at));
          } catch (e) {}
        }
        if (!normalizedDate && k.date) {
          normalizedDate = String(k.date).slice(0, 10);
        }

        return {
          id: k.id,
          coupleId: k.couple_id,
          userId: k.user_id,
          userName: k.user_name,
          reminderId: k.reminder_id,
          reminder_id: k.reminder_id,
          type: k.type,
          title: k.title,
          waterAmountMl: k.water_amount_ml,
          mealCategory: k.meal_category,
          photoUrl: k.photo_url,
          note: k.note,
          date: normalizedDate,
          time: k.time,
          reactions: k.reactions || [],
          createdAt: k.created_at
        };
      });

      return {
        users: camelUsers,
        couples: camelCouples,
        reminders: camelReminders,
        checkins: camelCheckins,
        nudges: nudges || [],
        pushSubscriptions: Array.isArray(pushSubs) ? pushSubs.map(s => ({
          id: s.id,
          userId: s.user_id,
          coupleId: s.couple_id,
          role: s.role || '',
          userName: s.user_name || '',
          subscription: s.subscription,
          userAgent: s.user_agent || '',
          updatedAt: s.updated_at
        })) : []
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
      const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          avatar: user.avatar || '',
          couple_id: ensureUuid(user.coupleId)
        })
      });
      if (!res.ok) {
        console.warn('[Supabase DB] saveUser failed:', await res.text());
      } else {
        console.log('[Supabase DB] saveUser success for:', user.username);
      }
    } catch (e) {
      console.warn('[Supabase DB] saveUser error:', e.message);
    }
  },

  async updateUser(id, updates) {
    if (!isSupabaseConfigured()) return;
    try {
      const payload = {};
      if (updates.coupleId !== undefined) payload.couple_id = ensureUuid(updates.coupleId);
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
      const coupleUuid = ensureUuid(couple.id) || couple.id;
      const res = await fetch(`${SUPABASE_URL}/rest/v1/couples`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: coupleUuid,
          code: couple.code,
          name: couple.name,
          caretaker_id: couple.caretakerId || null,
          lover_id: couple.loverId || null,
          target_water_ml: couple.targetWaterMl || 2000
        })
      });
      if (!res.ok) {
        console.warn('[Supabase DB] saveCouple failed:', await res.text());
      } else {
        console.log('[Supabase DB] saveCouple success for:', couple.code);
      }
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

      const coupleUuid = ensureUuid(id) || id;
      await fetch(`${SUPABASE_URL}/rest/v1/couples?id=eq.${coupleUuid}`, {
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
      const remUuid = ensureUuid(rem.id) || rem.id;
      const coupleUuid = ensureUuid(rem.coupleId) || rem.coupleId;
      await fetch(`${SUPABASE_URL}/rest/v1/reminders`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: remUuid,
          couple_id: coupleUuid,
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

      const remUuid = ensureUuid(id) || id;
      await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${remUuid}`, {
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
      const remUuid = ensureUuid(id) || id;
      await fetch(`${SUPABASE_URL}/rest/v1/reminders?id=eq.${remUuid}`, {
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
      const chkUuid = ensureUuid(chk.id) || chk.id;
      const coupleUuid = ensureUuid(chk.coupleId) || chk.coupleId;
      const remUuid = ensureUuid(chk.reminderId);

      await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: chkUuid,
          couple_id: coupleUuid,
          user_id: chk.userId,
          user_name: chk.userName,
          reminder_id: remUuid,
          type: chk.type,
          title: chk.title,
          water_amount_ml: chk.waterAmountMl || null,
          meal_category: chk.mealCategory || null,
          photo_url: chk.photoUrl,
          note: chk.note || '',
          date: chk.date,
          time: chk.time,
          reactions: chk.reactions || [],
          created_at: chk.createdAt || new Date().toISOString()
        })
      });
    } catch (e) {
      console.warn('[Supabase DB] saveCheckin error:', e.message);
    }
  },

  async deleteCheckin(id) {
    if (!isSupabaseConfigured()) return;
    try {
      const chkUuid = ensureUuid(id) || id;
      await fetch(`${SUPABASE_URL}/rest/v1/checkins?id=eq.${chkUuid}`, {
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
      const chkUuid = ensureUuid(checkinId) || checkinId;
      await fetch(`${SUPABASE_URL}/rest/v1/checkins?id=eq.${chkUuid}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ reactions })
      });
    } catch (e) {
      console.warn('[Supabase DB] updateReactions error:', e.message);
    }
  },

  async saveMessage(msg) {
    if (!isSupabaseConfigured()) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          id: ensureUuid(msg.id),
          couple_id: ensureUuid(msg.coupleId),
          user_id: msg.userId,
          user_name: msg.userName,
          role: msg.role,
          text: msg.text,
          emoji: msg.emoji || '❤️',
          checkin_id: msg.checkinId ? (ensureUuid(msg.checkinId) || msg.checkinId) : null,
          checkin_photo_url: msg.checkinPhotoUrl || null,
          checkin_title: msg.checkinTitle || null,
          checkin_time: msg.checkinTime || null,
          checkin_type: msg.checkinType || null,
          created_at: msg.createdAt
        })
      });
    } catch (e) {
      // non-fatal if table not yet created in Supabase
    }
  },

  async savePushSubscription(sub) {
    if (!isSupabaseConfigured() || !sub?.subscription?.endpoint) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          ...getHeaders(),
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          id: ensureUuid(sub.id) || sub.id,
          user_id: sub.userId || null,
          couple_id: ensureUuid(sub.coupleId) || sub.coupleId || null,
          endpoint: sub.subscription.endpoint,
          role: sub.role || null,
          user_name: sub.userName || null,
          subscription: sub.subscription,
          user_agent: sub.userAgent || null,
          updated_at: sub.updatedAt || new Date().toISOString()
        })
      });
    } catch (e) {
      // non-fatal if table not yet created
    }
  },

  async deletePushSubscription(endpoint) {
    if (!isSupabaseConfigured() || !endpoint) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
    } catch (e) {
      // non-fatal
    }
  }
};

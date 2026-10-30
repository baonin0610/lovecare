import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial state
const defaultData = {
  users: [
    {
      id: 'demo-boyfriend',
      username: 'anhyeu',
      password: '123',
      name: 'Anh Yêu (Quản lý)',
      role: 'caretaker', // 'caretaker' (bạn trai) or 'lover' (em yêu)
      avatar: '👨‍💼',
      coupleId: 'demo-couple-01',
      createdAt: new Date().toISOString()
    },
    {
      id: 'demo-girlfriend',
      username: 'emyeu',
      password: '123',
      name: 'Bé Yêu (Ngoan ngoãn)',
      role: 'lover',
      avatar: '🐰',
      coupleId: 'demo-couple-01',
      createdAt: new Date().toISOString()
    }
  ],
  couples: [
    {
      id: 'demo-couple-01',
      code: 'LOVE88',
      name: 'Ngôi Nhà Hạnh Phúc',
      caretakerId: 'demo-boyfriend',
      loverId: 'demo-girlfriend',
      targetWaterMl: 2000,
      createdAt: new Date().toISOString()
    }
  ],
  reminders: [
    {
      id: 'rem-1',
      coupleId: 'demo-couple-01',
      title: 'Uống cốc nước ấm đầu ngày',
      type: 'water', // 'water' or 'meal'
      time: '07:30',
      waterAmountMl: 300,
      message: 'Chào buổi sáng công chúa! Uống 1 cốc nước ấm thanh lọc cơ thể nha ❤️',
      enabled: true
    },
    {
      id: 'rem-2',
      coupleId: 'demo-couple-01',
      title: 'Ăn sáng nạp năng lượng',
      type: 'meal',
      mealCategory: 'breakfast',
      time: '08:00',
      message: 'Ăn sáng đầy đủ mới có sức làm việc, không được nhịn đâu đó!',
      enabled: true
    },
    {
      id: 'rem-3',
      coupleId: 'demo-couple-01',
      title: 'Cốc nước giữa buổi sáng',
      type: 'water',
      time: '10:00',
      waterAmountMl: 350,
      message: 'Làm việc mệt chưa em? Uống ngụm nước cho tỉnh táo nha!',
      enabled: true
    },
    {
      id: 'rem-4',
      coupleId: 'demo-couple-01',
      title: 'Ăn trưa đúng giờ',
      type: 'meal',
      mealCategory: 'lunch',
      time: '12:00',
      message: '12h trưa rồi em ơi! Chụp mâm cơm trưa cho anh xem hôm nay ăn gì nè 🍱',
      enabled: true
    },
    {
      id: 'rem-5',
      coupleId: 'demo-couple-01',
      title: 'Cốc nước chiều mát lạnh',
      type: 'water',
      time: '15:00',
      waterAmountMl: 400,
      message: 'Uống nước giữ ẩm cho da mịn màng xinh đẹp nào em!',
      enabled: true
    },
    {
      id: 'rem-6',
      coupleId: 'demo-couple-01',
      title: 'Bữa xế chiều nhẹ nhàng',
      type: 'meal',
      mealCategory: 'snack',
      time: '16:30',
      message: 'Ăn chút hoa quả hay sữa chua lót dạ nhé!',
      enabled: true
    },
    {
      id: 'rem-7',
      coupleId: 'demo-couple-01',
      title: 'Ăn tối ấm cúng',
      type: 'meal',
      mealCategory: 'dinner',
      time: '19:00',
      message: 'Bữa tối ngon miệng nha bé yêu! Ăn no đừng để đói nha!',
      enabled: true
    },
    {
      id: 'rem-8',
      coupleId: 'demo-couple-01',
      title: 'Cốc nước ấm trước khi ngủ',
      type: 'water',
      time: '21:30',
      waterAmountMl: 250,
      message: 'Cốc nước cuối ngày giúp ngủ ngon và da căng mướt ✨',
      enabled: true
    }
  ],
  checkins: [],
  nudges: [],
  messages: [],
  pushSubscriptions: []
};

class Database {
  constructor() {
    this.data = this.load();
    this.readyPromise = this.initCloud();
  }

  async initCloud() {
    if (isSupabaseConfigured()) {
      try {
        const cloudData = await supabase.loadAll();
        if (cloudData) {
          if (cloudData.users && cloudData.users.length > 0) this.data.users = cloudData.users;
          if (cloudData.couples && cloudData.couples.length > 0) {
            this.data.couples = cloudData.couples.map(cc => {
              const localC = (this.data.couples || []).find(c => c.id === cc.id);
              return {
                ...cc,
                cycle: localC?.cycle || cc.cycle,
                bedtimeJournals: localC?.bedtimeJournals || cc.bedtimeJournals || []
              };
            });
          }
          if (cloudData.reminders && cloudData.reminders.length > 0) this.data.reminders = cloudData.reminders;
          if (cloudData.checkins && cloudData.checkins.length > 0) this.data.checkins = cloudData.checkins;
          if (cloudData.messages && cloudData.messages.length > 0) this.data.messages = cloudData.messages;
          if (cloudData.pushSubscriptions && cloudData.pushSubscriptions.length > 0) this.data.pushSubscriptions = cloudData.pushSubscriptions;
          this.save();
          console.log(`[Database] Cloud sync complete with Supabase: ${this.data.users.length} users, ${this.data.couples.length} couples, ${this.data.checkins.length} checkins, ${this.data.messages.length} messages restored.`);
        }
      } catch (e) {
        console.warn('[Database] Cloud init failed, running on local storage:', e.message);
      }
    }
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.migrateCoupleNames(data);
        return data;
      }
    } catch (err) {
      console.error('Error loading db file, initializing with defaults:', err);
    }
    this.save(defaultData);
    return defaultData;
  }

  migrateCoupleNames(data = this.data) {
    if (!data || !data.couples || !data.users) return;
    let changed = false;
    for (const couple of data.couples) {
      const loverUser = couple.loverId ? data.users.find(u => u.id === couple.loverId) : null;
      const caretakerUser = couple.caretakerId ? data.users.find(u => u.id === couple.caretakerId) : null;
      if (loverUser && (!couple.loverName || couple.loverName !== loverUser.name)) {
        couple.loverName = loverUser.name;
        changed = true;
      }
      if (caretakerUser && (!couple.caretakerName || couple.caretakerName !== caretakerUser.name)) {
        couple.caretakerName = caretakerUser.name;
        changed = true;
      }
      if (loverUser && caretakerUser) {
        const correctName = `${loverUser.name} & ${caretakerUser.name}`;
        if (couple.name !== correctName) {
          couple.name = correctName;
          changed = true;
        }
      }
    }
    if (changed) {
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log('[Database] Migrated couple names to match actual partner names.');
      } catch (e) {
        console.error('[Database] Migration save error:', e);
      }
    }
  }

  save(data = this.data) {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving db file:', err);
    }
  }

  // Users
  findUserByUsername(username) {
    if (!username) return null;
    const clean = username.trim().toLowerCase();
    return this.data.users.find(u => u.username && u.username.toLowerCase() === clean);
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id);
  }

  createUser(userData) {
    userData.username = userData.username.trim().toLowerCase();
    this.data.users.push(userData);
    this.save();
    supabase.saveUser(userData);
    return userData;
  }

  updateUser(id, updates) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      this.data.users[idx] = { ...this.data.users[idx], ...updates };
      this.save();
      supabase.updateUser(id, updates);
      return this.data.users[idx];
    }
    return null;
  }

  // Couples
  findCoupleById(id) {
    return this.data.couples.find(c => c.id === id);
  }

  findCoupleByCode(code) {
    return this.data.couples.find(c => c.code.toUpperCase() === code.toUpperCase());
  }

  createCouple(coupleData) {
    this.data.couples.push(coupleData);
    this.save();
    supabase.saveCouple(coupleData);
    return coupleData;
  }

  updateCouple(id, updates) {
    const idx = this.data.couples.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.data.couples[idx] = { ...this.data.couples[idx], ...updates };
      this.save();
      supabase.updateCouple(id, updates);
      return this.data.couples[idx];
    }
    return null;
  }

  // Cycle Tracking (Flo Standard)
  getCoupleCycle(coupleId) {
    const couple = this.findCoupleById(coupleId);
    if (!couple) return null;
    if (!couple.cycle) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() - 14);
      const defaultDateStr = defaultDate.toISOString().slice(0, 10);

      couple.cycle = {
        lastPeriodDate: defaultDateStr,
        cycleLength: 28,
        periodDuration: 5,
        logs: []
      };
      this.save();
    }
    return couple.cycle;
  }

  updateCoupleCycleSettings(coupleId, settings = {}) {
    const couple = this.findCoupleById(coupleId);
    if (!couple) return null;
    if (!couple.cycle) this.getCoupleCycle(coupleId);

    if (settings.lastPeriodDate) couple.cycle.lastPeriodDate = settings.lastPeriodDate;
    if (settings.cycleLength) couple.cycle.cycleLength = Math.max(21, Math.min(45, Number(settings.cycleLength)));
    if (settings.periodDuration) couple.cycle.periodDuration = Math.max(2, Math.min(10, Number(settings.periodDuration)));

    this.save();
    return couple.cycle;
  }

  logCoupleCycleDay(coupleId, logData = {}) {
    const couple = this.findCoupleById(coupleId);
    if (!couple) return null;
    if (!couple.cycle) this.getCoupleCycle(coupleId);
    if (!Array.isArray(couple.cycle.logs)) couple.cycle.logs = [];

    const date = logData.date || new Date().toISOString().slice(0, 10);
    const existingIndex = couple.cycle.logs.findIndex(l => l.date === date);

    const entry = {
      date,
      isPeriod: logData.isPeriod === true,
      flow: logData.flow || (logData.isPeriod ? 'medium' : null),
      symptoms: Array.isArray(logData.symptoms) ? logData.symptoms : [],
      mood: logData.mood || null,
      note: logData.note || '',
      updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      couple.cycle.logs[existingIndex] = entry;
    } else {
      couple.cycle.logs.unshift(entry);
    }

    if (couple.cycle.logs.length > 120) {
      couple.cycle.logs = couple.cycle.logs.slice(0, 120);
    }

    if (entry.isPeriod && (!couple.cycle.lastPeriodDate || date >= couple.cycle.lastPeriodDate)) {
      couple.cycle.lastPeriodDate = date;
    }

    this.save();
    return { cycle: couple.cycle, entry };
  }

  // Bedtime & Reflection Journal
  getCoupleJournals(coupleId) {
    const couple = this.findCoupleById(coupleId);
    if (!couple) return [];
    if (!Array.isArray(couple.bedtimeJournals)) {
      couple.bedtimeJournals = [];
    }
    return couple.bedtimeJournals;
  }

  saveCoupleJournal(coupleId, journalData = {}) {
    const couple = this.findCoupleById(coupleId);
    if (!couple) return null;
    if (!Array.isArray(couple.bedtimeJournals)) {
      couple.bedtimeJournals = [];
    }

    const date = journalData.date || new Date().toISOString().slice(0, 10);
    const existingIndex = couple.bedtimeJournals.findIndex(j => j.date === date);

    const nowIso = new Date().toISOString();
    let savedEntry = null;

    if (existingIndex !== -1) {
      const existing = couple.bedtimeJournals[existingIndex];
      savedEntry = {
        ...existing,
        ...journalData,
        date,
        updatedAt: nowIso
      };
      couple.bedtimeJournals[existingIndex] = savedEntry;
    } else {
      savedEntry = {
        id: `journal-${Date.now()}`,
        date,
        userId: journalData.userId || null,
        userName: journalData.userName || '',
        mood: journalData.mood || 'peaceful',
        moodLabel: journalData.moodLabel || 'Bình yên, nhẹ nhõm',
        energy: typeof journalData.energy === 'number' ? journalData.energy : 80,
        gratitude: journalData.gratitude || '',
        content: journalData.content || '',
        sleepWish: journalData.sleepWish || '',
        reactions: [],
        createdAt: nowIso,
        updatedAt: nowIso
      };
      couple.bedtimeJournals.unshift(savedEntry);
    }

    if (couple.bedtimeJournals.length > 180) {
      couple.bedtimeJournals = couple.bedtimeJournals.slice(0, 180);
    }

    this.save();
    return savedEntry;
  }

  reactCoupleJournal(coupleId, journalId, reactionData = {}) {
    const couple = this.findCoupleById(coupleId);
    if (!couple || !Array.isArray(couple.bedtimeJournals)) return null;

    const journal = couple.bedtimeJournals.find(j => j.id === journalId);
    if (!journal) return null;

    if (!Array.isArray(journal.reactions)) {
      journal.reactions = [];
    }

    const reaction = {
      id: `react-${Date.now()}`,
      userId: reactionData.userId || '',
      userName: reactionData.userName || 'Bạn trai',
      type: reactionData.type || 'hug',
      message: reactionData.message || 'Chúc em ngủ thật ngon ❤️',
      createdAt: new Date().toISOString()
    };

    journal.reactions.push(reaction);
    this.save();
    return { journal, reaction };
  }

  // Reminders
  getReminders(coupleId) {
    return this.data.reminders.filter(r => r.coupleId === coupleId);
  }

  createReminder(reminderData) {
    this.data.reminders.push(reminderData);
    this.save();
    supabase.saveReminder(reminderData);
    return reminderData;
  }

  updateReminder(id, updates) {
    const idx = this.data.reminders.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.data.reminders[idx] = { ...this.data.reminders[idx], ...updates };
      this.save();
      supabase.updateReminder(id, updates);
      return this.data.reminders[idx];
    }
    return null;
  }

  deleteReminder(id) {
    const idx = this.data.reminders.findIndex(r => r.id === id);
    if (idx !== -1) {
      const removed = this.data.reminders.splice(idx, 1)[0];
      this.save();
      supabase.deleteReminder(id);
      return removed;
    }
    return null;
  }

  // Checkins with pagination support
  getCheckins(coupleId, dateStr, options = {}) {
    const list = this.data.checkins.filter(c => {
      if (c.coupleId !== coupleId) return false;
      if (dateStr) {
        let chkDate = '';
        if (c.createdAt) {
          try {
            chkDate = new Intl.DateTimeFormat('en-CA', {
              timeZone: 'Asia/Ho_Chi_Minh',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).format(new Date(c.createdAt));
          } catch (e) {}
        }
        if (!chkDate && c.date) {
          chkDate = String(c.date).slice(0, 10);
        }
        return chkDate === dateStr;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const limit = options.limit ? parseInt(options.limit, 10) : null;
    const offset = options.offset ? parseInt(options.offset, 10) : 0;

    if (limit && limit > 0) {
      const items = list.slice(offset, offset + limit);
      return {
        items,
        total: list.length,
        hasMore: offset + limit < list.length,
        limit,
        offset
      };
    }

    return list;
  }

  addCheckin(checkinData) {
    this.data.checkins.unshift(checkinData);
    this.save();
    supabase.saveCheckin(checkinData);
    return checkinData;
  }

  addReactionToCheckin(checkinId, reaction) {
    const checkin = this.data.checkins.find(c => c.id === checkinId);
    if (checkin) {
      if (!checkin.reactions) checkin.reactions = [];
      checkin.reactions.push(reaction);
      this.save();
      supabase.updateCheckinReactions(checkinId, checkin.reactions);
      return checkin;
    }
    return null;
  }

  deleteCheckin(id) {
    const idx = this.data.checkins.findIndex(c => c.id === id);
    if (idx !== -1) {
      const removed = this.data.checkins.splice(idx, 1)[0];
      this.save();
      supabase.deleteCheckin(id);
      return removed;
    }
    return null;
  }

  // Nudges
  addNudge(nudgeData) {
    if (!this.data.nudges) this.data.nudges = [];
    this.data.nudges.unshift(nudgeData);
    // keep max 50 nudges
    if (this.data.nudges.length > 50) this.data.nudges.pop();
    this.save();
    return nudgeData;
  }

  // Messages (Locket Chat Box stream for couple) with pagination
  getMessages(coupleId, options = {}) {
    if (!this.data.messages) this.data.messages = [];
    const directMsgs = this.data.messages.filter(m => m.coupleId === coupleId);

    // Also seamlessly include all replies to checkins that were made in ReactionModal
    const existingMsgIds = new Set(directMsgs.map(m => m.id));
    const rawCheckins = this.getCheckins(coupleId);
    const checkinList = Array.isArray(rawCheckins) ? rawCheckins : (rawCheckins.items || []);
    const checkinMsgs = [];

    for (const c of checkinList) {
      if (c.reactions && Array.isArray(c.reactions)) {
        for (const rx of c.reactions) {
          const msgId = `msg-${rx.id}`;
          if (!existingMsgIds.has(rx.id) && !existingMsgIds.has(msgId)) {
            checkinMsgs.push({
              id: msgId,
              coupleId,
              userId: rx.userId,
              userName: rx.userName,
              role: rx.role || 'caretaker',
              text: rx.text || rx.emoji || '❤️',
              emoji: rx.emoji || '❤️',
              checkinId: c.id,
              checkinPhotoUrl: c.photoUrl,
              checkinTitle: c.title,
              checkinTime: c.time,
              checkinType: c.type,
              time: rx.time || c.time,
              createdAt: rx.createdAt || c.createdAt
            });
          }
        }
      }
    }

    const all = [...directMsgs, ...checkinMsgs].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const limit = options.limit ? parseInt(options.limit, 10) : null;
    const before = options.before;

    if (limit && limit > 0) {
      let filtered = all;
      if (before) {
        const beforeIdx = all.findIndex(m => m.id === before || m.createdAt === before);
        if (beforeIdx !== -1) {
          filtered = all.slice(0, beforeIdx);
        }
      }
      const startIndex = Math.max(0, filtered.length - limit);
      const items = filtered.slice(startIndex);
      return {
        items,
        total: all.length,
        hasMore: startIndex > 0,
        limit
      };
    }

    return all;
  }

  addMessage(msgData) {
    if (!this.data.messages) this.data.messages = [];
    this.data.messages.push(msgData);
    this.save();
    supabase.saveMessage(msgData);
    return msgData;
  }

  // Push Subscriptions for Background & Lock Screen Notifications
  addPushSubscription(userId, coupleId, subscription, userAgent = '', role = '', userName = '') {
    if (!this.data.pushSubscriptions) this.data.pushSubscriptions = [];
    const endpoint = subscription.endpoint;
    const existingIndex = this.data.pushSubscriptions.findIndex(s => s.subscription?.endpoint === endpoint);
    const existing = existingIndex !== -1 ? this.data.pushSubscriptions[existingIndex] : null;

    const subRecord = {
      id: existing ? existing.id : `sub-${Date.now()}`,
      userId: userId || (existing ? existing.userId : null),
      coupleId: coupleId || (existing ? existing.coupleId : null),
      role: role || (existing ? existing.role : ''),
      userName: userName || (existing ? existing.userName : ''),
      subscription,
      userAgent: userAgent || (existing ? existing.userAgent : ''),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex !== -1) {
      this.data.pushSubscriptions[existingIndex] = subRecord;
    } else {
      this.data.pushSubscriptions.push(subRecord);
    }
    this.save();
    supabase.savePushSubscription(subRecord);
    return subRecord;
  }

  removePushSubscription(endpoint) {
    if (!this.data.pushSubscriptions) return;
    const prevLen = this.data.pushSubscriptions.length;
    this.data.pushSubscriptions = this.data.pushSubscriptions.filter(s => s.subscription?.endpoint !== endpoint);
    if (this.data.pushSubscriptions.length !== prevLen) {
      this.save();
      supabase.deletePushSubscription(endpoint);
    }
  }

  getSubscriptionsForUser(userId) {
    if (!this.data.pushSubscriptions) return [];
    return this.data.pushSubscriptions.filter(s => s.userId === userId);
  }

  getSubscriptionsForCouple(coupleId) {
    if (!this.data.pushSubscriptions) return [];
    return this.data.pushSubscriptions.filter(s => s.coupleId === coupleId);
  }
}

export const db = new Database();

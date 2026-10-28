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
  nudges: []
};

class Database {
  constructor() {
    this.data = this.load();
    this.initCloud();
  }

  async initCloud() {
    if (isSupabaseConfigured()) {
      try {
        const cloudData = await supabase.loadAll();
        if (cloudData) {
          if (cloudData.users && cloudData.users.length > 0) this.data.users = cloudData.users;
          if (cloudData.couples && cloudData.couples.length > 0) this.data.couples = cloudData.couples;
          if (cloudData.reminders && cloudData.reminders.length > 0) this.data.reminders = cloudData.reminders;
          if (cloudData.checkins && cloudData.checkins.length > 0) this.data.checkins = cloudData.checkins;
          this.save();
          console.log('[Database] Cloud sync complete with Supabase 24/7');
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
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error('Error loading db file, initializing with defaults:', err);
    }
    this.save(defaultData);
    return defaultData;
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

  // Checkins
  getCheckins(coupleId, dateStr) {
    return this.data.checkins.filter(c => {
      if (c.coupleId !== coupleId) return false;
      if (dateStr) {
        return c.date === dateStr;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
}

export const db = new Database();

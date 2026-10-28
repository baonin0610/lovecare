import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db.js';
import { supabase, isSupabaseConfigured } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Keep-alive endpoints for 24/7 uptime without sleep mode
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: Math.round(process.uptime()),
    supabaseConnected: isSupabaseConfigured(),
    usersCount: (db.data.users || []).length,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ping', (req, res) => {
  res.send('pong');
});

// Ensure uploads folder exists
const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `checkin-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Serve static files from uploads and frontend build (dist)
app.use('/uploads', express.static(UPLOADS_DIR));

// Unique build identifier to detect and notify users of new versions automatically
const BUILD_ID = process.env.RENDER_GIT_COMMIT || `build-${Date.now()}`;

const DIST_DIR = path.join(__dirname, '../dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    setHeaders: (res, filePath) => {
      // Never cache index.html or sw.js so PWA / iOS devices immediately detect updates
      if (filePath.endsWith('index.html') || filePath.endsWith('sw.js')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }
  }));
}

// Version endpoint for client to detect new updates
app.get('/api/version', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({
    buildId: BUILD_ID,
    timestamp: new Date().toISOString()
  });
});

// Vietnam (Asia/Ho_Chi_Minh GMT+7) Time Helpers
function getTodayString() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function getVietnamTimeString(date = new Date()) {
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

// Socket.io connection logic
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current server build ID to client for version update check
  socket.emit('server_build_id', { buildId: BUILD_ID });

  socket.on('join_couple', (coupleId) => {
    if (!coupleId) return;
    socket.join(`couple:${coupleId}`);
    console.log(`[Socket] Socket ${socket.id} joined couple:${coupleId}`);
  });

  socket.on('join_user', (userId) => {
    if (!userId) return;
    socket.join(`user:${userId}`);
    console.log(`[Socket] Socket ${socket.id} joined user:${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ==================== AUTH ROUTES ====================
app.post('/api/auth/login', (req, res) => {
  const username = (req.body.username || '').trim();
  const password = (req.body.password || '').trim();

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng điền tên đăng nhập và mật khẩu' });
  }

  const user = db.findUserByUsername(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
  }

  const couple = user.coupleId ? db.findCoupleById(user.coupleId) : null;
  res.json({
    user,
    couple
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password, name, role, coupleCode } = req.body;

  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }

  if (db.findUserByUsername(username)) {
    return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
  }

  let couple = null;
  const userId = uuidv4();

  if (role === 'lover') {
    // Bạn nữ tự động được cấp mã kết nối riêng (VD: LC-8392)
    const code = 'LC-' + Math.floor(1000 + Math.random() * 9000);
    const newCouple = {
      id: uuidv4(),
      code,
      name: `${name} & Bạn trai`,
      caretakerId: null,
      loverId: userId,
      targetWaterMl: 2000,
      createdAt: new Date().toISOString()
    };
    couple = db.createCouple(newCouple);

    // Mốc nhắc nhở mặc định
    const defaultReminders = [
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Cốc nước buổi sáng',
        type: 'water',
        time: '07:30',
        waterAmountMl: 300,
        message: 'Uống cốc nước ấm đầu ngày thanh lọc cơ thể',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Bữa sáng',
        type: 'meal',
        mealCategory: 'breakfast',
        time: '08:00',
        message: 'Ăn sáng đầy đủ dinh dưỡng',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Cốc nước giữa giờ',
        type: 'water',
        time: '10:00',
        waterAmountMl: 350,
        message: 'Uống nước bổ sung năng lượng làm việc',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Bữa trưa',
        type: 'meal',
        mealCategory: 'lunch',
        time: '12:00',
        message: 'Ăn trưa đúng giờ nạp lại năng lượng',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Cốc nước buổi chiều',
        type: 'water',
        time: '15:00',
        waterAmountMl: 400,
        message: 'Bổ sung nước giữ ẩm làn da',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Bữa tối',
        type: 'meal',
        mealCategory: 'dinner',
        time: '19:00',
        message: 'Ăn tối ngon miệng và nghỉ ngơi',
        enabled: true
      },
      {
        id: uuidv4(),
        coupleId: couple.id,
        title: 'Cốc nước trước khi ngủ',
        type: 'water',
        time: '21:30',
        waterAmountMl: 250,
        message: 'Cốc nước ấm giúp ngủ ngon giấc hơn',
        enabled: true
      }
    ];
    defaultReminders.forEach(r => db.createReminder(r));
  } else {
    // Bạn nam đăng ký
    if (coupleCode) {
      couple = db.findCoupleByCode(coupleCode.trim().toUpperCase());
      if (!couple) {
        return res.status(404).json({ error: 'Mã kết nối không hợp lệ. Vui lòng kiểm tra lại mã bạn gái đã gửi.' });
      }
      const loverUser = couple.loverId ? db.findUserById(couple.loverId) : null;
      const loverName = loverUser ? loverUser.name : 'Bạn gái';

      couple.caretakerId = userId;
      couple.name = `${couple.name.replace(' & Bạn trai', '')} & ${name}`;
      db.updateCouple(couple.id, couple);

      io.to(`couple:${couple.id}`).emit('couple_connected', {
        couple,
        caretakerName: name,
        loverName
      });
    }
  }

  const newUser = db.createUser({
    id: userId,
    username,
    password,
    name,
    role,
    avatar: role === 'caretaker' ? 'caretaker' : 'lover',
    coupleId: couple ? couple.id : null,
    createdAt: new Date().toISOString()
  });

  const loverUser = couple?.loverId ? db.findUserById(couple.loverId) : null;

  res.json({
    user: newUser,
    couple,
    loverName: loverUser ? loverUser.name : null
  });
});

// Endpoint cho bạn nam nhập mã kết nối từ bạn gái
app.post('/api/couple/connect-by-code', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { code } = req.body;

  if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã kết nối' });

  const user = db.findUserById(userId);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

  const couple = db.findCoupleByCode(code.trim().toUpperCase());
  if (!couple) {
    return res.status(404).json({ error: 'Không tìm thấy phòng với mã này. Hãy kiểm tra lại mã bạn gái gửi nhé!' });
  }

  const loverUser = couple.loverId ? db.findUserById(couple.loverId) : null;
  const loverName = loverUser ? loverUser.name : 'Bạn gái';

  couple.caretakerId = user.id;
  user.coupleId = couple.id;
  db.updateCouple(couple.id, couple);
  db.updateUser(user.id, { coupleId: couple.id });

  io.to(`couple:${couple.id}`).emit('couple_connected', {
    couple,
    caretakerName: user.name,
    loverName
  });

  res.json({
    success: true,
    user,
    couple,
    loverName
  });
});

app.get('/api/auth/me', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ error: 'Chưa đăng nhập' });

  const user = db.findUserById(userId);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

  const couple = user.coupleId ? db.findCoupleById(user.coupleId) : null;
  res.json({ user, couple });
});

// Switch demo account instantly for testing (Disabled in production unless ALLOW_DEMO=true or dev=true)
app.post('/api/auth/quick-switch', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowDemo = process.env.ALLOW_DEMO === 'true' || req.query.dev === 'true';

  if (isProduction && !allowDemo) {
    return res.status(403).json({ error: 'Chế độ dùng thử bị vô hiệu hóa trên môi trường chính thức.' });
  }

  const { role } = req.body;
  const username = role === 'caretaker' ? 'anhyeu' : 'emyeu';
  const user = db.findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'Demo user not found' });
  const couple = db.findCoupleById(user.coupleId);
  res.json({ user, couple });
});

// ==================== COUPLE ROUTES ====================
app.post('/api/couple/join', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { code } = req.body;
  const user = db.findUserById(userId);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });

  const couple = db.findCoupleByCode(code);
  if (!couple) return res.status(404).json({ error: 'Mã phòng không tồn tại' });

  if (user.role === 'caretaker') {
    couple.caretakerId = user.id;
  } else {
    couple.loverId = user.id;
  }
  db.updateCouple(couple.id, couple);
  user.coupleId = couple.id;
  db.updateUser(user.id, { coupleId: couple.id });

  io.to(`couple:${couple.id}`).emit('couple_updated', couple);
  res.json({ user, couple });
});

app.get('/api/couple/info', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  if (!coupleId) return res.status(400).json({ error: 'Missing couple id' });

  const couple = db.findCoupleById(coupleId);
  if (!couple) return res.status(404).json({ error: 'Không tìm thấy thông tin cặp đôi' });

  const caretaker = couple.caretakerId ? db.findUserById(couple.caretakerId) : null;
  const lover = couple.loverId ? db.findUserById(couple.loverId) : null;

  res.json({
    couple,
    caretaker: caretaker ? { id: caretaker.id, name: caretaker.name, avatar: caretaker.avatar } : null,
    lover: lover ? { id: lover.id, name: lover.name, avatar: lover.avatar } : null
  });
});

app.put('/api/couple/target', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const { targetWaterMl } = req.body;
  const couple = db.findCoupleById(coupleId);
  if (!couple) return res.status(404).json({ error: 'Couple not found' });

  couple.targetWaterMl = Number(targetWaterMl) || 2000;
  db.updateCouple(coupleId, couple);

  io.to(`couple:${coupleId}`).emit('couple_updated', couple);
  res.json(couple);
});

// ==================== REMINDERS ROUTES ====================
app.get('/api/reminders', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  if (!coupleId) return res.json([]);

  const reminders = db.getReminders(coupleId);
  res.json(reminders);
});

app.post('/api/reminders', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const { title, type, time, waterAmountMl, mealCategory, message } = req.body;

  if (!title || !time || !type) {
    return res.status(400).json({ error: 'Thiếu thông tin nhắc nhở' });
  }

  const newReminder = {
    id: uuidv4(),
    coupleId,
    title,
    type, // 'water' or 'meal'
    time,
    waterAmountMl: type === 'water' ? (Number(waterAmountMl) || 250) : null,
    mealCategory: type === 'meal' ? (mealCategory || 'other') : null,
    message: message || '',
    enabled: true
  };

  db.createReminder(newReminder);
  io.to(`couple:${coupleId}`).emit('reminder_created', newReminder);
  res.json(newReminder);
});

app.put('/api/reminders/:id', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const { id } = req.params;
  const updates = req.body;

  const updated = db.updateReminder(id, updates);
  if (!updated) return res.status(404).json({ error: 'Reminder not found' });

  io.to(`couple:${coupleId}`).emit('reminder_updated', updated);
  res.json(updated);
});

app.delete('/api/reminders/:id', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const { id } = req.params;

  const deleted = db.deleteReminder(id);
  if (!deleted) return res.status(404).json({ error: 'Reminder not found' });

  io.to(`couple:${coupleId}`).emit('reminder_deleted', id);
  res.json({ success: true, deleted });
});

// ==================== CHECKINS ROUTES ====================
app.get('/api/checkins', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const date = req.query.date; // optional YYYY-MM-DD
  if (!coupleId) return res.json([]);

  const checkins = db.getCheckins(coupleId, date);
  res.json(checkins);
});

app.post('/api/checkins', upload.single('photo'), async (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const userId = req.headers['x-user-id'];
  const { reminderId, type, title, note, waterAmountMl, mealCategory } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'Bắt buộc phải chụp ảnh xác thực!' });
  }

  const user = db.findUserById(userId);
  let photoUrl = null;
  let fileBuffer = null;

  if (req.file.path && fs.existsSync(req.file.path)) {
    try {
      fileBuffer = fs.readFileSync(req.file.path);
    } catch (e) {
      console.warn('[Checkin Upload] Read file error:', e.message);
    }
  }

  // 1. First priority: Upload to Supabase Storage Bucket 'checkins' (Permanent CDN)
  if (isSupabaseConfigured() && fileBuffer) {
    try {
      const cloudUrl = await supabase.uploadPhoto(req.file.filename, fileBuffer, req.file.mimetype);
      if (cloudUrl) {
        photoUrl = cloudUrl;
        console.log(`[Checkin Photo] Saved to Supabase CDN: ${photoUrl}`);
      }
    } catch (e) {
      console.warn('[Checkin Upload] Supabase storage upload notice:', e.message);
    }
  }

  // 2. Second priority: If Supabase Storage CDN is blocked by RLS or bucket permissions,
  // convert to permanent Base64 Data URI stored directly in Supabase PostgreSQL!
  // This guarantees photos NEVER get lost when Render redeploys or restarts.
  if (!photoUrl && fileBuffer) {
    const base64Str = fileBuffer.toString('base64');
    photoUrl = `data:${req.file.mimetype || 'image/jpeg'};base64,${base64Str}`;
    console.log(`[Checkin Photo] Saved as permanent Base64 Data URI (${Math.round(fileBuffer.length / 1024)} KB) in Supabase PostgreSQL`);
  }

  // 3. Last fallback
  if (!photoUrl) {
    photoUrl = `/uploads/${req.file.filename}`;
  }

  const now = new Date();
  const dateStr = getTodayString();
  const timeStr = getVietnamTimeString(now);

  const checkinData = {
    id: uuidv4(),
    coupleId,
    userId,
    userName: user ? user.name : 'Em Yêu',
    reminderId: reminderId || null,
    type: type || 'water', // 'water' or 'meal'
    title: title || (type === 'water' ? 'Uống nước' : 'Ăn uống'),
    waterAmountMl: type === 'water' ? (Number(waterAmountMl) || 300) : null,
    mealCategory: type === 'meal' ? (mealCategory || 'snack') : null,
    photoUrl,
    note: note || '',
    date: dateStr,
    time: timeStr,
    createdAt: now.toISOString(),
    reactions: []
  };

  const saved = db.addCheckin(checkinData);

  // Broadcast to couple in real-time
  io.to(`couple:${coupleId}`).emit('new_checkin', saved);
  const targetCouple = db.findCoupleById(coupleId);
  if (targetCouple) {
    if (targetCouple.caretakerId) io.to(`user:${targetCouple.caretakerId}`).emit('new_checkin', saved);
    if (targetCouple.loverId) io.to(`user:${targetCouple.loverId}`).emit('new_checkin', saved);
  }

  res.json(saved);
});

// React to checkin (Like / Heart / Send compliment / Locket chat)
app.post('/api/checkins/:id/reaction', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const userId = req.headers['x-user-id'];
  const { id } = req.params;
  const { emoji, text } = req.body;

  const user = db.findUserById(userId);
  const now = new Date();
  const timeStr = getVietnamTimeString(now);

  const reaction = {
    id: `rx-${uuidv4()}`,
    userId,
    userName: user ? user.name : 'Người thương',
    role: user?.role || 'caretaker',
    emoji: emoji || '❤️',
    text: text || '',
    time: timeStr,
    createdAt: now.toISOString()
  };

  const updatedCheckin = db.addReactionToCheckin(id, reaction);
  if (!updatedCheckin) {
    return res.status(404).json({ error: 'Checkin not found' });
  }

  io.to(`couple:${coupleId}`).emit('checkin_reaction', {
    checkinId: id,
    reaction,
    checkin: updatedCheckin
  });
  const targetCouple = db.findCoupleById(coupleId);
  if (targetCouple) {
    if (targetCouple.caretakerId) io.to(`user:${targetCouple.caretakerId}`).emit('checkin_reaction', { checkinId: id, reaction, checkin: updatedCheckin });
    if (targetCouple.loverId) io.to(`user:${targetCouple.loverId}`).emit('checkin_reaction', { checkinId: id, reaction, checkin: updatedCheckin });
  }

  res.json(updatedCheckin);
});

app.delete('/api/checkins/:id', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const { id } = req.params;

  const deleted = db.deleteCheckin(id);
  if (!deleted) return res.status(404).json({ error: 'Checkin not found' });

  // Try to remove file if exists
  if (deleted.photoUrl) {
    try {
      const filePath = path.join(__dirname, '..', deleted.photoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      console.log('Error deleting file', e);
    }
  }

  io.to(`couple:${coupleId}`).emit('checkin_deleted', id);
  const targetCouple = db.findCoupleById(coupleId);
  if (targetCouple) {
    if (targetCouple.caretakerId) io.to(`user:${targetCouple.caretakerId}`).emit('checkin_deleted', id);
    if (targetCouple.loverId) io.to(`user:${targetCouple.loverId}`).emit('checkin_deleted', id);
  }
  res.json({ success: true, id });
});

// ==================== NUDGE / BUZZ ROUTE ====================
// Boyfriend triggers a real-time chime/vibration reminder to Girlfriend
app.post('/api/nudge', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  const userId = req.headers['x-user-id'];
  const { message, reminderTitle, type } = req.body;

  const user = db.findUserById(userId);
  const nudgeData = {
    id: uuidv4(),
    coupleId,
    senderId: userId,
    senderName: user ? user.name : 'Bạn trai',
    message: message || 'Bạn trai vừa nhắc bạn uống nước hoặc ăn uống đúng giờ. Nhớ chụp ảnh xác nhận nhé!',
    reminderTitle: reminderTitle || '',
    type: type || 'water',
    createdAt: new Date().toISOString()
  };

  db.addNudge(nudgeData);
  io.to(`couple:${coupleId}`).emit('nudge_alert', nudgeData);

  const targetCouple = db.findCoupleById(coupleId);
  if (targetCouple) {
    if (targetCouple.loverId) io.to(`user:${targetCouple.loverId}`).emit('nudge_alert', nudgeData);
    if (targetCouple.caretakerId) io.to(`user:${targetCouple.caretakerId}`).emit('nudge_alert', nudgeData);
  }

  res.json({ success: true, nudge: nudgeData });
});

// ==================== STATS ROUTE ====================
app.get('/api/stats', (req, res) => {
  const coupleId = req.headers['x-couple-id'];
  if (!coupleId) {
    return res.json({
      today: {
        waterMl: 0,
        targetWaterMl: 2000,
        waterPercent: 0,
        waterCount: 0,
        mealsCount: 0,
        totalCheckins: 0
      },
      currentStreak: 1,
      past7Days: []
    });
  }

  const couple = db.findCoupleById(coupleId);
  const targetWater = (couple && couple.targetWaterMl) || 2000;
  const todayStr = getTodayString();
  const allCheckins = db.getCheckins(coupleId);

  // Today checkins
  const todayCheckins = allCheckins.filter(c => c.date === todayStr);
  const waterCheckins = todayCheckins.filter(c => c.type === 'water');
  const mealCheckins = todayCheckins.filter(c => c.type === 'meal');

  const totalWaterToday = waterCheckins.reduce((acc, c) => acc + (c.waterAmountMl || 0), 0);
  const waterProgressPercent = Math.min(100, Math.round((totalWaterToday / targetWater) * 100));

  // Past 7 days streak calculation
  const past7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dStr = `${y}-${m}-${day}`;

    const dayCheckins = allCheckins.filter(c => c.date === dStr);
    const dayWater = dayCheckins.filter(c => c.type === 'water').reduce((acc, c) => acc + (c.waterAmountMl || 0), 0);
    const dayMeals = dayCheckins.filter(c => c.type === 'meal').length;

    past7Days.push({
      date: dStr,
      label: i === 0 ? 'Hôm nay' : `${day}/${m}`,
      waterMl: dayWater,
      mealsCount: dayMeals,
      completed: dayWater >= (targetWater * 0.7) || dayMeals >= 2
    });
  }

  // Calculate current streak
  let currentStreak = 0;
  for (let i = past7Days.length - 1; i >= 0; i--) {
    if (past7Days[i].completed || i === past7Days.length - 1) {
      if (past7Days[i].waterMl > 0 || past7Days[i].mealsCount > 0) {
        currentStreak++;
      }
    } else {
      break;
    }
  }

  res.json({
    today: {
      waterMl: totalWaterToday,
      targetWaterMl: targetWater,
      waterPercent: waterProgressPercent,
      waterCount: waterCheckins.length,
      mealsCount: mealCheckins.length,
      totalCheckins: todayCheckins.length
    },
    currentStreak: Math.max(1, currentStreak),
    past7Days
  });
});

// Fallback for SPA routing with strict no-cache on index.html
app.use((req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/uploads') || req.url.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(indexPath);
  }
  res.send('LoveCare API is running. Build frontend with `npm run build` or use Vite dev server.');
});

// ==================== AUTOMATED MINUTE SCHEDULER (ALARM DISPATCHER) ====================
// Runs every 25 seconds to trigger alarms at exact scheduled times
let lastTriggeredMinute = '';

setInterval(() => {
  const now = new Date();
  const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const todayStr = getTodayString();

  if (vnTimeStr === lastTriggeredMinute) return;
  lastTriggeredMinute = vnTimeStr;

  const couples = db.data.couples || [];
  couples.forEach((couple) => {
    const reminders = db.getReminders(couple.id);
    reminders.forEach((rem) => {
      if (rem.enabled && rem.time === vnTimeStr) {
        const checkins = db.getCheckins(couple.id, todayStr);
        const alreadyDone = checkins.some((c) => c.reminderId === rem.id);

        if (!alreadyDone) {
          console.log(`[Alarm Trigger] Dispatching alarm for couple ${couple.code} at ${vnTimeStr}: ${rem.title}`);
          const defaultMsg = rem.type === 'water'
            ? `💧 Đến giờ uống ${rem.waterAmountMl || 250}ml nước rồi! Vào chụp ảnh xác thực cho bạn trai nhé.`
            : `🍱 Đến giờ ăn uống rồi! Vào chụp ảnh bữa ăn cho bạn trai xem nhé.`;

          const payload = {
            reminder: rem,
            time: vnTimeStr,
            message: rem.message || defaultMsg
          };

          io.to(`couple:${couple.id}`).emit('alarm_trigger', payload);
          if (couple.loverId) {
            io.to(`user:${couple.loverId}`).emit('alarm_trigger', payload);
          }
        }
      }
    });
  });
}, 25000);

// Start server after ensuring Supabase cloud data is completely restored
async function startServer() {
  console.log('[Server] Restoring database from Supabase cloud...');
  try {
    await db.readyPromise;
  } catch (err) {
    console.warn('[Server] Supabase restore notice:', err.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Couple Care App running on http://localhost:${PORT} (Build: ${BUILD_ID})`);
  });
}

startServer();

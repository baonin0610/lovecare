import React, { useState, useEffect, useMemo } from 'react';
import {
  Droplets,
  Utensils,
  Camera,
  CheckCircle2,
  Clock,
  Calendar,
  Plus,
  BookOpen,
  Image as ImageIcon,
  Flame,
  UserCheck,
  Heart,
  MessageCircle,
  X,
  Sunrise,
  Sun,
  Moon,
  ChevronDown,
  BellRing,
  Lock
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ReactionModal } from './ReactionModal';
import { DailySetlogView } from './DailySetlogView';
import { AlarmSettingsModal } from './AlarmSettingsModal';
import { CuteAnimatedCat } from './CuteAnimatedCat';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { alarm } from '../services/alarm';
import { getLocalTodayString, isCheckinFromToday, getCheckinDateString, groupRemindersBySession, getCurrentSessionId, isReminderExpired, isReminderUpcoming } from '../services/date';

export const LoverView = () => {
  const { user, couple, socket, showToast, testAlarm } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Accordion state for schedule sections: only current session expanded by default
  const [expandedSessions, setExpandedSessions] = useState(() => {
    const current = getCurrentSessionId();
    return {
      morning: current === 'morning',
      afternoon: current === 'afternoon',
      evening: current === 'evening'
    };
  });

  const toggleSession = (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Modals
  const [activeSnapReminder, setActiveSnapReminder] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'setlog', 'album'
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [notifiedSlots, setNotifiedSlots] = useState({});

  // Keep track of current time every 5 seconds for glowing active time slot
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeFormatted = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Determine current active reminder slot (closest or within window)
  const currentSlotReminderId = useMemo(() => {
    if (!reminders || reminders.length === 0) return null;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    let closestRem = null;
    let minDiff = Infinity;

    for (const rem of reminders) {
      if (!rem.time) continue;
      const [h, m] = rem.time.split(':').map(Number);
      const remMinutes = h * 60 + m;
      const diff = Math.abs(nowMinutes - remMinutes);

      if (diff < minDiff) {
        minDiff = diff;
        closestRem = rem;
      }
    }

    if (closestRem && minDiff <= 60) {
      return closestRem.id;
    }
    return closestRem ? closestRem.id : null;
  }, [reminders, currentTime]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rems, chks, st] = await Promise.all([
        api.getReminders(user, couple),
        api.getCheckins(user, couple),
        api.getStats(user, couple)
      ]);
      setReminders(Array.isArray(rems) ? rems : []);
      setCheckins(Array.isArray(chks) ? chks : []);
      setStats(st && !st.error ? st : null);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [couple?.id]);

  // Real-time Socket Synchronization for Checkins and Reminders without needing to reload page
  useEffect(() => {
    if (!socket) return;

    const handleNewCheckin = (newCheckin) => {
      setCheckins((prev) => {
        if (prev.some((c) => c.id === newCheckin.id)) return prev;
        return [newCheckin, ...prev];
      });
      // Refresh stats in background
      api.getStats(user, couple).then((st) => {
        if (st && !st.error) setStats(st);
      }).catch(console.error);
    };

    const handleReaction = ({ checkinId, reaction, checkin }) => {
      setCheckins((prev) =>
        prev.map((c) => {
          if (c.id === checkinId) {
            return checkin || {
              ...c,
              reactions: [...(c.reactions || []), reaction]
            };
          }
          return c;
        })
      );
      setSelectedCheckin((curr) => {
        if (curr && curr.id === checkinId) {
          return checkin || {
            ...curr,
            reactions: [...(curr.reactions || []), reaction]
          };
        }
        return curr;
      });
    };

    const handleDeleteCheckinEvent = (deletedId) => {
      setCheckins((prev) => prev.filter((c) => c.id !== deletedId));
      setSelectedCheckin((curr) => (curr && curr.id === deletedId ? null : curr));
      api.getStats(user, couple).then((st) => {
        if (st && !st.error) setStats(st);
      }).catch(console.error);
    };

    const handleNewReminder = (newRem) => {
      setReminders((prev) => {
        if (prev.some((r) => r.id === newRem.id)) return prev;
        return [...prev, newRem].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      });
    };

    const handleUpdateReminder = (updRem) => {
      setReminders((prev) => prev.map((r) => (r.id === updRem.id ? updRem : r)));
    };

    const handleDeleteReminderEvent = (delId) => {
      setReminders((prev) => prev.filter((r) => r.id !== delId));
    };

    socket.on('new_checkin', handleNewCheckin);
    socket.on('checkin_reaction', handleReaction);
    socket.on('checkin_deleted', handleDeleteCheckinEvent);
    socket.on('reminder_created', handleNewReminder);
    socket.on('reminder_updated', handleUpdateReminder);
    socket.on('reminder_deleted', handleDeleteReminderEvent);

    return () => {
      socket.off('new_checkin', handleNewCheckin);
      socket.off('checkin_reaction', handleReaction);
      socket.off('checkin_deleted', handleDeleteCheckinEvent);
      socket.off('reminder_created', handleNewReminder);
      socket.off('reminder_updated', handleUpdateReminder);
      socket.off('reminder_deleted', handleDeleteReminderEvent);
    };
  }, [socket, user, couple]);

  const handleOpenSnap = (reminder) => {
    if (reminder?.time && isReminderUpcoming(reminder.time)) {
      showToast(`Chưa đến giờ (${reminder.time}), bạn đợi đúng giờ rồi chụp nhé! ❤️`);
      return;
    }
    if (reminder?.time && !getReminderCheckin(reminder) && isReminderExpired(reminder.time, 30)) {
      showToast('Mốc giờ này đã qua, không thể nộp ảnh bổ sung.');
      return;
    }
    setActiveSnapReminder(reminder);
    setIsCameraOpen(true);
  };

  const handleCompleteCheckin = async (formData) => {
    const saved = await api.createCheckin(user, couple, formData);
    showToast('Đã gửi ảnh xác thực thành công.');
    if (saved && !saved.error) {
      setCheckins((prev) => {
        if (prev.some((c) => c.id === saved.id)) return prev;
        return [saved, ...prev];
      });
    }
    await loadData();
  };

  const handleReact = async (checkinId, reaction) => {
    const updated = await api.reactToCheckin(user, couple, checkinId, reaction);
    if (updated && !updated.error) {
      setCheckins((prev) => prev.map((c) => (c.id === checkinId ? updated : c)));
      setSelectedCheckin(updated);
    }
    return updated;
  };

  const handleDeleteCheckin = async (checkinId) => {
    await api.deleteCheckin(user, couple, checkinId);
    showToast('Đã xóa lượt check-in.');
    setCheckins((prev) => prev.filter((c) => c.id !== checkinId));
    setSelectedCheckin(null);
    await loadData();
  };

  // Automatic midnight reset tracker: cleans schedule immediately at 00:00 without page reload
  const [currentDayStr, setCurrentDayStr] = useState(() => getLocalTodayString());

  useEffect(() => {
    const dayCheckTimer = setInterval(() => {
      const newDayStr = getLocalTodayString();
      if (newDayStr !== currentDayStr) {
        console.log(`[Day Reset] Date changed from ${currentDayStr} to ${newDayStr}. Refreshing today schedule.`);
        setCurrentDayStr(newDayStr);
        loadData();
      }
    }, 15000);
    return () => clearInterval(dayCheckTimer);
  }, [currentDayStr]);

  const getReminderCheckin = (reminder) => {
    // 1. Strict filter: ONLY checkins from TODAY in Vietnam calendar can fulfill today's schedule!
    const todayCheckins = checkins.filter(isCheckinFromToday);

    // 2. Direct match by reminderId on today
    const direct = todayCheckins.find(
      (c) => (c.reminderId && c.reminderId === reminder.id) || (c.reminder_id && c.reminder_id === reminder.id)
    );
    if (direct) return direct;

    // 3. Proximity match by time (within 45 mins) and type — ONLY among TODAY'S checkins!
    if (reminder.time) {
      const [rH, rM] = reminder.time.split(':').map(Number);
      const rMinutes = rH * 60 + rM;

      return todayCheckins.find((c) => {
        if (c.type !== reminder.type) return false;
        if (!c.time) return false;
        const [cH, cM] = c.time.split(':').map(Number);
        const cMinutes = cH * 60 + cM;
        return Math.abs(cMinutes - rMinutes) <= 45;
      });
    }
    return null;
  };

  // Local backup alarm check: notifies girlfriend on exact minute if uncompleted
  useEffect(() => {
    if (!reminders || reminders.length === 0) return;
    const today = getLocalTodayString();
    const currentSlotKey = `${today}_${currentTimeFormatted}`;

    if (notifiedSlots[currentSlotKey]) return;

    for (const rem of reminders) {
      if (rem.enabled && rem.time === currentTimeFormatted) {
        const completed = getReminderCheckin(rem);
        if (!completed) {
          setNotifiedSlots((prev) => ({ ...prev, [currentSlotKey]: true }));
          const notifTitle = `⏰ Đến giờ: ${rem.title} (${rem.time})`;
          const notifBody = rem.type === 'water'
            ? `💧 Uống ngay ${rem.waterAmountMl || 250}ml nước và chụp ảnh xác thực cho bạn trai nhé!`
            : `🍱 Đến giờ ăn uống rồi! Hãy ăn uống đầy đủ và chụp ảnh bữa ăn gửi bạn trai nhé! ❤️`;

          alarm.sendPhoneNotification(notifTitle, notifBody, `alarm-${rem.id}-${currentTimeFormatted}`);
          break;
        }
      }
    }
  }, [currentTimeFormatted, reminders, checkins, notifiedSlots]);

  const waterToday = stats?.today?.waterMl || 0;
  const targetWater = stats?.today?.targetWaterMl || 2000;
  const waterPercent = Math.min(100, Math.round((waterToday / targetWater) * 100));

  const loverName = user?.name || couple?.loverName || (couple?.name ? couple.name.split('&')[0].trim() : 'Bạn gái');
  const caretakerName = couple?.caretakerName || (couple?.name?.includes('&') ? couple.name.split('&')[1]?.trim() : 'Bạn trai');

  // Group reminders into SÁNG - CHIỀU - TỐI in chronological order
  const scheduleSections = useMemo(() => {
    return groupRemindersBySession(reminders, getReminderCheckin);
  }, [reminders, checkins]);

  return (
    <div className="pb-24">
      {/* If Not Connected: Show Girlfriend's Code to Send to Boyfriend */}
      {!couple?.caretakerId && couple?.code && (
        <div className="bg-gradient-to-r from-rose-50 via-white to-pink-50 rounded-3xl p-5 border-2 border-rose-300 shadow-md mb-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-rose-600 block uppercase tracking-wider mb-1">
                Mã kết nối riêng của bạn
              </span>
              <span className="text-2xl font-mono font-black text-gray-900 tracking-wider">
                {couple.code}
              </span>
              <p className="text-xs text-gray-500 mt-1">
                Gửi mã này cho bạn trai để 2 bạn kết nối với nhau nhé
              </p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(couple.code);
                showToast(`Đã sao chép mã kết nối: ${couple.code}`);
              }}
              className="px-4 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-xs font-bold shadow-md shadow-rose-500/25 active:scale-95 transition shrink-0"
            >
              Sao chép mã
            </button>
          </div>
        </div>
      )}

      {/* Overview Card - Minimalist Apple Health Style */}
      <div className="bg-gradient-to-br from-white via-rose-50/30 to-pink-50/20 rounded-3xl p-5 sm:p-6 shadow-sm border border-rose-100 mb-5 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-44 h-44 bg-rose-200/25 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-start gap-3 sm:gap-4">
            {/* Animated Cute Kitten Character waving */}
            <CuteAnimatedCat size={56} className="shrink-0 -mt-1 hover:scale-105 transition-transform" />

            <div>
              {/* Couple Tag Badge */}
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 uppercase tracking-wider bg-rose-50 border border-rose-200/70 px-2.5 py-0.5 rounded-full mb-1">
                <Heart className="w-3 h-3 fill-rose-500 text-rose-500 animate-pulse shrink-0" />
                <span>{loverName} &amp; {caretakerName}</span>
              </div>

              {/* Refined softer greeting typography */}
              <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight leading-snug flex items-center gap-1">
                <span>Chào {loverName && loverName.toLowerCase().includes('duyen') ? 'Duyên' : (loverName || 'Duyên')}, ngày mới vui vẻ nhé!</span>
                <span className="text-amber-400 inline-block animate-pulse">✨</span>
              </h2>
              <p className="text-[11px] text-gray-500 mt-0.5 font-normal">
                Uống đủ nước và ăn uống đầy đủ để giữ gìn sức khỏe nhé em yêu ❤️
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/90 border border-rose-200/70 text-xs font-semibold text-gray-700 shadow-xs shrink-0 self-start">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
            <span>Chuỗi {stats?.currentStreak || 1} ngày</span>
          </div>
        </div>

        {/* Water Progress Summary */}
        <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 mb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                <Droplets className="w-4 h-4 fill-white" />
              </div>
              <div>
                <span className="text-xs font-semibold text-sky-900 block">Lượng nước hôm nay</span>
                <span className="text-sm font-bold text-sky-950">
                  {waterToday.toLocaleString()} / {targetWater.toLocaleString()} ml
                </span>
              </div>
            </div>

            <button
              onClick={() => handleOpenSnap({ type: 'water', title: 'Uống nước phát sinh', waterAmountMl: 250 })}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold flex items-center gap-1 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm cốc
            </button>
          </div>

          {/* Clean Progress Bar */}
          <div className="w-full bg-sky-200/70 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${waterPercent}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[11px] font-medium text-sky-700/70 mt-1.5">
            <span>Tiến độ: {waterPercent}%</span>
            <span>Còn {Math.max(0, targetWater - waterToday)} ml</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-2xl mb-5">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'tasks'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Lịch hôm nay ({reminders.length})
        </button>
        <button
          onClick={() => setActiveTab('setlog')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'setlog'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Setlog ngày
        </button>
        <button
          onClick={() => setActiveTab('album')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'album'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Kho ảnh ({checkins.length})
        </button>
      </div>

      {/* TAB 1: Tasks Today (Lịch Hôm Nay theo SÁNG - CHIỀU - TỐI) */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Live Realtime Tracker Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-white border border-gray-200/80 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-gray-500 font-medium">Bây giờ:</span>
              <span className="font-mono font-bold text-gray-900 text-sm">{currentTimeFormatted}</span>
            </div>

            <div className="flex items-center gap-2">
              {currentSlotReminderId && (
                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  Đang ở khung giờ
                </span>
              )}

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[11px] border border-gray-200 flex items-center gap-1 active:scale-95 transition"
                title="Cài đặt thông báo bắt buộc toàn màn hình"
              >
                <BellRing className="w-3.5 h-3.5 text-rose-500" /> Báo thức
              </button>
            </div>
          </div>

          {scheduleSections.map((section) => {
            const isMorning = section.id === 'morning';
            const isAfternoon = section.id === 'afternoon';
            const isEvening = section.id === 'evening';
            const isExpanded = !!expandedSessions[section.id];
            const isCurrentSession = getCurrentSessionId() === section.id;

            return (
              <div key={section.id} className="space-y-2.5">
                {/* Section Header with Click to Expand / Collapse */}
                <button
                  type="button"
                  onClick={() => toggleSession(section.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-semibold transition active:scale-[0.99] select-none ${
                    isMorning
                      ? 'bg-amber-50/80 border-amber-200/90 text-amber-900 hover:bg-amber-100/70'
                      : isAfternoon
                      ? 'bg-orange-50/80 border-orange-200/90 text-orange-900 hover:bg-orange-100/70'
                      : 'bg-indigo-50/80 border-indigo-200/90 text-indigo-900 hover:bg-indigo-100/70'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isMorning && <Sunrise className="w-4 h-4 text-amber-600 shrink-0" />}
                    {isAfternoon && <Sun className="w-4 h-4 text-orange-600 shrink-0" />}
                    {isEvening && <Moon className="w-4 h-4 text-indigo-600 shrink-0" />}
                    <span className="font-bold tracking-wider">{section.shortTitle} • {section.title}</span>
                    <span className="text-[11px] opacity-70 font-normal">({section.timeRange})</span>
                    {isCurrentSession && (
                      <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-gray-800 shadow-sm border border-gray-200/60">
                        Buổi hiện tại
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                        section.items.length > 0 && section.completedCount === section.items.length
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white/90 border border-current/20 text-gray-700'
                      }`}
                    >
                      {section.completedCount}/{section.items.length} xong
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 opacity-60 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* Items in section (Collapsed unless isExpanded) */}
                {isExpanded && (
                  section.items.length === 0 ? (
                    <div className="py-3 px-4 rounded-xl bg-white/60 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                      Không có mốc nhắc trong {section.title.toLowerCase()}
                    </div>
                  ) : (
                  <div className="space-y-2.5">
                    {section.items.map((reminder) => {
                      const completedCheckin = getReminderCheckin(reminder);
                      const isCompleted = !!completedCheckin;
                      const isWater = reminder.type === 'water';
                      const isCurrentSlot = reminder.id === currentSlotReminderId;
                      const isExpired = !isCompleted && isReminderExpired(reminder.time, 30);
                      const isUpcoming = !isCompleted && !isExpired && isReminderUpcoming(reminder.time);

                      return (
                        <div
                          key={reminder.id}
                          className={`rounded-2xl p-4 transition-all duration-300 relative ${
                            isExpired
                              ? 'opacity-50 grayscale-[35%] bg-gray-100/70 border border-gray-200'
                              : isCurrentSlot
                              ? isCompleted
                                ? 'bg-emerald-50/40 border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md'
                                : 'bg-gradient-to-r from-rose-50/60 via-white to-pink-50/40 border-2 border-rose-500 ring-4 ring-rose-500/20 shadow-xl shadow-rose-500/15'
                              : isCompleted
                              ? 'bg-gray-50/70 border border-gray-200'
                              : isUpcoming
                              ? 'bg-white/90 border border-gray-200 shadow-xs'
                              : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-500 text-white'
                                    : isExpired
                                    ? 'bg-gray-300 text-gray-600'
                                    : isCurrentSlot
                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                                    : isWater
                                    ? 'bg-sky-100 text-sky-600'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2 className="w-5 h-5" />
                                ) : isWater ? (
                                  <Droplets className="w-5 h-5" />
                                ) : (
                                  <Utensils className="w-5 h-5" />
                                )}
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                                      isExpired
                                        ? 'bg-gray-200 text-gray-600'
                                        : isCurrentSlot
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {reminder.time}
                                  </span>

                                  {isCurrentSlot && !isExpired && (
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 tracking-wide ${
                                        isCompleted
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                                      }`}
                                    >
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isCompleted ? 'bg-emerald-500' : 'bg-white animate-ping'
                                        }`}
                                      />
                                      Khung giờ hiện tại
                                    </span>
                                  )}

                                  {isWater && reminder.waterAmountMl && !reminder.title.toLowerCase().includes('ăn') && !reminder.title.toLowerCase().includes('bữa') && (
                                    <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                                      {reminder.waterAmountMl} ml
                                    </span>
                                  )}
                                </div>

                                <h4
                                  className={`font-semibold text-sm mt-1.5 ${
                                    isCompleted
                                      ? 'text-gray-500 line-through'
                                      : isExpired
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {reminder.title}
                                </h4>

                                {isExpired ? (
                                  <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1 font-medium">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    Đã qua khung giờ nộp ảnh
                                  </p>
                                ) : isUpcoming ? (
                                  <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1 font-medium">
                                    <Lock className="w-3 h-3 text-gray-400" />
                                    Chưa đến giờ (sẽ mở chụp lúc {reminder.time})
                                  </p>
                                ) : reminder.message ? (
                                  <p className="text-xs text-gray-500 mt-0.5">{reminder.message}</p>
                                ) : null}
                              </div>
                            </div>

                            {/* Action button */}
                            <div>
                              {isCompleted ? (
                                <button
                                  onClick={() => setSelectedCheckin(completedCheckin)}
                                  className="relative w-11 h-11 rounded-xl overflow-hidden border border-emerald-400 shadow-sm active:scale-95 transition"
                                  title="Xem ảnh đã chụp"
                                >
                                  <img
                                    src={completedCheckin.photoUrl}
                                    alt="Checkin"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                                  </div>
                                </button>
                              ) : isExpired ? (
                                <button
                                  disabled
                                  className="py-2.5 px-3.5 bg-gray-200 text-gray-400 font-bold text-xs rounded-xl cursor-not-allowed flex items-center gap-1.5"
                                  title="Đã quá giờ, không thể chụp ảnh bù"
                                >
                                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                                  <span>Đã quá giờ</span>
                                </button>
                              ) : isUpcoming ? (
                                <button
                                  disabled
                                  className="py-2 px-3 bg-gray-100 text-gray-400 font-semibold text-xs rounded-xl border border-gray-200 cursor-not-allowed flex items-center gap-1.5 opacity-80"
                                  title={`Chưa đến giờ (${reminder.time}), chỉ khi tới giờ mới được chụp ảnh`}
                                >
                                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                                  <span>Chưa tới giờ</span>
                                </button>
                              ) : isCurrentSlot ? (
                                <button
                                  onClick={() => handleOpenSnap(reminder)}
                                  className="py-2.5 px-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/30 flex items-center gap-1.5 active:scale-95 transition"
                                >
                                  <Camera className="w-3.5 h-3.5" /> Chụp ngay
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenSnap(reminder)}
                                  className="py-2 px-3.5 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1.5 active:scale-95 transition"
                                >
                                  <Camera className="w-3.5 h-3.5" /> Chụp ảnh
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
              </div>
            );
          })}

          {reminders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <p className="text-xs text-gray-500">Chưa có lịch nhắc nhở nào.</p>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Setlog Daily View */}
      {activeTab === 'setlog' && (
        <DailySetlogView
          checkins={checkins}
          reminders={reminders}
          onSelectCheckin={(chk) => setSelectedCheckin(chk)}
          targetWaterMl={targetWater}
        />
      )}

      {/* TAB 3: Album & Timeline Feed */}
      {activeTab === 'album' && (
        <div className="space-y-4">
          {checkins.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm">Chưa có ảnh xác thực</h4>
              <p className="text-xs text-gray-500 mt-1">
                Bấm vào các mốc nhắc nhở để chụp ảnh xác nhận nhé.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {checkins.map((checkin) => (
                <div
                  key={checkin.id}
                  onClick={() => setSelectedCheckin(checkin)}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-200 cursor-pointer active:scale-98 transition shadow-sm"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden relative">
                    <img
                      src={checkin.photoUrl}
                      alt={checkin.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {checkin.time}
                    </div>

                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-md text-gray-800 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                      {checkin.type === 'water' ? `${checkin.waterAmountMl}ml` : 'Bữa ăn'}
                    </div>
                  </div>

                  <div className="p-2.5">
                    <h5 className="font-semibold text-gray-900 text-xs truncate">{checkin.title}</h5>
                    {checkin.note && (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">"{checkin.note}"</p>
                    )}

                    {/* Reaction count & Locket latest preview */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-rose-600 font-semibold">
                      <span className="flex items-center gap-1 truncate max-w-[75%]">
                        <Heart className="w-3.5 h-3.5 fill-rose-500 shrink-0" />
                        <span className="truncate">
                          {checkin.reactions && checkin.reactions.length > 0
                            ? `${checkin.reactions.length} phản hồi`
                            : 'Phản hồi Locket'}
                        </span>
                      </span>
                      <span className="text-gray-400 group-hover:text-gray-700 shrink-0">Xem &gt;</span>
                    </div>

                    {checkin.reactions && checkin.reactions.length > 0 && (
                      <div className="mt-1.5 px-2 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[10px] text-gray-600 truncate flex items-center gap-1">
                        <span className="font-semibold text-gray-800 shrink-0">
                          {checkin.reactions[checkin.reactions.length - 1].userName}:
                        </span>
                        <span className="truncate">
                          {checkin.reactions[checkin.reactions.length - 1].text}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button for Quick Snap */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => handleOpenSnap({ type: 'water', title: 'Uống nước phát sinh', waterAmountMl: 300 })}
          className="w-14 h-14 rounded-full bg-gray-900 text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition"
          title="Chụp ảnh xác thực"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        reminder={activeSnapReminder}
        onComplete={handleCompleteCheckin}
      />

      {/* Reaction / Detail View Modal */}
      <ReactionModal
        checkin={selectedCheckin}
        isOpen={!!selectedCheckin}
        onClose={() => setSelectedCheckin(null)}
        onReact={handleReact}
        onDelete={handleDeleteCheckin}
      />

      {/* Alarm & Mandatory Notification Settings Modal */}
      <AlarmSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onTestAlarm={testAlarm}
      />
    </div>
  );
};

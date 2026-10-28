import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  Plus,
  Droplets,
  Utensils,
  Flame,
  CheckCircle2,
  Trash2,
  Calendar,
  Send,
  Eye,
  Sliders,
  Copy,
  BookOpen,
  Clock,
  Heart,
  Sunrise,
  Sun,
  Moon,
  ChevronDown
} from 'lucide-react';
import { AddReminderModal } from './AddReminderModal';
import { ReactionModal } from './ReactionModal';
import { DailySetlogView } from './DailySetlogView';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';
import { getLocalTodayString, groupRemindersBySession, getCurrentSessionId, isReminderExpired } from '../services/date';

export const CaretakerView = () => {
  const { user, couple, socket, showToast, login } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

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

  // Couple pairing by code from girlfriend
  const [connectCodeInput, setConnectCodeInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');

  // Modals & Navigation
  const [activeTab, setActiveTab] = useState('schedule'); // Default to 'schedule' (Lịch hôm nay)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [customNudgeText, setCustomNudgeText] = useState('');
  const [selectedReminderForNudge, setSelectedReminderForNudge] = useState('');
  const [nudgingId, setNudgingId] = useState(null);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentTimeFormatted = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

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

  // Target water editing
  const [targetWater, setTargetWater] = useState(couple?.targetWaterMl || 2000);

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

  const handleAddReminder = async (data) => {
    await api.createReminder(user, couple, data);
    showToast('Đã thêm mốc nhắc nhở mới.');
    await loadData();
  };

  const handleDeleteReminder = async (id) => {
    if (window.confirm('Bạn có chắc muốn xóa mốc nhắc này không?')) {
      await api.deleteReminder(user, couple, id);
      showToast('Đã xóa mốc nhắc.');
      await loadData();
    }
  };

  const handleToggleReminder = async (reminder) => {
    await api.updateReminder(user, couple, reminder.id, { enabled: !reminder.enabled });
    await loadData();
  };

  const handleSendNudge = async () => {
    sounds.playNudge();
    await api.sendNudge(user, couple, {
      message: customNudgeText || 'Đến giờ uống nước/ăn uống rồi bạn nhé. Nhớ chụp ảnh xác nhận nha!',
      reminderTitle: selectedReminderForNudge || 'Nhắc nhở sức khỏe'
    });
    showToast('Đã gửi thông báo nhắc nhở đến bạn gái.');
    setIsNudgeOpen(false);
    setCustomNudgeText('');
  };

  const getReminderCheckin = (reminder) => {
    const today = getLocalTodayString();
    // 1. Direct match by reminderId on today
    const direct = checkins.find((c) => c.reminderId === reminder.id && c.date === today);
    if (direct) return direct;

    // 2. Proximity match by time (within 45 mins) and type
    if (reminder.time) {
      const [rH, rM] = reminder.time.split(':').map(Number);
      const rMinutes = rH * 60 + rM;

      return checkins.find((c) => {
        if (c.date !== today || c.type !== reminder.type) return false;
        if (!c.time) return false;
        const [cH, cM] = c.time.split(':').map(Number);
        const cMinutes = cH * 60 + cM;
        return Math.abs(cMinutes - rMinutes) <= 45;
      });
    }
    return null;
  };

  const handleQuickNudge = async (rem) => {
    try {
      setNudgingId(rem.id);
      sounds.playNudge();

      const isWater = rem.type === 'water';
      const defaultMsg = isWater
        ? `Anh nhắc em: Đến giờ ${rem.title} (${rem.time}) rồi nha! Mau uống ${rem.waterAmountMl || 250}ml nước và chụp ảnh gửi anh nhé! ❤️`
        : `Anh nhắc em: Đến giờ ${rem.title} (${rem.time}) rồi nè! Ăn uống đầy đủ và chụp ảnh gửi anh xem nhé! ❤️`;

      const message = rem.message ? `${rem.message} - ${defaultMsg}` : defaultMsg;

      await api.sendNudge(user, couple, {
        message,
        reminderTitle: `${rem.title} (${rem.time})`,
        type: rem.type
      });

      showToast(`Đã gửi thông báo nhắc bạn gái: ${rem.title} (${rem.time})!`);
    } catch (err) {
      console.error('Quick nudge error:', err);
      showToast('Không thể gửi thông báo nhắc, vui lòng thử lại.');
    } finally {
      setNudgingId(null);
    }
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

  const handleCopyCode = () => {
    if (couple?.code) {
      navigator.clipboard.writeText(couple.code);
      showToast(`Đã sao chép mã kết nối: ${couple.code}`);
    }
  };

  const handleSaveWaterTarget = async (amt) => {
    setTargetWater(amt);
    await api.updateWaterTarget(user, couple, amt);
    showToast(`Đã lưu mục tiêu nước: ${amt}ml`);
    await loadData();
  };

  const isConnected = !!(couple && couple.loverId);

  const handleConnectGirlfriend = async (e) => {
    e.preventDefault();
    if (!connectCodeInput.trim()) return;
    setConnecting(true);
    setConnectError('');

    try {
      const res = await fetch('/api/couple/connect-by-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ code: connectCodeInput.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Mã kết nối không hợp lệ');
      }

      login(data.user, data.couple);
      showToast(`Đã kết nối với bạn gái tên: ${data.loverName || 'Bạn gái'}`);
      sounds.playSuccess();
      setConnectCodeInput('');
      await loadData();
    } catch (err) {
      setConnectError(err.message);
    } finally {
      setConnecting(false);
    }
  };

  const waterToday = stats?.today?.waterMl || 0;
  const currentTarget = stats?.today?.targetWaterMl || targetWater;
  const waterPercent = Math.min(100, Math.round((waterToday / currentTarget) * 100));

  const loverName = couple?.loverName || (couple?.name ? couple.name.split('&')[0].trim() : 'Bạn gái');
  const caretakerName = user?.name || couple?.caretakerName || (couple?.name?.includes('&') ? couple.name.split('&')[1]?.trim() : 'Bạn trai');

  // Group reminders into SÁNG - CHIỀU - TỐI in chronological order
  const scheduleSections = useMemo(() => {
    return groupRemindersBySession(reminders, getReminderCheckin);
  }, [reminders, checkins]);

  return (
    <div className="pb-24">
      {/* If Not Connected: Enter Girlfriend's Code Card */}
      {!isConnected && (
        <div className="bg-gradient-to-br from-rose-50 via-white to-pink-50 rounded-3xl p-5 border-2 border-rose-400 shadow-md mb-5">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-sm mb-1.5">
            <Heart className="w-4 h-4 fill-rose-500" />
            <span>Kết nối với bạn gái</span>
          </div>
          <p className="text-xs text-gray-600 mb-3.5 leading-relaxed">
            Bạn gái sẽ có một mã riêng (dạng <span className="font-mono font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200">LC-XXXX</span>). Hãy nhập mã để bắt đầu quản lý và nhắc nhở:
          </p>

          <form onSubmit={handleConnectGirlfriend} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="VD: LC-8392"
                value={connectCodeInput}
                onChange={(e) => setConnectCodeInput(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-2xl font-mono font-bold text-center tracking-widest text-gray-900 focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 uppercase text-sm"
                required
              />
              <button
                type="submit"
                disabled={connecting}
                className="px-5 py-3 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/25 flex items-center justify-center gap-1.5 active:scale-95 transition shrink-0"
              >
                {connecting ? 'Đang kết nối...' : 'Kết nối ngay'}
              </button>
            </div>
            {connectError && (
              <p className="text-xs text-rose-600 font-semibold">{connectError}</p>
            )}
          </form>
        </div>
      )}

      {/* Overview Card - Minimal Dark Theme */}
      <div className="rounded-3xl bg-gray-900 text-white p-6 shadow-xl mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400 uppercase tracking-wider mb-0.5">
              <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400 shrink-0" />
              <span>{loverName} &amp; {caretakerName}</span>
            </div>
            <h2 className="text-xl font-bold mt-0.5 tracking-tight">
              Theo dõi bạn gái {loverName}
            </h2>
          </div>

          {/* Quick Buzz Button */}
          <button
            onClick={() => setIsNudgeOpen(true)}
            className="py-2 px-3.5 bg-rose-500 hover:bg-rose-600 rounded-xl font-semibold text-xs shadow-md flex items-center gap-1.5 active:scale-95 transition"
          >
            <Bell className="w-4 h-4 fill-white" /> Nhắc nhở ngay
          </button>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-3 gap-2.5 mt-4">
          {/* Water */}
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-sky-300 font-semibold block mb-1">
              Nước hôm nay
            </span>
            <p className="text-base font-bold font-mono">
              {waterToday} <span className="text-xs font-normal text-sky-200">/ {currentTarget}ml</span>
            </p>
            <div className="w-full bg-white/20 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-sky-400 h-full rounded-full" style={{ width: `${waterPercent}%` }} />
            </div>
          </div>

          {/* Meals */}
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-amber-300 font-semibold block mb-1">
              Bữa ăn đã nộp
            </span>
            <p className="text-base font-bold font-mono">
              {stats?.today?.mealsCount || 0} <span className="text-xs font-normal text-amber-200">bữa</span>
            </p>
            <p className="text-[10px] text-amber-200 mt-1">Đã có ảnh xác thực</p>
          </div>

          {/* Streak */}
          <div className="bg-white/10 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-rose-300 font-semibold block mb-1">
              Chuỗi ngày
            </span>
            <p className="text-base font-bold font-mono text-rose-300">
              {stats?.currentStreak || 1} <span className="text-xs font-normal text-rose-200">ngày</span>
            </p>
            <p className="text-[10px] text-rose-200 mt-1">Đúng giờ liên tục</p>
          </div>
        </div>

        {/* Couple Code Sharing */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-gray-300">
            Mã kết nối: <strong className="text-white font-mono bg-white/15 px-2 py-0.5 rounded-md">{couple?.code}</strong>
          </span>
          <button
            onClick={handleCopyCode}
            className="text-gray-300 hover:text-white flex items-center gap-1 font-medium transition"
          >
            <Copy className="w-3.5 h-3.5" /> Sao chép mã
          </button>
        </div>
      </div>

      {/* Navigation Tabs for Caretaker */}
      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-2xl mb-5">
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'schedule'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Lịch hôm nay ({reminders.length})
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'feed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Eye className="w-3.5 h-3.5" /> Bằng chứng ({checkins.length})
        </button>
        <button
          onClick={() => setActiveTab('setlog')}
          className={`flex-1 py-2.5 rounded-xl font-semibold text-xs transition flex items-center justify-center gap-1.5 ${
            activeTab === 'setlog'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Setlog từng ngày
        </button>
      </div>

      {/* TAB 1: Setlog View */}
      {activeTab === 'setlog' && (
        <div className="mb-6">
          <DailySetlogView
            checkins={checkins}
            reminders={reminders}
            onSelectCheckin={(chk) => setSelectedCheckin(chk)}
            targetWaterMl={currentTarget}
          />
        </div>
      )}

      {/* TAB 2: Verification Photo Feed / Album (Album Bằng Chứng) */}
      {activeTab === 'feed' && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-gray-600" /> Ảnh bằng chứng của bạn gái ({checkins.length})
              </h3>
              <p className="text-xs text-gray-500">Chụp ảnh xác thực thời gian thực</p>
            </div>
          </div>

          {checkins.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-gray-100">
              <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-gray-800">Chưa có ảnh bằng chứng nào</p>
              <p className="text-xs text-gray-500 mt-1">
                Bấm nút "Nhắc nhở ngay" để giục bạn gái chụp ảnh check-in nhé.
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

      {/* TAB 1: Schedule Management Section (Lịch Hôm Nay) */}
      {activeTab === 'schedule' && (
        <>
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Lịch hôm nay của bạn gái
                </h3>
                <p className="text-xs text-gray-500">Theo dõi các mốc giờ và gửi nhắc nhở giục bạn gái chụp ảnh</p>
              </div>

              <button
                onClick={() => setIsAddOpen(true)}
                className="py-1.5 px-3 bg-gray-900 hover:bg-black text-white rounded-xl font-semibold text-xs shadow-sm flex items-center gap-1 active:scale-95 transition"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm mốc giờ
              </button>
            </div>

            {/* Live Clock Bar for Caretaker */}
            <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-gray-50 border border-gray-200/80 mb-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-gray-500 font-medium">Bây giờ:</span>
                <span className="font-mono font-bold text-gray-900">{currentTimeFormatted}</span>
              </div>
              <span className="text-[11px] font-medium text-gray-500">Mốc giờ hiện tại có viền hồng</span>
            </div>

            <div className="space-y-4">
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

                    {/* Reminders inside this session (Collapsed unless isExpanded) */}
                    {isExpanded && (
                      section.items.length === 0 ? (
                        <div className="py-3 px-4 rounded-xl bg-white/60 border border-dashed border-gray-200 text-center text-xs text-gray-400">
                          Không có mốc nhắc trong {section.title.toLowerCase()}
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {section.items.map((rem) => {
                            const isWater = rem.type === 'water';
                            const isCurrentSlot = rem.id === currentSlotReminderId;
                            const completedCheckin = getReminderCheckin(rem);
                            const isCompleted = !!completedCheckin;
                            const isExpired = !isCompleted && isReminderExpired(rem.time, 30);

                            return (
                              <div
                                key={rem.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl transition-all duration-300 gap-3 relative ${
                                  isExpired
                                    ? 'opacity-50 grayscale-[35%] bg-gray-100/70 border border-gray-200'
                                    : isCurrentSlot
                                    ? isCompleted
                                      ? 'bg-emerald-50/40 border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-sm'
                                      : 'bg-gradient-to-r from-rose-50/70 via-white to-pink-50/40 border-2 border-rose-500 ring-4 ring-rose-500/20 shadow-md shadow-rose-500/10'
                                    : isCompleted
                                    ? 'bg-gray-50/80 border border-gray-200'
                                    : 'bg-white border border-gray-200 shadow-sm'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                      isCompleted
                                        ? 'bg-emerald-500 text-white'
                                        : isExpired
                                        ? 'bg-gray-300 text-gray-600'
                                        : isCurrentSlot
                                        ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                                        : isWater
                                        ? 'bg-sky-100 text-sky-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                                  >
                                    {isCompleted ? (
                                      <CheckCircle2 className="w-4 h-4" />
                                    ) : isWater ? (
                                      <Droplets className="w-4 h-4" />
                                    ) : (
                                      <Utensils className="w-4 h-4" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span
                                        className={`font-mono font-bold text-xs px-2 py-0.5 rounded-md ${
                                          isExpired
                                            ? 'bg-gray-200 text-gray-600'
                                            : isCurrentSlot
                                            ? 'bg-rose-100 text-rose-800'
                                            : 'text-gray-900 bg-gray-100'
                                        }`}
                                      >
                                        {rem.time}
                                      </span>

                                      {isCurrentSlot && !isExpired && (
                                        <span
                                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 tracking-wide ${
                                            isCompleted
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-rose-500 text-white shadow-sm'
                                          }`}
                                        >
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full ${
                                              isCompleted ? 'bg-emerald-600' : 'bg-white animate-ping'
                                            }`}
                                          />
                                          Khung giờ hiện tại
                                        </span>
                                      )}

                                      <span
                                        className={`font-semibold text-xs ${
                                          isCompleted ? 'text-gray-700' : isExpired ? 'text-gray-500 line-through' : 'text-gray-900'
                                        }`}
                                      >
                                        {rem.title}
                                      </span>

                                      {isWater && (
                                        <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                                          {rem.waterAmountMl}ml
                                        </span>
                                      )}
                                    </div>

                                    {rem.message && (
                                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-1">{rem.message}</p>
                                    )}

                                    {/* Completion / Status Badge */}
                                    <div className="mt-1.5 flex items-center gap-2">
                                      {isCompleted ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                          Đã hoàn thành lúc {completedCheckin.time}
                                        </span>
                                      ) : isExpired ? (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-[11px] font-medium flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-gray-500" />
                                          Đã qua khung giờ
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-medium border border-amber-200 flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-amber-600" />
                                          Chưa có ảnh xác thực
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Action buttons on the right */}
                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  {isCompleted ? (
                                    <button
                                      onClick={() => setSelectedCheckin(completedCheckin)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold active:scale-95 transition"
                                      title="Xem ảnh bằng chứng & phản hồi"
                                    >
                                      <img
                                        src={completedCheckin.photoUrl}
                                        alt="Ảnh"
                                        className="w-5 h-5 rounded-md object-cover border border-emerald-300"
                                      />
                                      <span>Xem ảnh</span>
                                    </button>
                                  ) : isExpired ? (
                                    <span className="px-3 py-1.5 bg-gray-200 text-gray-400 font-semibold text-xs rounded-xl flex items-center gap-1">
                                      <Clock className="w-3.5 h-3.5" /> Đã quá giờ
                                    </span>
                                  ) : (
                                    <button
                                      onClick={() => handleQuickNudge(rem)}
                                      disabled={nudgingId === rem.id}
                                      className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition disabled:opacity-50"
                                      title={`Bấm để gửi thông báo nhắc bạn gái: ${rem.title}`}
                                    >
                                      <Bell className="w-3.5 h-3.5 fill-white" />
                                      <span>{nudgingId === rem.id ? 'Đang gửi...' : 'Nhắc nhở'}</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteReminder(rem.id)}
                                    className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition"
                                    title="Xóa mốc nhắc này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
            </div>
          </div>

          {/* Target Water Settings */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-5">
            <h4 className="font-semibold text-gray-900 text-xs mb-2 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-gray-500" /> Mục tiêu lượng nước mỗi ngày:
            </h4>
            <div className="flex gap-2">
              {[1500, 1800, 2000, 2200, 2500].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handleSaveWaterTarget(amt)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                    currentTarget === amt
                      ? 'bg-sky-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {amt}ml
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Add Reminder Modal */}
      <AddReminderModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={handleAddReminder}
      />

      {/* Reaction Modal */}
      <ReactionModal
        checkin={selectedCheckin}
        isOpen={!!selectedCheckin}
        onClose={() => setSelectedCheckin(null)}
        onReact={handleReact}
        onDelete={handleDeleteCheckin}
      />

      {/* Nudge Trigger Modal */}
      {isNudgeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-500" /> Nhắc Nhở Bạn Gái
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Điện thoại của bạn gái sẽ phát âm thanh và hiển thị thông báo giục chụp ảnh xác thực.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Chọn mốc nhắc:
                </label>
                <select
                  value={selectedReminderForNudge}
                  onChange={(e) => setSelectedReminderForNudge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <option value="">Nhắc chung (Uống nước / Ăn uống)</option>
                  {reminders.map((r) => (
                    <option key={r.id} value={r.title}>
                      [{r.time}] {r.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Lời nhắn gửi kèm:
                </label>
                <textarea
                  rows="2"
                  value={customNudgeText}
                  onChange={(e) => setCustomNudgeText(e.target.value)}
                  placeholder="Nhập lời nhắn gửi đến bạn gái..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsNudgeOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold text-xs rounded-xl hover:bg-gray-200 transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendNudge}
                className="flex-[2] py-2.5 bg-gray-900 hover:bg-black text-white font-semibold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Send className="w-3.5 h-3.5" /> Gửi thông báo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

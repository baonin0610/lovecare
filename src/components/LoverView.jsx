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
  UserCheck
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { ReactionModal } from './ReactionModal';
import { DailySetlogView } from './DailySetlogView';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const LoverView = () => {
  const { user, couple, showToast } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [activeSnapReminder, setActiveSnapReminder] = useState(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedCheckin, setSelectedCheckin] = useState(null);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'setlog', 'album'
  const [currentTime, setCurrentTime] = useState(() => new Date());

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
      setReminders(rems || []);
      setCheckins(chks || []);
      setStats(st || null);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [couple?.id]);

  const handleOpenSnap = (reminder) => {
    setActiveSnapReminder(reminder);
    setIsCameraOpen(true);
  };

  const handleCompleteCheckin = async (formData) => {
    await api.createCheckin(user, couple, formData);
    showToast('Đã gửi ảnh xác thực thành công.');
    await loadData();
  };

  const handleReact = async (checkinId, reaction) => {
    await api.reactToCheckin(user, couple, checkinId, reaction);
    await loadData();
  };

  const handleDeleteCheckin = async (checkinId) => {
    await api.deleteCheckin(user, couple, checkinId);
    showToast('Đã xóa lượt check-in.');
    await loadData();
  };

  const getReminderCheckin = (reminder) => {
    const today = new Date().toISOString().split('T')[0];
    return checkins.find(c => c.reminderId === reminder.id && c.date === today);
  };

  const waterToday = stats?.today?.waterMl || 0;
  const targetWater = stats?.today?.targetWaterMl || 2000;
  const waterPercent = Math.min(100, Math.round((waterToday / targetWater) * 100));

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
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider block">
              {couple?.name || 'Nhật ký cá nhân'}
            </span>
            <h2 className="text-xl font-bold text-gray-900 mt-0.5">
              Xin chào, {user?.name}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700">
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

      {/* TAB 1: Tasks Today */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {/* Live Realtime Tracker Bar */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-white border border-gray-200/80 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-gray-500 font-medium">Bây giờ:</span>
              <span className="font-mono font-bold text-gray-900 text-sm">{currentTimeFormatted}</span>
            </div>
            {currentSlotReminderId && (
              <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Đang ở khung giờ cần thực hiện
              </span>
            )}
          </div>

          {reminders.map((reminder) => {
            const completedCheckin = getReminderCheckin(reminder);
            const isCompleted = !!completedCheckin;
            const isWater = reminder.type === 'water';
            const isCurrentSlot = reminder.id === currentSlotReminderId;

            return (
              <div
                key={reminder.id}
                className={`rounded-2xl p-4 transition-all duration-300 relative ${
                  isCurrentSlot
                    ? isCompleted
                      ? 'bg-emerald-50/40 border-2 border-emerald-500 ring-4 ring-emerald-500/15 shadow-md'
                      : 'bg-gradient-to-r from-rose-50/60 via-white to-pink-50/40 border-2 border-rose-500 ring-4 ring-rose-500/20 shadow-xl shadow-rose-500/15'
                    : isCompleted
                    ? 'bg-gray-50/70 border border-gray-200'
                    : 'bg-white border border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
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
                        <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                          isCurrentSlot ? 'bg-rose-100 text-rose-800' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {reminder.time}
                        </span>

                        {isCurrentSlot && (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 tracking-wide ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-500 text-white shadow-sm shadow-rose-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-white animate-ping'}`} />
                            Khung giờ hiện tại
                          </span>
                        )}

                        {isWater && (
                          <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md">
                            {reminder.waterAmountMl} ml
                          </span>
                        )}
                      </div>

                      <h4 className={`font-semibold text-sm mt-1.5 ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {reminder.title}
                      </h4>

                      {reminder.message && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {reminder.message}
                        </p>
                      )}
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
    </div>
  );
};

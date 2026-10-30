import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  BookHeart,
  Feather,
  Sun,
  Moon,
  Wind,
  CloudRain,
  Heart,
  BatteryMedium,
  Sparkles,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  MessageCircle,
  BellRing
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const BEDTIME_MOODS = [
  {
    id: 'peaceful',
    label: 'Bình yên, nhẹ nhõm',
    desc: 'Ngày trôi qua êm ả, trong lòng thấy thanh thản',
    icon: Feather,
    activeColor: 'border-emerald-500 bg-emerald-50/90 text-emerald-800 shadow-xs'
  },
  {
    id: 'happy',
    label: 'Vui vẻ, ấm áp',
    desc: 'Nhiều niềm vui nhỏ và khoảnh khắc đáng yêu',
    icon: Sun,
    activeColor: 'border-amber-500 bg-amber-50/90 text-amber-800 shadow-xs'
  },
  {
    id: 'tired',
    label: 'Mệt mỏi, cần sạc lại',
    desc: 'Cả ngày vất vả, chỉ muốn cuộn tròn vào chăn ngủ',
    icon: Moon,
    activeColor: 'border-indigo-500 bg-indigo-50/90 text-indigo-800 shadow-xs'
  },
  {
    id: 'overwhelmed',
    label: 'Nhiều suy nghĩ, áp lực',
    desc: 'Có chút bộn bề, cần được lắng nghe và vỗ về',
    icon: Wind,
    activeColor: 'border-slate-500 bg-slate-100 text-slate-800 shadow-xs'
  },
  {
    id: 'sad',
    label: 'Hơi buồn một chút',
    desc: 'Cảm thấy yếu lòng, cần một cái ôm thật ấm',
    icon: CloudRain,
    activeColor: 'border-sky-500 bg-sky-50/90 text-sky-800 shadow-xs'
  },
  {
    id: 'miss',
    label: 'Nhớ anh rất nhiều',
    desc: 'Muốn được nghe giọng và ở bên anh lúc này',
    icon: Heart,
    activeColor: 'border-rose-500 bg-rose-50/90 text-rose-800 shadow-xs'
  }
];

const BOYFRIEND_QUICK_WISHES = [
  'Ôm em thật chặt, ngủ một giấc thật ngon và sâu nha em yêu ❤️',
  'Hôm nay em vất vả rồi, gác lại âu lo ngủ ngoan nhé công chúa!',
  'Anh luôn ở đây bên cạnh em, thương em nhiều lắm, mơ đẹp nha bé!',
  'Ngủ sớm cho khỏe nha em, sáng mai thức dậy anh lại đón em ❤️'
];

export const BedtimeJournalModal = ({ isOpen, onClose }) => {
  const { user, couple, socket, showToast } = useAuth();
  const isLover = user?.role === 'lover';

  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState([]);
  const [todayJournal, setTodayJournal] = useState(null);
  const [todayStr, setTodayStr] = useState('');
  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'history'
  const [selectedHistoryJournal, setSelectedHistoryJournal] = useState(null);

  // Edit / Form state for Lover
  const [isEditing, setIsEditing] = useState(false);
  const [mood, setMood] = useState('peaceful');
  const [energy, setEnergy] = useState(70);
  const [gratitude, setGratitude] = useState('');
  const [content, setContent] = useState('');
  const [sleepWish, setSleepWish] = useState('');
  const [saving, setSaving] = useState(false);

  // Boyfriend reaction state
  const [customReaction, setCustomReaction] = useState('');
  const [sendingReaction, setSendingReaction] = useState(false);
  const [nudging, setNudging] = useState(false);

  // Load journal data
  const loadJournals = async () => {
    if (!couple?.id) return;
    try {
      setLoading(true);
      const data = await api.getJournals(user, couple);
      if (data) {
        setJournals(data.journals || []);
        setTodayJournal(data.todayJournal || null);
        setTodayStr(data.today || new Date().toISOString().slice(0, 10));

        if (data.todayJournal) {
          setMood(data.todayJournal.mood || 'peaceful');
          setEnergy(data.todayJournal.energy || 70);
          setGratitude(data.todayJournal.gratitude || '');
          setContent(data.todayJournal.content || '');
          setSleepWish(data.todayJournal.sleepWish || '');
          setIsEditing(false);
        } else {
          setIsEditing(true);
        }
      }
    } catch (e) {
      console.warn('Failed to load journals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadJournals();
      setSelectedHistoryJournal(null);
    }
  }, [isOpen, couple?.id]);

  // Realtime Socket listener
  useEffect(() => {
    if (!socket || !isOpen) return;

    const handleUpdated = (data) => {
      if (data?.journal) {
        setJournals((prev) => {
          const idx = prev.findIndex((j) => j.id === data.journal.id || j.date === data.journal.date);
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = data.journal;
            return next;
          }
          return [data.journal, ...prev];
        });

        if (data.journal.date === todayStr) {
          setTodayJournal(data.journal);
        }
      }
    };

    const handleReacted = (data) => {
      if (data?.journal) {
        setJournals((prev) =>
          prev.map((j) => (j.id === data.journal.id ? data.journal : j))
        );
        if (data.journal.date === todayStr) {
          setTodayJournal(data.journal);
        }
        if (selectedHistoryJournal && selectedHistoryJournal.id === data.journal.id) {
          setSelectedHistoryJournal(data.journal);
        }
      }
    };

    socket.on('journal_updated', handleUpdated);
    socket.on('journal_reacted', handleReacted);

    return () => {
      socket.off('journal_updated', handleUpdated);
      socket.off('journal_reacted', handleReacted);
    };
  }, [socket, isOpen, todayStr, selectedHistoryJournal]);

  if (!isOpen) return null;

  // Selected mood metadata
  const currentMoodObj = BEDTIME_MOODS.find((m) => m.id === mood) || BEDTIME_MOODS[0];

  const handleSaveJournal = async (e) => {
    e?.preventDefault();
    if (!content.trim() && !gratitude.trim()) {
      showToast('Em hãy viết vài dòng tâm sự trước khi lưu nhé ❤️');
      return;
    }

    setSaving(true);
    try {
      const moodMeta = BEDTIME_MOODS.find((m) => m.id === mood);
      const res = await api.saveJournal(user, couple, {
        date: todayStr,
        mood,
        moodLabel: moodMeta ? moodMeta.label : 'Bình yên, nhẹ nhõm',
        energy: Number(energy),
        gratitude: gratitude.trim(),
        content: content.trim(),
        sleepWish: sleepWish.trim()
      });

      if (res?.success && res.journal) {
        setTodayJournal(res.journal);
        setIsEditing(false);
        showToast('Đã lưu nhật ký và gửi lời chúc ngủ ngon tới bạn trai ❤️');
        sounds.playWaterSuccess?.();
      }
    } catch (err) {
      showToast('Lỗi lưu nhật ký: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSendReaction = async (messageText) => {
    const text = messageText || customReaction;
    if (!text.trim() || !todayJournal?.id) return;

    setSendingReaction(true);
    try {
      const res = await api.reactJournal(user, couple, todayJournal.id, {
        type: 'hug',
        message: text.trim()
      });

      if (res?.success) {
        setTodayJournal(res.journal);
        setCustomReaction('');
        showToast('Đã gửi lời chúc ngủ ngon ấm áp tới bạn gái ❤️');
        sounds.playWaterSuccess?.();
      }
    } catch (err) {
      showToast('Lỗi gửi phản hồi: ' + err.message);
    } finally {
      setSendingReaction(false);
    }
  };

  const handleNudgeLover = async () => {
    setNudging(true);
    try {
      const res = await api.nudgeJournal(user, couple);
      if (res?.success) {
        showToast('Đã gửi lời nhắn: Bạn trai đang chờ nghe tâm sự của em ❤️');
      }
    } catch (err) {
      showToast('Lỗi gửi lời nhắn: ' + err.message);
    } finally {
      setNudging(false);
    }
  };

  // Helper date formatter
  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-gradient-to-b from-white via-white to-rose-50/30 rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 bg-white/90 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shadow-2xs">
              <BookHeart className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-sm tracking-tight">
                  Nhật ký cuối ngày
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <p className="text-[10px] text-gray-500 font-medium capitalize">
                {formatDateDisplay(todayStr) || 'Tâm sự trước khi ngủ'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100/80 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-5 pt-3 pb-1 bg-white flex items-center gap-2 border-b border-gray-50 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('today');
              setSelectedHistoryJournal(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'today' && !selectedHistoryJournal
                ? 'bg-rose-50 text-rose-700 border-rose-200/90 shadow-2xs'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            {isLover ? 'Tâm sự hôm nay' : 'Nhật ký của bạn gái'}
            {todayJournal && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                Đã ghi
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition border ${
              activeTab === 'history' || selectedHistoryJournal
                ? 'bg-rose-50 text-rose-700 border-rose-200/90 shadow-2xs'
                : 'text-gray-500 border-transparent hover:bg-gray-50'
            }`}
          >
            Trang đã qua ({journals.length})
          </button>
        </div>

        {/* Body Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              <Sparkles className="w-5 h-5 mx-auto text-rose-400 animate-spin mb-2" />
              Đang mở trang nhật ký...
            </div>
          ) : selectedHistoryJournal ? (
            /* Detailed view of an older journal */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedHistoryJournal(null)}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại danh sách
              </button>

              <div className="bg-white rounded-3xl p-5 border border-rose-100/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-bold text-gray-900 capitalize">
                      {formatDateDisplay(selectedHistoryJournal.date)}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 text-[10px] font-semibold border border-rose-200/60">
                    {selectedHistoryJournal.moodLabel || 'Bình yên'}
                  </span>
                </div>

                {/* Energy metric */}
                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-2xl">
                  <span className="text-gray-500 font-medium flex items-center gap-1.5">
                    <BatteryMedium className="w-4 h-4 text-indigo-500" />
                    Mức năng lượng cuối ngày:
                  </span>
                  <span className="font-bold text-gray-900">
                    {selectedHistoryJournal.energy || 70}%
                  </span>
                </div>

                {/* Gratitude */}
                {selectedHistoryJournal.gratitude && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                      Khoảnh khắc ấm lòng:
                    </span>
                    <p className="text-xs text-gray-700 bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
                      {selectedHistoryJournal.gratitude}
                    </p>
                  </div>
                )}

                {/* Story */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Tâm sự của em:
                  </span>
                  <p className="text-xs text-gray-800 leading-relaxed bg-gray-50/80 p-3.5 rounded-2xl whitespace-pre-line border border-gray-100">
                    {selectedHistoryJournal.content}
                  </p>
                </div>

                {/* Sleep Wish */}
                {selectedHistoryJournal.sleepWish && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                      Lời chúc gửi anh:
                    </span>
                    <p className="text-xs text-rose-800 bg-rose-50/70 p-3 rounded-2xl border border-rose-100 italic">
                      "{selectedHistoryJournal.sleepWish}"
                    </p>
                  </div>
                )}

                {/* Boyfriend reactions history */}
                {selectedHistoryJournal.reactions && selectedHistoryJournal.reactions.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> Lời vỗ về từ bạn trai:
                    </span>
                    {selectedHistoryJournal.reactions.map((r, i) => (
                      <div key={i} className="bg-pink-50/70 p-2.5 rounded-xl border border-pink-100 text-xs text-pink-900">
                        <span className="font-bold text-pink-700 block text-[11px] mb-0.5">
                          {r.userName}:
                        </span>
                        <p>{r.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'history' ? (
            /* History Tab Listing */
            <div className="space-y-2.5">
              {journals.length === 0 ? (
                <div className="text-center py-10 px-4 bg-white rounded-3xl border border-gray-100">
                  <BookHeart className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Chưa có trang nhật ký nào
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {isLover
                      ? 'Viết trang nhật ký đầu tiên để lưu giữ những cảm xúc ngọt ngào nhé.'
                      : 'Khi bạn gái chia sẻ tâm sự trước khi ngủ, những trang ký ức sẽ xuất hiện ở đây.'}
                  </p>
                </div>
              ) : (
                journals.map((item) => {
                  const moodInfo = BEDTIME_MOODS.find((m) => m.id === item.mood) || BEDTIME_MOODS[0];
                  const MoodIcon = moodInfo.icon;

                  return (
                    <button
                      key={item.id || item.date}
                      type="button"
                      onClick={() => setSelectedHistoryJournal(item)}
                      className="w-full bg-white hover:bg-rose-50/40 p-3.5 rounded-2xl border border-gray-100 hover:border-rose-200 transition text-left flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-700 group-hover:bg-rose-50 group-hover:text-rose-600 transition flex items-center justify-center shrink-0">
                          <MoodIcon className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-xs font-bold text-gray-900 capitalize">
                              {formatDateDisplay(item.date)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-gray-100 text-gray-600 font-medium">
                              Pin {item.energy || 70}%
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate max-w-[220px]">
                            {item.content || item.gratitude || item.moodLabel}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-rose-500 transition shrink-0" />
                    </button>
                  );
                })
              )}
            </div>
          ) : isLover ? (
            /* LOVER VIEW (Girlfriend) */
            todayJournal && !isEditing ? (
              /* Already Written Today - Card Preview with Edit Button */
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-gray-900">
                        Đã gửi tâm sự hôm nay
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
                    >
                      Chỉnh sửa lại
                    </button>
                  </div>

                  {/* Mood Badge */}
                  <div className="flex items-center justify-between bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-2xs">
                        <currentMoodObj.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          {todayJournal.moodLabel || currentMoodObj.label}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {currentMoodObj.desc}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white text-gray-700 font-bold text-xs shadow-2xs">
                      Pin {todayJournal.energy || 70}%
                    </span>
                  </div>

                  {/* Gratitude */}
                  {todayJournal.gratitude && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        Khoảnh khắc ấm lòng hôm nay:
                      </span>
                      <p className="text-xs text-gray-700 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/80">
                        {todayJournal.gratitude}
                      </p>
                    </div>
                  )}

                  {/* Story */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Tâm sự của em:
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed bg-gray-50/80 p-3.5 rounded-2xl whitespace-pre-line border border-gray-100">
                      {todayJournal.content}
                    </p>
                  </div>

                  {/* Sleep wish */}
                  {todayJournal.sleepWish && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        Lời chúc gửi anh:
                      </span>
                      <p className="text-xs text-rose-800 bg-rose-50/70 p-3 rounded-2xl border border-rose-100 italic">
                        "{todayJournal.sleepWish}"
                      </p>
                    </div>
                  )}

                  {/* Boyfriend Reaction Received */}
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                      Lời vỗ về từ bạn trai:
                    </span>
                    {todayJournal.reactions && todayJournal.reactions.length > 0 ? (
                      todayJournal.reactions.map((r, i) => (
                        <div
                          key={i}
                          className="bg-gradient-to-r from-rose-50 to-pink-50 p-3 rounded-2xl border border-rose-100 text-xs text-rose-900 shadow-2xs"
                        >
                          <span className="font-bold text-rose-700 block text-[11px] mb-1">
                            {r.userName || 'Anh yêu'}:
                          </span>
                          <p className="leading-relaxed">{r.message}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic bg-gray-50 p-3 rounded-2xl">
                        Bạn trai đã nhận được tâm sự và đang chuẩn bị lời chúc ngủ ngon gửi lại bạn...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Writing / Editing Form */
              <form onSubmit={handleSaveJournal} className="space-y-4">
                {/* 1. Mood Picker */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-2">
                    1. Hôm nay của em thế nào?
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {BEDTIME_MOODS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = mood === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setMood(item.id)}
                          className={`p-2.5 rounded-2xl text-left transition border ${
                            isSelected
                              ? item.activeColor
                              : 'bg-white border-gray-200/80 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-xs font-bold truncate">
                              {item.label}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 line-clamp-1">
                            {item.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Energy Level Slider */}
                <div className="bg-white p-3.5 rounded-2xl border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                      <BatteryMedium className="w-4 h-4 text-indigo-500" />
                      2. Mức năng lượng cuối ngày:
                    </label>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {energy}% {energy < 40 ? '(Cần ngủ sớm)' : energy < 70 ? '(Vừa vặn)' : '(Tràn đầy)'}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={energy}
                    onChange={(e) => setEnergy(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>10% Cạn pin</span>
                    <span>50%</span>
                    <span>100% Khỏe khoắn</span>
                  </div>
                </div>

                {/* 3. Gratitude / Warm moment */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    3. Khoảnh khắc ấm lòng nhất hôm nay (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={gratitude}
                    onChange={(e) => setGratitude(e.target.value)}
                    placeholder="VD: Tin nhắn buổi trưa của anh, ăn món bún bò ngon..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  />
                </div>

                {/* 4. Story Text Area */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    4. Tâm sự trước khi ngủ:
                  </label>
                  <textarea
                    rows="3"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Kể cho anh nghe những điều xảy ra hôm nay, hoặc những suy nghĩ trước khi em chợp mắt..."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white resize-none leading-relaxed"
                    required
                  />
                </div>

                {/* 5. Sleep Wish to Boyfriend */}
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1.5">
                    5. Lời nhắn gửi bạn trai trước giờ ngủ:
                  </label>
                  <input
                    type="text"
                    value={sleepWish}
                    onChange={(e) => setSleepWish(e.target.value)}
                    placeholder="VD: Chúc anh ngủ thật ngon và mơ về em nha! Yêu anh ❤️"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                  />
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex items-center gap-2.5">
                  {todayJournal && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-3 px-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/20 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {saving ? 'Đang lưu tâm sự...' : 'Lưu tâm sự & Gửi lời chúc ngủ ngon'}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* CARETAKER VIEW (Boyfriend) */
            todayJournal ? (
              /* Girlfriend Has Written Today - View and Send Hug/Wishes */
              <div className="space-y-4">
                <div className="bg-white rounded-3xl p-5 border border-rose-100/90 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <span className="text-xs font-bold text-gray-900">
                      Tâm sự của bạn gái hôm nay
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200/60">
                      Vừa gửi hôm nay
                    </span>
                  </div>

                  {/* Mood Badge */}
                  <div className="flex items-center justify-between bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-white text-rose-600 flex items-center justify-center shadow-2xs">
                        <currentMoodObj.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">
                          {todayJournal.moodLabel || currentMoodObj.label}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          {currentMoodObj.desc}
                        </span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-white text-gray-700 font-bold text-xs shadow-2xs">
                      Pin {todayJournal.energy || 70}%
                    </span>
                  </div>

                  {/* Gratitude */}
                  {todayJournal.gratitude && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                        Khoảnh khắc ấm lòng của cô ấy:
                      </span>
                      <p className="text-xs text-gray-700 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/80">
                        {todayJournal.gratitude}
                      </p>
                    </div>
                  )}

                  {/* Story */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Lời tâm sự:
                    </span>
                    <p className="text-xs text-gray-800 leading-relaxed bg-gray-50/80 p-3.5 rounded-2xl whitespace-pre-line border border-gray-100">
                      {todayJournal.content}
                    </p>
                  </div>

                  {/* Sleep wish */}
                  {todayJournal.sleepWish && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                        Lời chúc gửi bạn:
                      </span>
                      <p className="text-xs text-rose-800 bg-rose-50/70 p-3 rounded-2xl border border-rose-100 italic">
                        "{todayJournal.sleepWish}"
                      </p>
                    </div>
                  )}

                  {/* Reactions already sent */}
                  {todayJournal.reactions && todayJournal.reactions.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        Bạn đã gửi lời chúc:
                      </span>
                      {todayJournal.reactions.map((r, i) => (
                        <div key={i} className="bg-pink-50 p-2.5 rounded-xl border border-pink-100 text-xs text-pink-900">
                          {r.message}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Boyfriend Response Section */}
                <div className="bg-gradient-to-br from-rose-50/70 to-pink-50/50 rounded-3xl p-4 border border-rose-100 space-y-3">
                  <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                    <Heart className="w-4 h-4 fill-rose-500" />
                    <span>Gửi cái ôm & lời chúc ngủ ngon tới bạn gái:</span>
                  </div>

                  {/* Quick suggestion pills */}
                  <div className="space-y-1.5">
                    {BOYFRIEND_QUICK_WISHES.map((wish, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendReaction(wish)}
                        disabled={sendingReaction}
                        className="w-full p-2 rounded-xl bg-white hover:bg-rose-100/60 border border-rose-100 text-left text-[11px] text-gray-700 hover:text-rose-900 transition flex items-center justify-between group active:scale-98"
                      >
                        <span className="truncate pr-2">{wish}</span>
                        <Send className="w-3 h-3 text-gray-300 group-hover:text-rose-500 shrink-0" />
                      </button>
                    ))}
                  </div>

                  {/* Custom Message input */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={customReaction}
                      onChange={(e) => setCustomReaction(e.target.value)}
                      placeholder="Hoặc viết lời chúc riêng của bạn..."
                      className="flex-1 px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReaction()}
                      disabled={sendingReaction || !customReaction.trim()}
                      className="py-2.5 px-3.5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition active:scale-95 disabled:opacity-40 shrink-0 flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Girlfriend Has NOT Written Today */
              <div className="text-center py-10 px-5 bg-white rounded-3xl border border-gray-100 space-y-4">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center border border-indigo-100 shadow-2xs">
                  <Moon className="w-6 h-6" />
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">
                    Bạn gái chưa viết tâm sự hôm nay
                  </h4>
                  <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                    Có thể cô ấy đang bận hoặc chuẩn bị đi ngủ. Bạn hãy gửi một lời nhắn nhẹ nhàng để nhắc cô ấy chia sẻ nhé.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleNudgeLover}
                  disabled={nudging}
                  className="py-3 px-5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/20 active:scale-95 transition disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <BellRing className="w-4 h-4" />
                  {nudging ? 'Đang gửi...' : 'Nhắn bạn gái: "Em ơi hôm nay thế nào?"'}
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

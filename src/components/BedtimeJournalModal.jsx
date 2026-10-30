import React, { useState, useEffect } from 'react';
import {
  X,
  BookHeart,
  Send,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Heart,
  Edit3,
  Moon
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const SIMPLE_MOODS = [
  { id: 'happy', emoji: '🥰', label: 'Hạnh phúc' },
  { id: 'peaceful', emoji: '😌', label: 'Bình yên' },
  { id: 'tired', emoji: '😴', label: 'Mệt mỏi' },
  { id: 'miss', emoji: '🥺', label: 'Nhớ anh' },
  { id: 'sad', emoji: '🌧️', label: 'Hơi buồn' }
];

const BOYFRIEND_QUICK_WISHES = [
  'Ôm em thật chặt, ngủ ngon nha bé yêu ❤️',
  'Hôm nay em vất vả rồi, ngủ ngoan nhé công chúa!',
  'Thương em nhiều lắm, mơ đẹp nha em ❤️',
  'Ngủ sớm cho khỏe nha em yêu!'
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

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [mood, setMood] = useState('peaceful');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  // Boyfriend reaction
  const [customReaction, setCustomReaction] = useState('');
  const [sendingReaction, setSendingReaction] = useState(false);

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
          // Fallback to combined content if old fields exist
          const mergedText = data.todayJournal.content || data.todayJournal.gratitude || data.todayJournal.sleepWish || '';
          setContent(mergedText);
          setIsEditing(false);
        } else {
          setContent('');
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

  const currentMood = SIMPLE_MOODS.find((m) => m.id === mood) || SIMPLE_MOODS[1];

  const handleSaveJournal = async (e) => {
    e?.preventDefault();
    if (!content.trim()) {
      showToast('Em viết vài dòng tâm sự trước khi lưu nhé ❤️');
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveJournal(user, couple, {
        date: todayStr,
        mood: currentMood.id,
        moodLabel: `${currentMood.emoji} ${currentMood.label}`,
        content: content.trim()
      });

      if (res?.success && res.journal) {
        setTodayJournal(res.journal);
        setIsEditing(false);
        showToast('Đã lưu nhật ký hôm nay ❤️');
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
    const targetJournal = selectedHistoryJournal || todayJournal;
    if (!text.trim() || !targetJournal?.id) return;

    setSendingReaction(true);
    try {
      const res = await api.reactJournal(user, couple, targetJournal.id, {
        type: 'hug',
        message: text.trim()
      });

      if (res?.success) {
        if (selectedHistoryJournal) {
          setSelectedHistoryJournal(res.journal);
        } else {
          setTodayJournal(res.journal);
        }
        setCustomReaction('');
        showToast('Đã gửi phản hồi tới bạn gái ❤️');
        sounds.playWaterSuccess?.();
      }
    } catch (err) {
      showToast('Lỗi gửi phản hồi: ' + err.message);
    } finally {
      setSendingReaction(false);
    }
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return '';
    try {
      const [y, m, d] = dateString.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center shadow-2xs">
              <BookHeart className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm tracking-tight">
                Nhật ký cuối ngày
              </h3>
              <p className="text-[10px] text-gray-500 capitalize">
                {formatDateDisplay(todayStr) || 'Tâm sự trước khi ngủ'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition active:scale-95"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch: Hôm nay & Danh sách nhật ký */}
        <div className="px-4 pt-2.5 pb-2 bg-slate-50/80 border-b border-gray-100 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab('today');
              setSelectedHistoryJournal(null);
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'today' && !selectedHistoryJournal
                ? 'bg-white text-rose-600 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {isLover ? 'Hôm nay' : 'Nhật ký bạn gái'}
            {todayJournal && (
              <span className="ml-1.5 w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition ${
              activeTab === 'history' || selectedHistoryJournal
                ? 'bg-white text-rose-600 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Lịch sử ({journals.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Đang mở nhật ký...
            </div>
          ) : selectedHistoryJournal ? (
            /* Chi tiết 1 bài nhật ký cũ */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedHistoryJournal(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại danh sách
              </button>

              <div className="bg-rose-50/30 rounded-2xl p-4 border border-rose-100 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-rose-100/60">
                  <span className="font-bold text-gray-900 capitalize">
                    {formatDateDisplay(selectedHistoryJournal.date)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-rose-700 font-medium text-[11px] shadow-2xs border border-rose-100">
                    {selectedHistoryJournal.moodLabel || 'Bình yên'}
                  </span>
                </div>

                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                  {selectedHistoryJournal.content || selectedHistoryJournal.gratitude || selectedHistoryJournal.sleepWish}
                </p>

                {/* Boyfriend responses */}
                {selectedHistoryJournal.reactions && selectedHistoryJournal.reactions.length > 0 && (
                  <div className="pt-2 border-t border-rose-100/60 space-y-1.5">
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                      <Heart className="w-3 h-3 fill-rose-500" /> Phản hồi từ bạn trai:
                    </span>
                    {selectedHistoryJournal.reactions.map((r, i) => (
                      <div key={i} className="bg-white p-2.5 rounded-xl border border-rose-100 text-xs text-gray-800">
                        <span className="font-bold text-rose-600 block text-[10px]">
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
            /* Danh sách lịch sử */
            <div className="space-y-2">
              {journals.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-500 font-medium">
                    Chưa có bài nhật ký nào được ghi.
                  </p>
                </div>
              ) : (
                journals.map((item) => {
                  const m = SIMPLE_MOODS.find((s) => s.id === item.mood);
                  const preview = item.content || item.gratitude || item.sleepWish || 'Không có nội dung';

                  return (
                    <button
                      key={item.id || item.date}
                      type="button"
                      onClick={() => setSelectedHistoryJournal(item)}
                      className="w-full bg-white hover:bg-rose-50/50 p-3.5 rounded-2xl border border-gray-100 hover:border-rose-200 transition text-left flex items-center justify-between group shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span className="text-xl shrink-0">
                          {m ? m.emoji : '📝'}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-bold text-gray-900 capitalize">
                              {formatDateDisplay(item.date)}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 truncate max-w-[240px]">
                            {preview}
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
            /* BẠN GÁI (LOVER) */
            todayJournal && !isEditing ? (
              /* Đã viết hôm nay: xem lại + có nút chỉnh sửa */
              <div className="space-y-4">
                <div className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-100/60 pb-2">
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>Đã ghi nhật ký hôm nay</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base">{currentMood.emoji}</span>
                    <span className="text-xs font-bold text-gray-900">
                      Tâm trạng: {todayJournal.moodLabel || currentMood.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-rose-100/60">
                    {todayJournal.content || todayJournal.gratitude || todayJournal.sleepWish}
                  </p>

                  {/* Phản hồi từ bạn trai */}
                  {todayJournal.reactions && todayJournal.reactions.length > 0 && (
                    <div className="pt-2 border-t border-rose-100/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-500" /> Bạn trai đã đọc & gửi lời chúc:
                      </span>
                      {todayJournal.reactions.map((r, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-xl border border-rose-100 text-xs text-gray-800">
                          <span className="font-bold text-rose-600 block text-[10px]">
                            {r.userName}:
                          </span>
                          <p>{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Viết nhật ký mới hoặc đang sửa */
              <form onSubmit={handleSaveJournal} className="space-y-4">
                {/* Chọn tâm trạng nhanh */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-2">
                    Hôm nay em cảm thấy thế nào?
                  </label>
                  <div className="flex items-center justify-between gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-gray-100">
                    {SIMPLE_MOODS.map((m) => {
                      const isSel = mood === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setMood(m.id)}
                          className={`flex-1 py-2 px-1 rounded-xl text-center transition flex flex-col items-center gap-1 active:scale-95 ${
                            isSel
                              ? 'bg-white text-rose-600 font-bold shadow-xs border border-rose-200'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <span className="text-lg leading-none">{m.emoji}</span>
                          <span className="text-[10px] tracking-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Khung viết nhật ký duy nhất */}
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1.5">
                    Nội dung nhật ký:
                  </label>
                  <textarea
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Hôm nay của em thế nào? Viết đôi dòng tâm sự trước khi ngủ nhé... ❤️"
                    className="w-full p-3.5 bg-slate-50 border border-gray-200 rounded-2xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/15 leading-relaxed resize-none transition"
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  {todayJournal && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-3 bg-gray-100 text-gray-600 font-bold text-xs rounded-2xl hover:bg-gray-200 transition"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={saving || !content.trim()}
                    className="flex-1 py-3 px-4 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition"
                  >
                    <Send className="w-4 h-4" />
                    {saving ? 'Đang lưu...' : 'Lưu nhật ký hôm nay ❤️'}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* BẠN TRAI (CARETAKER) */
            todayJournal ? (
              /* Bạn gái đã viết nhật ký: Bạn trai đọc và gửi phản hồi */
              <div className="space-y-4">
                <div className="bg-rose-50/40 rounded-2xl p-4 border border-rose-100 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-100/60 pb-2 text-xs">
                    <span className="font-bold text-gray-900">
                      Tâm sự của bạn gái hôm nay
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white text-rose-700 font-medium text-[11px] border border-rose-100 shadow-2xs">
                      {todayJournal.moodLabel || 'Bình yên'}
                    </span>
                  </div>

                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-rose-100/60">
                    {todayJournal.content || todayJournal.gratitude || todayJournal.sleepWish}
                  </p>

                  {/* Lịch sử lời chúc của bạn trai */}
                  {todayJournal.reactions && todayJournal.reactions.length > 0 && (
                    <div className="pt-2 border-t border-rose-100/60 space-y-1.5">
                      <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
                        <Heart className="w-3 h-3 fill-rose-500" /> Lời chúc bạn đã gửi:
                      </span>
                      {todayJournal.reactions.map((r, i) => (
                        <div key={i} className="bg-white p-2.5 rounded-xl border border-rose-100 text-xs text-gray-800">
                          <p>{r.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gửi phản hồi / chúc ngủ ngon nhanh */}
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-gray-700 block">
                    Gửi lời chúc ngủ ngon tới bạn gái:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {BOYFRIEND_QUICK_WISHES.map((w, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendReaction(w)}
                        disabled={sendingReaction}
                        className="p-2.5 bg-slate-50 hover:bg-rose-50 border border-gray-100 hover:border-rose-200 rounded-xl text-left text-xs text-gray-700 hover:text-rose-700 transition active:scale-95 disabled:opacity-50"
                      >
                        {w}
                      </button>
                    ))}
                  </div>

                  {/* Hoặc nhập tin nhắn riêng */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={customReaction}
                      onChange={(e) => setCustomReaction(e.target.value)}
                      placeholder="Nhập lời chúc ngủ ngon của bạn..."
                      className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:border-rose-400 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendReaction()}
                      disabled={sendingReaction || !customReaction.trim()}
                      className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition"
                    >
                      Gửi
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Bạn gái chưa viết */
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                <Moon className="w-8 h-8 mx-auto text-indigo-400" />
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    Bạn gái chưa viết nhật ký hôm nay
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 max-w-xs mx-auto">
                    Khi bạn gái chia sẻ tâm sự trước khi ngủ, nội dung sẽ xuất hiện ngay tại đây nhé.
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

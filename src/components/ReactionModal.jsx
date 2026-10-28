import React, { useState, useEffect, useRef } from 'react';
import {
  Heart,
  Send,
  X,
  Clock,
  Droplets,
  Utensils,
  Download,
  Trash2,
  MessageCircle,
  ChevronDown
} from 'lucide-react';
import { sounds } from '../services/audio';
import { useAuth } from '../context/AuthContext';

const QUICK_TAGS = ['❤️ Thả tim', 'Giỏi lắm', 'Đúng giờ', 'Ngoan lắm', 'Uống thêm nước nhé', 'Ngon miệng nha'];

export const ReactionModal = ({
  checkin,
  isOpen,
  onClose,
  onReact,
  onDelete,
  initialChatOpen = false
}) => {
  const { user } = useAuth();
  const [isChatOpen, setIsChatOpen] = useState(initialChatOpen);
  const [comment, setComment] = useState('');
  const [reactions, setReactions] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (checkin?.reactions) {
      setReactions(checkin.reactions);
    } else {
      setReactions([]);
    }
  }, [checkin?.reactions, checkin?.id]);

  useEffect(() => {
    setIsChatOpen(initialChatOpen);
  }, [initialChatOpen, isOpen, checkin?.id]);

  const scrollToBottom = (smooth = true) => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (isOpen && isChatOpen) {
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [isOpen, isChatOpen]);

  useEffect(() => {
    if (isOpen && isChatOpen) {
      scrollToBottom(true);
    }
  }, [reactions.length]);

  if (!isOpen || !checkin) return null;

  // Format timestamps using client's local time (Vietnam GMT+7)
  const formatTime = (timeStr, isoDateStr) => {
    if (isoDateStr) {
      try {
        const d = new Date(isoDateStr);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      } catch (e) {}
    }
    return timeStr || '';
  };

  const handleSendText = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : comment).trim();
    if (!text || isSending) return;

    setIsSending(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Optimistic UI update
    const tempReaction = {
      id: `rx-temp-${Date.now()}`,
      userId: user?.id,
      userName: user?.name || (user?.role === 'caretaker' ? 'Bạn trai' : 'Bạn gái'),
      role: user?.role || 'caretaker',
      emoji: text.includes('❤️') ? '❤️' : '💬',
      text,
      time: timeStr,
      createdAt: now.toISOString()
    };

    setReactions((prev) => [...prev, tempReaction]);
    if (typeof textToSend !== 'string') {
      setComment('');
    }
    sounds.playWaterDrop();

    try {
      if (onReact) {
        await onReact(checkin.id, {
          emoji: tempReaction.emoji,
          text
        });
      }
    } catch (err) {
      console.error('Failed to send reaction:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lượt check-in này không?')) {
      if (onDelete) onDelete(checkin.id);
      onClose();
    }
  };

  const isWater = checkin.type === 'water';
  const latestReaction = reactions && reactions.length > 0 ? reactions[reactions.length - 1] : null;
  const checkinTimeFormatted = formatTime(checkin.time, checkin.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[94vh] safe-bottom border border-gray-200">
        {/* Mobile Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl ${isWater ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
              {isWater ? <Droplets className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-xs sm:text-sm leading-tight">{checkin.title}</h4>
              <p className="text-[11px] text-gray-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-gray-400" /> {checkinTimeFormatted} • {checkin.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Download Photo */}
            <a
              href={checkin.photoUrl}
              download={`${checkin.date}-${checkin.title}.jpg`}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
              title="Tải ảnh về máy"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Delete button (if permitted) */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition"
                title="Xóa lượt check-in này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Photo Preview Area */}
        <div className={`relative bg-slate-950 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          isChatOpen ? 'h-44 sm:h-52 shrink-0' : 'h-[62vh] max-h-[520px]'
        }`}>
          <img
            src={checkin.photoUrl}
            alt={checkin.title}
            className="w-full h-full object-cover"
          />

          {/* Watermark Tag */}
          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[10px] font-mono flex items-center gap-1.5 border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Xác thực thời gian thực ({checkinTimeFormatted})</span>
          </div>

          {/* Water / Meal Tag overlay */}
          <div className="absolute bottom-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold flex items-center gap-1.5 border border-white/10">
            {isWater ? (
              <>
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                <span>{checkin.waterAmountMl}ml</span>
              </>
            ) : (
              <>
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                <span>Bữa ăn</span>
              </>
            )}
          </div>

          {/* Bong bóng chat nhỏ ở góc Locket */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2 z-20">
            {/* Recent reply preview badge when chat is collapsed */}
            {latestReaction && !isChatOpen && (
              <button
                type="button"
                onClick={() => setIsChatOpen(true)}
                className="bg-black/75 hover:bg-black/90 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-2xl shadow-lg border border-white/20 flex items-center gap-1.5 max-w-[200px] truncate transition active:scale-95 animate-in fade-in"
              >
                <span className="font-bold text-rose-400 shrink-0">{latestReaction.userName}:</span>
                <span className="truncate">{latestReaction.text}</span>
              </button>
            )}

            {/* Small Floating Chat Bubble Button */}
            <button
              type="button"
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="relative w-11 h-11 rounded-full bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/40 flex items-center justify-center transition active:scale-95 border-2 border-white ring-2 ring-rose-500/20"
              title={isChatOpen ? 'Thu gọn chat' : 'Mở bong bóng chat Locket'}
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              {reactions.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border border-rose-200">
                  {reactions.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Locket Chat Box Section (Togglable via Bong bóng chat ở góc) */}
        {isChatOpen ? (
          <div className="flex-1 flex flex-col min-h-0 bg-[#F9FAFB] animate-in slide-in-from-bottom-4 duration-200">
            {/* Chat Header with Collapse button */}
            <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-bold text-gray-800">
                <MessageCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Phản hồi ảnh Locket</span>
                <span className="text-[10px] font-normal text-gray-500">
                  ({reactions.length} phản hồi)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsChatOpen(false)}
                className="text-[11px] font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-2.5 py-1 rounded-xl flex items-center gap-1 transition active:scale-95"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Thu gọn ảnh</span>
              </button>
            </div>

            {/* Chat Messages Conversation Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {/* Original caption note from partner if present */}
              {checkin.note && (
                <div className="flex flex-col items-start max-w-[88%] mb-3">
                  <span className="text-[10px] font-semibold text-gray-500 mb-1 px-1">
                    {checkin.userName || 'Bạn gái'} • Chú thích ảnh:
                  </span>
                  <div className="bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs shadow-xs italic">
                    "{checkin.note}"
                  </div>
                </div>
              )}

              {/* List of reactions / replies */}
              {reactions.length === 0 && !checkin.note ? (
                <div className="py-6 text-center text-gray-400 flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mb-2 shadow-xs text-gray-300">
                    <MessageCircle className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-xs font-semibold text-gray-600">Chưa có phản hồi nào</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Nhập tin nhắn hoặc chọn phản hồi nhanh bên dưới như trên Locket 👇
                  </p>
                </div>
              ) : (
                reactions.map((rx) => {
                  const isMe = rx.userId === user?.id;
                  const reactionTime = formatTime(rx.time, rx.createdAt);
                  return (
                    <div
                      key={rx.id || `${rx.createdAt}-${rx.text}`}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[88%] ${isMe ? 'ml-auto' : 'mr-auto'}`}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-bold text-gray-600 mb-0.5 px-1.5">
                          {rx.userName || 'Người thương'}
                        </span>
                      )}

                      <div
                        className={`px-3.5 py-2 rounded-2xl text-xs shadow-xs break-words leading-relaxed ${
                          isMe
                            ? 'bg-rose-500 text-white rounded-tr-xs'
                            : 'bg-white text-gray-900 border border-gray-200/90 rounded-tl-xs'
                        }`}
                      >
                        <span>{rx.text || rx.emoji || 'Đã ghi nhận'}</span>
                      </div>

                      <span className="text-[9px] text-gray-400 mt-0.5 px-1.5 font-mono">
                        {isMe ? 'Bạn • ' : ''}{reactionTime}
                      </span>
                    </div>
                  );
                })
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Quick Reaction Chips (Locket Style) */}
            <div className="px-3 pt-2 pb-1.5 bg-white border-t border-gray-100 shrink-0">
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleSendText(tag)}
                    disabled={isSending}
                    className="px-2.5 py-1 rounded-xl text-[11px] font-semibold shrink-0 bg-gray-100 hover:bg-rose-50 text-gray-700 hover:text-rose-600 border border-gray-200 hover:border-rose-200 active:scale-95 transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sticky Chat Input Bar */}
            <div className="p-3 bg-white border-t border-gray-100 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendText(comment);
                }}
                className="flex items-center gap-2"
              >
                <div className="flex-1 bg-gray-100 hover:bg-gray-100/80 focus-within:bg-white rounded-2xl border border-gray-200 focus-within:border-rose-400 focus-within:ring-2 focus-within:ring-rose-100 px-3.5 py-1.5 flex items-center transition">
                  <input
                    type="text"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Nhập tin nhắn phản hồi như Locket..."
                    className="w-full bg-transparent text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none py-1"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!comment.trim() || isSending}
                  className="w-9 h-9 rounded-2xl bg-gray-900 hover:bg-black text-white flex items-center justify-center shrink-0 transition active:scale-95 disabled:opacity-30 disabled:pointer-events-none shadow-sm"
                  title="Gửi tin nhắn"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* When Chat is collapsed, display a bottom action bar */
          <div className="p-3 bg-white border-t border-gray-100 flex items-center justify-between text-xs shrink-0">
            <span className="text-gray-500 font-medium">
              {reactions.length > 0 ? `${reactions.length} phản hồi từ người yêu` : 'Chưa có phản hồi nào'}
            </span>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-sm shadow-rose-500/20"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-white/20" />
              <span>Mở hộp chat</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

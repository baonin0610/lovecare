import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  X,
  Heart,
  Droplets,
  Utensils,
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../services/audio';

const QUICK_CHIPS_BOYFRIEND = [
  '❤️ Yêu em nhiều',
  'Ngoan lắm bé ơi',
  'Ăn no chưa em?',
  'Nhớ uống đủ nước nha',
  'Xinh gái quá đi 🥰'
];

const QUICK_CHIPS_GIRLFRIEND = [
  '❤️ Yêu anh',
  'Em hoàn thành rồi nè',
  'Em vừa uống xong nha',
  'Cơm trưa ngon lắm anh ơi',
  'Em ngoan chưa nè 🥰'
];

export const LocketChatBox = ({
  isOpen,
  onClose,
  onSelectCheckin
}) => {
  const { user, couple, socket, showToast } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const isCaretaker = user?.role === 'caretaker';
  const partnerRoleName = isCaretaker ? 'Bạn gái' : 'Bạn trai';
  const quickChips = isCaretaker ? QUICK_CHIPS_BOYFRIEND : QUICK_CHIPS_GIRLFRIEND;

  // Load chat messages
  const loadMessages = async () => {
    if (!couple?.id) return;
    try {
      setLoading(true);
      const data = await api.getMessages(user, couple);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading chat messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 200);
    }
  }, [isOpen, couple?.id]);

  // Real-time socket listener for new chat messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      scrollToBottom(true);
    };

    socket.on('chat_message', handleNewMessage);
    return () => {
      socket.off('chat_message', handleNewMessage);
    };
  }, [socket]);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
    }
  }, [messages.length, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend) => {
    const text = (typeof textToSend === 'string' ? textToSend : inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Optimistic UI update
    const tempMsg = {
      id: `msg-temp-${Date.now()}`,
      coupleId: couple?.id,
      userId: user?.id,
      userName: user?.name || (isCaretaker ? 'Bạn trai' : 'Bạn gái'),
      role: user?.role || 'caretaker',
      text,
      emoji: text.includes('❤️') ? '❤️' : '💬',
      time: timeStr,
      createdAt: now.toISOString()
    };

    setMessages((prev) => [...prev, tempMsg]);
    if (typeof textToSend !== 'string') {
      setInputText('');
    }
    sounds.playWaterDrop();

    try {
      await api.sendMessage(user, couple, {
        text,
        emoji: tempMsg.emoji
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('Gửi tin nhắn thất bại, vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSend = (chipText) => {
    handleSendMessage(chipText);
  };

  const formatMessageTime = (timeStr, isoDateStr) => {
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] sm:h-[82vh] safe-bottom border border-gray-200">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <MessageCircle className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-gray-900 text-sm">
                  Chat Locket Cặp Đôi
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-[11px] text-gray-500">
                Phản hồi hoạt động & trò chuyện cùng {partnerRoleName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-semibold">
              {messages.length} tin
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F9FAFB]">
          {loading && messages.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              Đang tải tin nhắn...
            </div>
          ) : messages.length === 0 ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center px-6">
              <div className="w-14 h-14 rounded-3xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3 shadow-xs text-rose-500">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-gray-800 text-sm mb-1">
                Hộp tin nhắn Locket
              </h4>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                Mỗi khi bạn trai trả lời ảnh hoặc gửi phản hồi hoạt động, câu trả lời sẽ xuất hiện ở đây kèm hình ảnh như trên app Locket!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.userId === user?.id;
              const hasCheckinPreview = !!msg.checkinPhotoUrl;
              const timeDisplay = formatMessageTime(msg.time, msg.createdAt);
              const isWater = msg.checkinType === 'water';

              return (
                <div
                  key={msg.id || index}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} transition-all`}
                >
                  {/* Sender Name above message if partner */}
                  {!isMe && (
                    <span className="text-[10px] font-bold text-gray-500 mb-1 px-1 flex items-center gap-1">
                      <span>{msg.userName}</span>
                      <span className="text-[9px] text-rose-500 font-medium">({msg.role === 'caretaker' ? 'Bạn trai' : 'Bạn gái'})</span>
                    </span>
                  )}

                  <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 shadow-xs transition ${
                    isMe
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-xs shadow-md shadow-rose-500/15'
                      : 'bg-white border border-gray-200/90 text-gray-900 rounded-bl-xs'
                  }`}>
                    {/* Quoted Checkin Photo Card (Locket Style Reply Widget) */}
                    {hasCheckinPreview && (
                      <div
                        onClick={() => {
                          if (onSelectCheckin && msg.checkinId) {
                            onSelectCheckin(msg.checkinId);
                          }
                        }}
                        className={`mb-2 p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer active:scale-98 transition ${
                          isMe
                            ? 'bg-white/15 border-white/25 hover:bg-white/25 text-white'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-800'
                        }`}
                        title="Bấm để xem lại ảnh đầy đủ"
                      >
                        {/* Thumbnail Photo */}
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/10 shrink-0 border border-black/10">
                          <img
                            src={msg.checkinPhotoUrl}
                            alt="Bằng chứng"
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Quoted Activity Meta */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-[10px] opacity-75 font-medium mb-0.5">
                            {isWater ? (
                              <Droplets className="w-3 h-3 text-sky-400 shrink-0" />
                            ) : (
                              <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
                            )}
                            <span className="truncate">Trả lời ảnh hoạt động:</span>
                          </div>
                          <p className="text-xs font-bold truncate">
                            {msg.checkinTitle || (isWater ? 'Uống nước' : 'Bữa ăn')}
                          </p>
                          {msg.checkinTime && (
                            <span className="text-[10px] font-mono opacity-80 flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> Lúc {msg.checkinTime}
                            </span>
                          )}
                        </div>

                        <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                      </div>
                    )}

                    {/* Message Text Content */}
                    <p className="text-xs sm:text-sm font-medium leading-relaxed break-words whitespace-pre-wrap">
                      {msg.text}
                    </p>

                    {/* Timestamp */}
                    <div className={`mt-1 flex items-center justify-end text-[9px] font-mono ${
                      isMe ? 'text-white/80' : 'text-gray-400'
                    }`}>
                      <span>{timeDisplay}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3.5 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {quickChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleQuickSend(chip)}
              className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 text-[11px] font-semibold whitespace-nowrap active:scale-95 transition shrink-0"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Bottom Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0"
        >
          {/* Quick Heart button */}
          <button
            type="button"
            onClick={() => handleQuickSend('❤️')}
            className="w-10 h-10 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center shrink-0 active:scale-95 transition"
            title="Thả tim nhanh"
          >
            <Heart className="w-5 h-5 fill-rose-500" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Nhắn gì đó cho người yêu..."
            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-100/80 focus:bg-white text-gray-900 placeholder-gray-400 text-xs rounded-2xl border border-transparent focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 rounded-2xl bg-gray-900 hover:bg-black disabled:opacity-40 text-white flex items-center justify-center shrink-0 shadow-sm active:scale-95 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

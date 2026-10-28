import React, { useState } from 'react';
import { Heart, Send, X, Clock, Droplets, Utensils, Download, Trash2 } from 'lucide-react';
import { sounds } from '../services/audio';

const QUICK_TAGS = ['Thả tim', 'Giỏi lắm', 'Đúng giờ', 'Ngoan lắm'];

export const ReactionModal = ({ checkin, isOpen, onClose, onReact, onDelete }) => {
  const [comment, setComment] = useState('');
  const [selectedTag, setSelectedTag] = useState('Thả tim');

  if (!isOpen || !checkin) return null;

  const handleSend = () => {
    onReact(checkin.id, {
      emoji: selectedTag === 'Thả tim' ? '❤️' : '👍',
      text: comment || selectedTag
    });
    sounds.playWaterDrop();
    setComment('');
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lượt check-in này không?')) {
      if (onDelete) onDelete(checkin.id);
      onClose();
    }
  };

  const isWater = checkin.type === 'water';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[96vh] safe-bottom">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mt-2.5 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isWater ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
              {isWater ? <Droplets className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 text-sm">{checkin.title}</h4>
              <p className="text-xs text-gray-500 flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3" /> {checkin.time} • {checkin.date}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Download button */}
            <a
              href={checkin.photoUrl}
              download={`${checkin.date}-${checkin.title}.jpg`}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
              title="Tải ảnh về máy"
            >
              <Download className="w-4 h-4" />
            </a>

            {/* Delete button */}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-2 text-gray-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition"
                title="Xóa lượt check-in này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Verification Photo Preview */}
        <div className="relative bg-slate-950 flex items-center justify-center max-h-[50vh] overflow-hidden">
          <img
            src={checkin.photoUrl}
            alt={checkin.title}
            className="w-full h-full max-h-[50vh] object-contain"
          />
          {/* Tag on image */}
          <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-white text-xs font-semibold flex items-center gap-1.5">
            {isWater ? (
              <>
                <Droplets className="w-3.5 h-3.5 text-sky-400" />
                Đã uống: {checkin.waterAmountMl}ml
              </>
            ) : (
              <>
                <Utensils className="w-3.5 h-3.5 text-amber-400" />
                Bữa ăn thực tế
              </>
            )}
          </div>
        </div>

        {/* Body content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Note from user */}
          {checkin.note && (
            <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                Ghi chú kèm theo:
              </span>
              <p className="text-xs text-gray-800 italic">"{checkin.note}"</p>
            </div>
          )}

          {/* Existing reactions list */}
          {checkin.reactions && checkin.reactions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Phản hồi đã gửi:</p>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {checkin.reactions.map((rx) => (
                  <div key={rx.id} className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 text-xs">
                    <span className="font-semibold text-gray-700">{rx.userName}:</span>
                    <span className="text-gray-600">{rx.text || 'Đã ghi nhận ảnh'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Reaction Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Chọn phản hồi nhanh:
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                    selectedTag === tag
                      ? 'bg-rose-50 text-rose-600 border border-rose-300 shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment text box */}
          <div className="flex gap-2">
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập lời khen hoặc ghi chú..."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button
              onClick={handleSend}
              className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 active:scale-95 transition"
            >
              <Send className="w-3.5 h-3.5" /> Gửi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

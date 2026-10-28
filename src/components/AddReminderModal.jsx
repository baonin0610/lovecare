import React, { useState } from 'react';
import { X, Droplets, Utensils, Clock, MessageSquare, Plus } from 'lucide-react';

export const AddReminderModal = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('water'); // 'water' or 'meal'
  const [time, setTime] = useState('10:00');
  const [waterAmountMl, setWaterAmountMl] = useState(300);
  const [mealCategory, setMealCategory] = useState('lunch');
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Vui lòng nhập tiêu đề nhắc nhở');
      return;
    }

    onAdd({
      title: title.trim(),
      type,
      time,
      waterAmountMl: type === 'water' ? Number(waterAmountMl) : null,
      mealCategory: type === 'meal' ? mealCategory : null,
      message: message.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[94vh] overflow-y-auto safe-bottom">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto -mt-2 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
          <Plus className="w-4 h-4 text-rose-500" /> Thêm mốc nhắc nhở
        </h3>
        <p className="text-xs text-gray-500 mb-5">
          Cài đặt giờ uống nước hoặc ăn uống để ứng dụng nhắc bạn gái đúng giờ.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Loại nhắc nhở:</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType('water');
                  if (!title || title.includes('Ăn')) setTitle('Cốc nước mát');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition border ${
                  type === 'water'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Droplets className="w-4 h-4 text-sky-500" /> Uống nước
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('meal');
                  if (!title || title.includes('nước')) setTitle('Bữa ăn');
                }}
                className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 font-semibold text-xs transition border ${
                  type === 'meal'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Utensils className="w-4 h-4 text-amber-500" /> Bữa ăn
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề nhắc nhở:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'water' ? 'VD: Cốc nước giữa buổi chiều' : 'VD: Bữa trưa văn phòng'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              required
            />
          </div>

          {/* Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" /> Giờ nhắc nhở:
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-rose-400"
              required
            />
          </div>

          {/* Extra options based on type */}
          {type === 'water' ? (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Lượng nước mục tiêu:
              </label>
              <div className="flex gap-1.5">
                {[200, 250, 300, 350, 500].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setWaterAmountMl(amt)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                      waterAmountMl === amt
                        ? 'bg-sky-500 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {amt}ml
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Loại bữa ăn:</label>
              <select
                value={mealCategory}
                onChange={(e) => setMealCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="breakfast">Bữa sáng</option>
                <option value="lunch">Bữa trưa</option>
                <option value="snack">Bữa xế / Ăn nhẹ</option>
                <option value="dinner">Bữa tối</option>
                <option value="other">Bữa phụ khác</option>
              </select>
            </div>
          )}

          {/* Reminder message */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" /> Lời nhắn gửi kèm:
            </label>
            <textarea
              rows="2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="VD: Đến giờ ăn rồi em, ăn no rồi chụp hình gửi anh nhé!"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gray-900 hover:bg-black text-white font-semibold rounded-2xl shadow-sm active:scale-95 transition text-xs"
            >
              Lưu mốc nhắc nhở
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

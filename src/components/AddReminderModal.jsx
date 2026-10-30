import React, { useState } from 'react';
import { X, Droplets, Utensils, Coffee, Moon, Pill, Clock, MessageSquare, Plus, BellRing } from 'lucide-react';

export const AddReminderModal = ({ isOpen, onClose, onAdd }) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('water'); // 'water' | 'meal' | 'rest' | 'sleep' | 'meds'
  const [time, setTime] = useState('10:00');
  const [waterAmountMl, setWaterAmountMl] = useState(300);
  const [mealCategory, setMealCategory] = useState('lunch');
  const [message, setMessage] = useState('');
  const [mandatory, setMandatory] = useState(true); // Full-screen mandatory alarm

  if (!isOpen) return null;

  const handleSelectType = (selectedType) => {
    setType(selectedType);
    if (selectedType === 'water') {
      if (!title || title.includes('Ăn') || title.includes('ngủ') || title.includes('Nghỉ') || title.includes('thuốc')) {
        setTitle('Cốc nước mát');
        setMessage('Đến giờ uống nước rồi em ơi! Uống đủ nước cho da đẹp nha ❤️');
      }
    } else if (selectedType === 'meal') {
      if (!title || title.includes('nước') || title.includes('ngủ') || title.includes('Nghỉ') || title.includes('thuốc')) {
        setTitle('Bữa trưa ngon miệng');
        setMessage('Đến giờ ăn rồi em, ăn no rồi chụp mâm cơm gửi anh xem nha!');
      }
    } else if (selectedType === 'sleep') {
      setTitle('Đi ngủ đúng giờ');
      setTime('22:30');
      setMessage('Đến giờ tắt điện thoại đi ngủ rồi em yêu, ngủ sớm cho khỏe nha!');
    } else if (selectedType === 'rest') {
      setTitle('Nghỉ ngơi thư giãn mắt');
      setTime('15:00');
      setMessage('Làm việc mệt rồi em, đứng dậy vươn vai hoặc nhắm mắt thư giãn 5-10 phút nhé!');
    } else if (selectedType === 'meds') {
      setTitle('Uống vitamin / Thuốc bổ');
      setTime('09:00');
      setMessage('Đến giờ uống vitamin/thuốc rồi nè, nhớ uống đều đặn và chụp gửi anh nhé!');
    }
  };

  const handleTitleChange = (val) => {
    setTitle(val);
    const lower = val.toLowerCase();
    if (
      lower.includes('ngủ') ||
      lower.includes('giường') ||
      lower.includes('khuya')
    ) {
      if (type !== 'sleep') setType('sleep');
    } else if (
      lower.includes('nghỉ') ||
      lower.includes('thư giãn') ||
      lower.includes('mỏi') ||
      lower.includes('mắt')
    ) {
      if (type !== 'rest') setType('rest');
    } else if (
      lower.includes('thuốc') ||
      lower.includes('vitamin') ||
      lower.includes('viên')
    ) {
      if (type !== 'meds') setType('meds');
    } else if (
      lower.includes('ăn') ||
      lower.includes('cơm') ||
      lower.includes('bữa') ||
      lower.includes('trưa') ||
      lower.includes('tối') ||
      lower.includes('sáng') ||
      lower.includes('phở') ||
      lower.includes('bún')
    ) {
      if (type !== 'meal') setType('meal');
    } else if (
      lower.includes('nước') ||
      lower.includes('uống') ||
      lower.includes('ly') ||
      lower.includes('cốc')
    ) {
      if (type !== 'water') setType('water');
    }
  };

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
      message: message.trim(),
      mandatory: !!mandatory
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
          Cài đặt mốc uống nước, ăn uống, nghỉ ngơi, đi ngủ hoặc uống vitamin để nhắc bạn gái đúng giờ.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Loại nhắc nhở:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectType('water')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition border ${
                  type === 'water'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Droplets className="w-4 h-4 text-sky-500" /> Uống nước
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('meal')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition border ${
                  type === 'meal'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Utensils className="w-4 h-4 text-amber-500" /> Bữa ăn
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('sleep')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition border ${
                  type === 'sleep'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-500" /> Ngủ sớm
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('rest')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition border ${
                  type === 'rest'
                    ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Coffee className="w-4 h-4 text-teal-500" /> Nghỉ ngơi
              </button>

              <button
                type="button"
                onClick={() => handleSelectType('meds')}
                className={`py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 font-semibold text-xs transition border ${
                  type === 'meds'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-xs'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Pill className="w-4 h-4 text-rose-500" /> Uống thuốc
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tiêu đề nhắc nhở:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={
                type === 'water' ? 'VD: Cốc nước giữa buổi chiều' :
                type === 'meal' ? 'VD: Bữa trưa văn phòng' :
                type === 'sleep' ? 'VD: Đi ngủ đúng giờ' :
                type === 'rest' ? 'VD: Nghỉ ngơi thư giãn mắt' : 'VD: Uống vitamin C / Sắt'
              }
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
          ) : type === 'meal' ? (
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
          ) : null}

          {/* Reminder message */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-gray-500" /> Lời nhắn gửi kèm:
            </label>
            <textarea
              rows="2"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'water' ? 'VD: Đến giờ uống nước rồi em ơi!' :
                type === 'meal' ? 'VD: Đến giờ ăn rồi em, ăn no rồi chụp mâm cơm gửi anh nhé!' :
                type === 'sleep' ? 'VD: Cất điện thoại đi ngủ sớm cho khỏe nha em yêu!' :
                type === 'rest' ? 'VD: Đứng dậy vươn vai thư giãn 5 phút nhé em!' : 'VD: Nhớ uống thuốc/vitamin đều đặn nha em!'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          {/* Mandatory Full-screen Alarm Toggle */}
          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80 flex items-center justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                <BellRing className="w-3.5 h-3.5 text-rose-600" />
                <span>Báo thức toàn màn hình bắt buộc</span>
              </div>
              <p className="text-[11px] text-rose-700/80 mt-0.5 leading-snug">
                Khi đến giờ hoặc khi chạm thông báo, app tự bung màn hình báo thức đỏ giục nộp ảnh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMandatory(!mandatory)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                mandatory ? 'bg-rose-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  mandatory ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
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

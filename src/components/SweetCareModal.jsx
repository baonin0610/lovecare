import React, { useState } from 'react';
import { X, Heart, Sparkles, Send, Coffee, Smile, Eye, Droplet, Armchair, Moon, Sun, Apple } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PRESET_MESSAGES = [
  {
    category: 'posture',
    icon: Armchair,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    title: '🌸 Lời Nhắn Từ Anh: Thẳng lưng lên nha',
    body: 'Bé yêu ơi, ngồi làm việc nhớ ngồi thẳng lưng và thả lỏng vai nha! Đừng ngồi khom lưng quá lâu kẻo đau mỏi nhé ❤️'
  },
  {
    category: 'eyes',
    icon: Eye,
    color: 'text-sky-500 bg-sky-50 border-sky-200',
    title: '👀 Lời Nhắn Từ Anh: Cho mắt nghỉ tí nhé',
    body: 'Nhìn màn hình liên tục mỏi mắt lắm đó em! Hãy chớp mắt và nhìn ra xa 20 giây cho đôi mắt xinh đẹp được thư giãn nha ✨'
  },
  {
    category: 'hydration',
    icon: Droplet,
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    title: '💧 Lời Nhắn Từ Anh: Uống ngụm nước ấm nào',
    body: 'Nghỉ tay uống một ngụm nước ấm nào em ơi! Bổ sung nước cho da dẻ lúc nào cũng tươi tắn và căng mọng nhé 💕'
  },
  {
    category: 'stretch',
    icon: Sparkles,
    color: 'text-purple-500 bg-purple-50 border-purple-200',
    title: '🧘‍♀️ Lời Nhắn Từ Anh: Vươn vai thư giãn 1 phút',
    body: 'Hít một hơi thật sâu 3 nhịp và vươn vai thư giãn nào em! Em đã làm việc rất chăm chỉ rồi, luôn có anh bên cạnh cổ vũ nè ❤️'
  },
  {
    category: 'snack',
    icon: Apple,
    color: 'text-rose-500 bg-rose-50 border-rose-200',
    title: '🍎 Lời Nhắn Từ Anh: Ăn nhẹ nạp năng lượng',
    body: 'Bé ơi, chiều rồi nhớ ăn chút hoa quả ngọt ngào hoặc sữa chua lót dạ nhé! Đừng để bụng đói làm việc mệt nha 🥰'
  },
  {
    category: 'mood',
    icon: Smile,
    color: 'text-amber-500 bg-amber-50 border-amber-200',
    title: '🌈 Lời Nhắn Từ Anh: Cười một cái thật tươi nào',
    body: 'Cười lên một cái nào công chúa của anh! Nụ cười của em là điều xinh đẹp, ấm áp và đáng yêu nhất hôm nay ✨'
  },
  {
    category: 'encouragement',
    icon: Heart,
    color: 'text-pink-500 bg-pink-50 border-pink-200',
    title: '🥰 Lời Nhắn Từ Anh: Em đã làm rất tốt hôm nay',
    body: 'Dù công việc có bận rộn hay áp lực thì vẫn luôn có anh yêu thương và đồng hành cùng em nhé. Yêu em nhiều lắm! ❤️'
  },
  {
    category: 'winddown',
    icon: Sun,
    color: 'text-orange-500 bg-orange-50 border-orange-200',
    title: '🏡 Lời Nhắn Từ Anh: Sắp được về nghỉ ngơi rồi',
    body: 'Sắp hết giờ làm việc rồi em ơi! Cố gắng chút nữa rồi về nhà nghỉ ngơi và chia sẻ ngày hôm nay với anh nha 💕'
  },
  {
    category: 'cozy_night',
    icon: Moon,
    color: 'text-indigo-500 bg-indigo-50 border-indigo-200',
    title: '🌙 Lời Nhắn Từ Anh: Tối nay thư giãn thật sâu nhé',
    body: 'Một ngày dài khép lại rồi, buông bỏ mọi mệt mỏi và nghỉ ngơi thật thoải mái nha bé. Chúc em yêu ngủ thật ngon ❤️'
  }
];

export const SweetCareModal = ({ isOpen, onClose }) => {
  const { user, couple, showToast } = useAuth();
  const [selectedPreset, setSelectedPreset] = useState(PRESET_MESSAGES[0]);
  const [customMessage, setCustomMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    setIsSending(true);
    try {
      const title = selectedPreset ? selectedPreset.title : '💌 Lời Nhắn Yêu Thương Từ Anh';
      const body = customMessage.trim() || (selectedPreset ? selectedPreset.body : '');
      const category = selectedPreset ? selectedPreset.category : 'mood';

      const res = await api.sendSweetCare(user, couple, {
        title,
        message: body,
        category
      });

      if (res && res.success) {
        showToast('Đã gửi thông báo yêu thương & chăm sóc tới iPhone của bạn gái! ❤️');
        onClose();
      } else {
        showToast(res?.message || 'Không thể gửi thông báo lúc này.');
      }
    } catch (e) {
      showToast('Lỗi gửi thông báo: ' + (e.message || 'Thử lại sau'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg mx-auto bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto safe-bottom">
        {/* Mobile handle */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto -mt-2 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-400 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
            <Heart className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Gửi Lời Động Viên & Chăm Sóc</h3>
            <p className="text-[11px] text-gray-500">Thông báo sẽ rung chuông trên màn hình khóa iPhone bạn gái</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Chọn lời nhắc sức khỏe hoặc động viên tinh thần:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {PRESET_MESSAGES.map((preset, idx) => {
                const IconComponent = preset.icon;
                const isSelected = selectedPreset?.category === preset.category;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(preset);
                      setCustomMessage(preset.body);
                    }}
                    className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition active:scale-[0.98] ${
                      isSelected
                        ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/20'
                        : 'bg-gray-50/70 border-gray-200/80 hover:bg-gray-100/70'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border ${preset.color}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-900 block truncate">
                        {preset.title.replace(/^.*: /, '')}
                      </span>
                      <span className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-snug">
                        {preset.body}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Nội dung gửi tới bạn gái (có thể sửa theo ý bạn):
            </label>
            <textarea
              rows={3}
              value={customMessage || selectedPreset?.body || ''}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Nhập lời động viên ngọt ngào của bạn..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition resize-none leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/70 text-[11px] text-amber-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Hệ thống cũng tự động gửi các lời nhắn chăm sóc sức khỏe này vào các khung giờ vàng trong ngày (<strong>09:30, 11:15, 14:15, 16:30, 20:45</strong>) để bạn gái luôn cảm nhận được sự yêu thương của bạn!
            </span>
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={isSending}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white font-bold text-xs rounded-2xl shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSending ? 'Đang gửi tới iPhone bạn gái...' : 'Gửi tới iPhone bạn gái ngay'}
          </button>
        </div>
      </div>
    </div>
  );
};

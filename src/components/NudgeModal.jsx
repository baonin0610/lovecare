import React from 'react';
import { Bell, Camera, X } from 'lucide-react';

export const NudgeModal = ({ nudge, onClose, onOpenSnap }) => {
  if (!nudge) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 text-center">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Bell Icon */}
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
          <Bell className="w-7 h-7" />
        </div>

        <span className="inline-block px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-xs font-semibold mb-2">
          Thông báo từ {nudge.senderName || 'Bạn trai'}
        </span>

        <h3 className="text-lg font-bold text-gray-900 mb-1">
          {nudge.reminderTitle || 'Uống nước & Ăn uống đúng giờ'}
        </h3>

        <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs text-gray-700 mb-6 italic">
          "{nudge.message || 'Bạn trai vừa nhắc bạn uống nước hoặc ăn uống đúng giờ. Nhớ chụp ảnh xác nhận nhé!'}"
        </div>

        <div className="space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenSnap();
            }}
            className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white font-semibold rounded-2xl text-xs flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Camera className="w-4 h-4" /> Mở camera chụp ảnh ngay
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-xs font-medium text-gray-500 hover:text-gray-700 transition"
          >
            Đóng thông báo
          </button>
        </div>
      </div>
    </div>
  );
};

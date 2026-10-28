import React, { useState } from 'react';
import { RefreshCw, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const UpdatePromptModal = ({ isOpen, onClose, onUpdate }) => {
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsUpdating(true);
    await onUpdate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 text-center animate-in zoom-in-95">
        {/* Animated Icon */}
        <div className="relative w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-400 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
          <RefreshCw className={`w-8 h-8 ${isUpdating ? 'animate-spin' : ''}`} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-1.5">
          Phiên bản mới đã sẵn sàng!
        </h3>

        {/* Description */}
        <p className="text-xs text-gray-600 mb-5 leading-relaxed px-2">
          Ứng dụng vừa được nâng cấp tính năng và giao diện mới. Bấm nút bên dưới để cập nhật ngay <span className="font-semibold text-gray-900">(không cần xóa cài lại app)</span>!
        </p>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleApply}
            disabled={isUpdating}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold rounded-2xl shadow-md shadow-rose-500/25 flex items-center justify-center gap-2 active:scale-95 transition text-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Đang làm mới ứng dụng...' : 'Cập nhật & Tải lại ngay'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              disabled={isUpdating}
              className="w-full py-2.5 px-4 text-xs font-semibold text-gray-400 hover:text-gray-700 transition"
            >
              Để sau
            </button>
          )}
        </div>

        {/* Footnote */}
        <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400 font-medium">
          Dữ liệu hình ảnh, ghi chú và tin nhắn đều được giữ nguyên 100%.
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Volume2, VolumeX, Camera, BellRing, Smartphone, ShieldAlert } from 'lucide-react';
import { alarm } from '../services/alarm';

export const AlarmScreenModal = ({ isOpen, reminder, onOpenSnap }) => {
  const [soundMuted, setSoundMuted] = useState(false);

  if (!isOpen || !reminder) return null;

  const handleMuteSound = () => {
    alarm.stopAlarmSound();
    setSoundMuted(true);
  };

  const handleProceedToSnap = () => {
    // Open camera modal to take photo
    onOpenSnap(reminder);
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-between bg-black text-white p-6 sm:p-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="text-center pt-8 safe-top">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-xs font-semibold uppercase tracking-wider mb-3">
          <BellRing className="w-4 h-4 animate-bounce" /> Báo Thức Đến Giờ
        </div>
        <p className="text-sm text-gray-400 font-medium">LoveCare Báo Thức</p>
      </div>

      {/* Center Big Clock & Reminder Info */}
      <div className="text-center my-auto">
        <h1 className="text-6xl sm:text-7xl font-mono font-black tracking-tight text-white mb-3">
          {reminder.time || timeStr}
        </h1>

        <h2 className="text-2xl font-bold text-gray-100 mb-2">
          {reminder.title || 'Đến giờ uống nước & ăn uống'}
        </h2>

        {reminder.message && (
          <p className="text-sm text-gray-400 max-w-xs mx-auto italic mt-1 leading-relaxed">
            "{reminder.message}"
          </p>
        )}

        {/* Vibration Status Badge */}
        <div className="mt-8 inline-flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/10 border border-white/15 text-xs text-rose-300 font-medium animate-pulse">
          <Smartphone className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Điện thoại đang rung liên tục. Chụp ảnh để dừng rung!</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="space-y-3 pb-6 safe-bottom max-w-sm mx-auto w-full">
        {/* Main button: MUST SNAP TO STOP VIBRATION */}
        <button
          onClick={handleProceedToSnap}
          className="w-full py-4 px-6 bg-rose-500 hover:bg-rose-600 text-white font-bold text-base rounded-2xl shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2.5 active:scale-95 transition"
        >
          <Camera className="w-5 h-5" /> Chụp ảnh xác thực để tắt rung
        </button>

        {/* Secondary: Can silence sound, but vibration still persists */}
        {!soundMuted ? (
          <button
            onClick={handleMuteSound}
            className="w-full py-3 px-4 bg-white/10 hover:bg-white/20 text-gray-300 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition"
          >
            <VolumeX className="w-4 h-4" /> Tắt tiếng chuông (Vẫn giữ rung)
          </button>
        ) : (
          <p className="text-center text-[11px] text-gray-500 py-1">
            Đã tắt tiếng chuông. Bạn cần chụp ảnh để tắt rung hoàn toàn.
          </p>
        )}
      </div>
    </div>
  );
};

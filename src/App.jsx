import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { CaretakerView } from './components/CaretakerView';
import { LoverView } from './components/LoverView';
import { CoupleConnectView } from './components/CoupleConnectView';
import { AuthModal } from './components/AuthModal';
import { NudgeModal } from './components/NudgeModal';
import { AlarmScreenModal } from './components/AlarmScreenModal';
import { PwaInstallGuide } from './components/PwaInstallGuide';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import {
  Heart,
  Droplets,
  Smartphone,
  Repeat,
  LogOut,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { api } from './services/api';
import { IS_DEV_MODE } from './config';
import { alarm } from './services/alarm';

export function App() {
  const {
    user,
    couple,
    logout,
    quickSwitch,
    activeNudge,
    setActiveNudge,
    activeAlarm,
    dismissAlarm,
    toastMessage,
    showToast
  } = useAuth();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickSnapOpen, setIsQuickSnapOpen] = useState(false);
  const [isAlarmSnapOpen, setIsAlarmSnapOpen] = useState(false);
  const [needsNotifPermission, setNeedsNotifPermission] = useState(false);

  const isCaretaker = user?.role === 'caretaker';
  const isCoupleConnected = couple && couple.caretakerId && couple.loverId;

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        setNeedsNotifPermission(true);
      }
    }
  }, [user]);

  const handleRequestNotification = async () => {
    const res = await alarm.requestNotificationPermission();
    if (res === 'granted') {
      showToast('Đã bật thông báo báo thức trên iPhone thành công.');
      setNeedsNotifPermission(false);
    } else {
      showToast('Thông báo chưa được cấp quyền.');
      setNeedsNotifPermission(false);
    }
  };

  const handleCompleteCheckinFromNudge = async (formData) => {
    await api.createCheckin(user, couple, formData);
    showToast('Đã gửi ảnh xác thực thành công.');
    alarm.stopAll();
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 flex flex-col items-center">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 z-50 transition-all animate-in fade-in slide-in-from-top-3">
          <div className="bg-gray-900 text-white text-xs font-semibold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 border border-gray-800">
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Main Container - optimized for iPhone width & responsive desktop with Safe Area */}
      <div className="w-full max-w-lg min-h-screen flex flex-col px-4 safe-top-header">
        {/* App Top Bar */}
        <header className="flex items-center justify-between py-2 mb-3 border-b border-gray-100 pb-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-sm">
              <Droplets className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base text-gray-900 tracking-tight">LoveCare</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              </div>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                {user ? (isCaretaker ? 'Bạn trai' : 'Bạn gái') : 'Chăm sóc cặp đôi'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {/* Install on iPhone button */}
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-2 text-gray-700 bg-white hover:bg-gray-50 rounded-xl font-medium text-xs flex items-center gap-1.5 transition border border-gray-200 shadow-xs min-h-[40px] active:scale-95"
              title="Cài app trên iPhone"
            >
              <Smartphone className="w-4 h-4 text-gray-600" />
              <span className="hidden sm:inline">Cài lên iPhone</span>
            </button>

            {user ? (
              <>
                {/* Switch Role Quick Button - ONLY IN DEV MODE */}
                {IS_DEV_MODE && (
                  <button
                    onClick={() => quickSwitch(isCaretaker ? 'lover' : 'caretaker')}
                    className="px-2.5 py-2 text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 transition text-[11px] font-semibold flex items-center gap-1 min-h-[40px] active:scale-95"
                    title="[Dev Only] Chuyển vai"
                  >
                    <Repeat className="w-3.5 h-3.5 text-amber-600" />
                    <span>{isCaretaker ? 'Dev: Em' : 'Dev: Anh'}</span>
                  </button>
                )}

                {/* Logout button with large touch target */}
                <button
                  onClick={logout}
                  className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-rose-600 rounded-xl bg-gray-100 hover:bg-rose-50 transition active:scale-95 border border-gray-200/80"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div className="flex gap-1.5">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs border border-gray-200 shadow-xs min-h-[40px] active:scale-95"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-xl text-xs min-h-[40px] active:scale-95 shadow-xs"
                >
                  Đăng ký
                </button>
              </div>
            )}
          </div>
        </header>

        {/* iPhone Notification Permission Banner */}
        {needsNotifPermission && user && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-rose-900 font-medium">Bật thông báo để iPhone reo chuông đúng giờ</span>
            </div>
            <button
              onClick={handleRequestNotification}
              className="px-3 py-1.5 bg-rose-600 text-white rounded-xl font-semibold text-xs shrink-0 active:scale-95 transition"
            >
              Bật ngay
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1">
          {user ? (
            isCaretaker ? (
              <CaretakerView />
            ) : (
              <LoverView />
            )
          ) : (
            /* Welcome / Landing Screen */
            <div className="text-center py-12 px-6 bg-white rounded-3xl mt-4 border border-gray-100 shadow-sm">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100">
                <Heart className="w-7 h-7 fill-rose-500" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">
                Chăm Sóc & Nhắc Nhở Người Yêu
              </h2>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mb-8 leading-relaxed">
                Ứng dụng đồng hành dành riêng cho hai bạn. Nhắc nhở uống nước, ăn uống đúng giờ kèm chụp ảnh xác thực thời gian thực.
              </p>

              {/* Action Buttons */}
              <div className="space-y-3 max-w-xs mx-auto mb-6">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-semibold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  Đăng nhập tài khoản
                </button>

                <button
                  onClick={() => {
                    setAuthMode('register');
                    setIsAuthOpen(true);
                  }}
                  className="w-full py-3.5 px-4 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                >
                  Đăng ký tài khoản cặp đôi
                </button>
              </div>

              {/* Dev Only Shortcut */}
              {IS_DEV_MODE && (
                <div className="bg-amber-50 rounded-2xl p-3 border border-amber-200 max-w-xs mx-auto mb-6">
                  <p className="text-[11px] font-semibold text-amber-800 mb-2 text-center">
                    [Chế độ Dev] Thử vai nhanh:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => quickSwitch('caretaker')}
                      className="py-1.5 px-2 bg-white text-amber-900 border border-amber-300 rounded-xl font-medium text-[11px] hover:bg-amber-100/50"
                    >
                      Thử Bạn trai
                    </button>
                    <button
                      onClick={() => quickSwitch('lover')}
                      className="py-1.5 px-2 bg-white text-amber-900 border border-amber-300 rounded-xl font-medium text-[11px] hover:bg-amber-100/50"
                    >
                      Thử Bạn gái
                    </button>
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span>Bảo mật tài khoản & dữ liệu riêng tư</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FULLSCREEN ALARM SCREEN (Triggered by scheduled time or boyfriend's buzz) */}
      <AlarmScreenModal
        isOpen={!!activeAlarm}
        reminder={activeAlarm}
        onOpenSnap={(rem) => {
          setIsAlarmSnapOpen(true);
        }}
      />

      {/* Camera Capture triggered by Alarm: STOPS VIBRATION ONLY WHEN PHOTO COMPLETED */}
      <CameraCaptureModal
        isOpen={isAlarmSnapOpen}
        onClose={() => setIsAlarmSnapOpen(false)}
        reminder={activeAlarm}
        onComplete={async (formData) => {
          await api.createCheckin(user, couple, formData);
          showToast('Đã xác thực và tắt rung thành công.');
          dismissAlarm(); // STOPS VIBRATION AND ALARM SOUND!
          setIsAlarmSnapOpen(false);
        }}
      />

      {/* Nudge Alert Modal */}
      <NudgeModal
        nudge={activeNudge}
        onClose={() => {
          setActiveNudge(null);
          alarm.stopVibration();
        }}
        onOpenSnap={() => {
          setActiveNudge(null);
          setIsQuickSnapOpen(true);
        }}
      />

      {/* Quick Snap Modal */}
      <CameraCaptureModal
        isOpen={isQuickSnapOpen}
        onClose={() => {
          setIsQuickSnapOpen(false);
          alarm.stopAll();
        }}
        reminder={{
          type: activeNudge?.type || 'water',
          title: activeNudge?.reminderTitle || 'Uống nước đúng giờ',
          waterAmountMl: 300
        }}
        onComplete={handleCompleteCheckinFromNudge}
      />

      {/* PWA Install Guide Modal */}
      <PwaInstallGuide
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        initialMode={authMode}
      />
    </div>
  );
}
export default App;

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { CaretakerView } from './components/CaretakerView';
import { LoverView } from './components/LoverView';
import { CoupleConnectView } from './components/CoupleConnectView';
import { AuthModal } from './components/AuthModal';
import { NudgeModal } from './components/NudgeModal';
import { AlarmScreenModal } from './components/AlarmScreenModal';
import { PwaInstallGuide } from './components/PwaInstallGuide';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { UpdatePromptModal } from './components/UpdatePromptModal';
import { LocketChatBox } from './components/LocketChatBox';
import { ReactionModal } from './components/ReactionModal';
import { AlarmSettingsModal } from './components/AlarmSettingsModal';
import {
  Heart,
  Droplets,
  Smartphone,
  Repeat,
  LogOut,
  ShieldCheck,
  Bell,
  BellRing,
  RefreshCw,
  MessageCircle
} from 'lucide-react';
import { api } from './services/api';
import { IS_DEV_MODE } from './config';
import { alarm } from './services/alarm';
import {
  subscribePushNotifications,
  testPushNotification,
  isIosDevice,
  isStandalonePwa
} from './services/push';
import { initLifecycleKeepAlive } from './services/backgroundKeepAlive';

export function App() {
  const {
    user,
    couple,
    socket,
    logout,
    quickSwitch,
    activeNudge,
    setActiveNudge,
    activeAlarm,
    activeSweetCare,
    setActiveSweetCare,
    dismissAlarm,
    testAlarm,
    toastMessage,
    showToast,
    isChatBoxOpen,
    setIsChatBoxOpen,
    unreadChatCount,
    setUnreadChatCount,
    lastChatMessage
  } = useAuth();

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isQuickSnapOpen, setIsQuickSnapOpen] = useState(false);
  const [isAlarmSnapOpen, setIsAlarmSnapOpen] = useState(false);
  const [isAlarmSettingsOpen, setIsAlarmSettingsOpen] = useState(false);
  const [needsNotifPermission, setNeedsNotifPermission] = useState(false);
  const [chatSelectedCheckin, setChatSelectedCheckin] = useState(null);

  // App version update detection
  const [hasNewUpdate, setHasNewUpdate] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const currentBuildIdRef = useRef(null);

  const isCaretaker = user?.role === 'caretaker';
  const isCoupleConnected = couple && couple.caretakerId && couple.loverId;

  // Function to check server version
  const checkForUpdates = async () => {
    try {
      const res = await fetch(`/api/version?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.buildId) return;

      if (!currentBuildIdRef.current) {
        currentBuildIdRef.current = data.buildId;
      } else if (currentBuildIdRef.current !== data.buildId) {
        console.log(`[Version Check] New build detected: ${data.buildId} (Current: ${currentBuildIdRef.current})`);
        setHasNewUpdate(true);
        setIsUpdateModalOpen(true);
      }
    } catch (e) {
      // Ignore network errors
    }
  };

  useEffect(() => {
    // 1. Initial version check
    checkForUpdates();

    // 2. Periodic background check every 35 seconds
    const interval = setInterval(checkForUpdates, 35000);

    // 3. Check when user unlocks or re-opens app / switches tabs
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', checkForUpdates);

    // 4. Socket listener for real-time instant notification on server redeploy
    if (socket) {
      const handleServerBuildId = ({ buildId }) => {
        if (!buildId) return;
        if (!currentBuildIdRef.current) {
          currentBuildIdRef.current = buildId;
        } else if (currentBuildIdRef.current !== buildId) {
          console.log(`[Socket Version] New build received: ${buildId}`);
          setHasNewUpdate(true);
          setIsUpdateModalOpen(true);
        }
      };
      socket.on('server_build_id', handleServerBuildId);
      return () => {
        socket.off('server_build_id', handleServerBuildId);
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
        window.removeEventListener('focus', checkForUpdates);
      };
    }

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', checkForUpdates);
    };
  }, [socket]);

  // Keep background session active and auto-reconnect on phone unlock
  useEffect(() => {
    if (!user) return;
    const cleanup = initLifecycleKeepAlive(() => {
      checkForUpdates();
    });
    return cleanup;
  }, [user?.id]);

  // Clean, instantaneous update handler without needing to remove the app from Home Screen
  const handleApplyUpdate = async () => {
    try {
      // 1. Tell active service worker to skip waiting & clear old caches
      if ('serviceWorker' in navigator) {
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
        }
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          await reg.update();
        }
      }
      // 2. Clear browser CacheStorage
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }
    } catch (err) {
      console.warn('Update clear cache error:', err);
    }

    // 3. Force hard reload bypassing cache with timestamp parameter
    const url = new URL(window.location.href);
    url.searchParams.set('reload', Date.now().toString());
    window.location.replace(url.toString());
  };

  // Web Push status tracking for Lock Screen / Background notifications on iPhone
  const [pushStatus, setPushStatus] = useState('checking'); // 'subscribed', 'needs_permission', 'needs_pwa', 'unsupported'
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isTestingPush, setIsTestingPush] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setPushStatus('unsupported');
      return;
    }

    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          if (reg.pushManager) {
            reg.pushManager.getSubscription().then((sub) => {
              if (sub) {
                setPushStatus('subscribed');
                // Keep server updated with active subscription
                fetch('/api/push/subscribe', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': user.id,
                    'x-couple-id': couple?.id,
                    'x-user-role': user.role || '',
                    'x-user-name': encodeURIComponent(user.name || '')
                  },
                  body: JSON.stringify({
                    subscription: sub,
                    userId: user.id,
                    coupleId: couple?.id,
                    role: user.role,
                    userName: user.name
                  })
                }).catch(() => {});
              } else {
                setPushStatus('needs_permission');
              }
            }).catch(() => setPushStatus('needs_permission'));
          } else {
            setPushStatus(isIosDevice() && !isStandalonePwa() ? 'needs_pwa' : 'unsupported');
          }
        }).catch(() => setPushStatus('needs_permission'));
      }
    } else {
      if (isIosDevice() && !isStandalonePwa()) {
        setPushStatus('needs_pwa');
      } else {
        setPushStatus('needs_permission');
      }
    }
  }, [user, couple?.id]);

  const handleRequestPushNotification = async () => {
    setIsSubscribingPush(true);
    try {
      const res = await subscribePushNotifications(user, couple);
      if (res.success) {
        setPushStatus('subscribed');
        showToast('Đã kích hoạt thông báo ngầm iPhone! Dù tắt app hay khoá máy vẫn nhận được chuông.');
        // Immediate test push to confirm Lock Screen notification works
        setTimeout(async () => {
          await testPushNotification(user);
        }, 1500);
      } else {
        if (res.isIos && !res.isStandalone) {
          setIsGuideOpen(true);
          showToast('iPhone yêu cầu: Thêm app vào Màn hình chính để nhận thông báo khi tắt app!');
        } else if (res.reason === 'permission_denied') {
          showToast('Thông báo bị chặn trong Cài đặt iPhone. Vui lòng bật lại quyền thông báo.');
        } else {
          showToast('Chưa thể bật push: ' + (res.reason || 'Vui lòng thử lại'));
        }
      }
    } catch (e) {
      showToast('Lỗi kích hoạt thông báo: ' + e.message);
    } finally {
      setIsSubscribingPush(false);
    }
  };

  const handleTestLockScreenPush = async () => {
    setIsTestingPush(true);
    showToast('Đang gửi thông báo thử nghiệm tới màn hình iPhone của bạn...');
    try {
      const res = await testPushNotification(user);
      if (res.success) {
        showToast('Đã gửi thông báo thử nghiệm! Hãy thử khoá màn hình để kiểm tra.');
      } else {
        showToast('Chưa thể gửi thông báo thử nghiệm: ' + (res.error || 'Vui lòng thử lại'));
      }
    } catch (e) {
      showToast('Lỗi gửi thử: ' + e.message);
    } finally {
      setIsTestingPush(false);
    }
  };

  const handleCompleteCheckinFromNudge = async (formData) => {
    await api.createCheckin(user, couple, formData);
    showToast('Đã gửi ảnh xác thực thành công.');
    alarm.stopAll();
  };

  const handleSelectCheckinFromChat = async (checkinId) => {
    try {
      const chks = await api.getCheckins(user, couple);
      const found = chks.find((c) => c.id === checkinId);
      if (found) {
        setChatSelectedCheckin(found);
      }
    } catch (e) {
      console.warn('Failed to load checkin for chat view:', e);
    }
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
                {/* Alarm Settings Header Button */}
                <button
                  onClick={() => setIsAlarmSettingsOpen(true)}
                  className="w-10 h-10 flex items-center justify-center text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200/80 shadow-xs active:scale-95 shrink-0"
                  title="Cài đặt Báo thức bắt buộc toàn màn hình"
                >
                  <BellRing className="w-4 h-4 text-rose-600" />
                </button>

                {/* Locket Chat Box Header Button */}
                <button
                  onClick={() => {
                    setIsChatBoxOpen(true);
                    setUnreadChatCount(0);
                  }}
                  className="relative w-10 h-10 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200/80 shadow-xs active:scale-95 shrink-0"
                  title="Mở Chat Box Locket"
                >
                  <MessageCircle className="w-5 h-5 fill-rose-500/20" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </button>

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

        {/* App Version Update Notice Banner */}
        {hasNewUpdate && (
          <div className="mb-3 p-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-between gap-3 shadow-md shadow-rose-500/20 text-xs animate-in fade-in">
            <div className="flex items-center gap-2 min-w-0">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-white" />
              <div className="truncate">
                <span className="font-bold block text-xs">Có bản cập nhật mới!</span>
                <span className="text-[11px] text-white/90">Bấm để tải lại phiên bản mới nhất</span>
              </div>
            </div>
            <button
              onClick={handleApplyUpdate}
              className="px-3.5 py-1.5 bg-white text-rose-600 rounded-xl font-bold text-xs shrink-0 active:scale-95 transition shadow-xs"
            >
              Cập nhật ngay
            </button>
          </div>
        )}

        {/* Banner 1: If on iPhone but still in Safari browser (Needs Add to Home Screen) */}
        {pushStatus === 'needs_pwa' && user && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-amber-950 font-bold block">Nhận thông báo khi tắt app iPhone</span>
                <span className="text-amber-800 text-[11px] block mt-0.5">
                  Thêm app ra Màn hình chính để iPhone reo chuông đúng giờ kể cả khi khoá máy!
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shrink-0 active:scale-95 transition shadow-xs whitespace-nowrap"
            >
              Cách cài (10s)
            </button>
          </div>
        )}

        {/* Banner 2: Needs Push Notification Permission */}
        {pushStatus === 'needs_permission' && user && (
          <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-rose-950 font-bold block">Bật thông báo chạy ngầm</span>
                <span className="text-rose-800 text-[11px] block mt-0.5">
                  Cho phép thông báo để iPhone reo chuông đúng giờ kể cả khi tắt app
                </span>
              </div>
            </div>
            <button
              onClick={handleRequestPushNotification}
              disabled={isSubscribingPush}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shrink-0 active:scale-95 transition shadow-xs whitespace-nowrap disabled:opacity-50"
            >
              {isSubscribingPush ? 'Đang bật...' : 'Bật ngay'}
            </button>
          </div>
        )}

        {/* Banner 3: If already subscribed, provide a small test button if user wants to verify */}
        {pushStatus === 'subscribed' && user && (
          <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-50/80 border border-emerald-200/90 flex items-center justify-between text-[11px] text-emerald-900 shadow-xs">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>Chạy ngầm 24/7: Khóa máy hay tắt app vẫn reo đúng giờ</span>
            </span>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsAlarmSettingsOpen(true)}
                className="font-bold underline text-emerald-700 hover:text-emerald-950 active:scale-95 transition"
              >
                Cài đặt báo thức
              </button>
              <button
                onClick={handleTestLockScreenPush}
                disabled={isTestingPush}
                className="font-bold underline text-emerald-700 hover:text-emerald-950 active:scale-95 transition"
                title="Bấm để gửi 1 thông báo thử nghiệm tới iPhone của bạn"
              >
                {isTestingPush ? 'Đang gửi...' : 'Thử chuông'}
              </button>
            </div>
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

              <div className="mt-6 pt-4 border-t border-gray-100 text-xs font-semibold text-gray-400">
                Phát triển bởi Bảo Duy
              </div>
            </div>
          )}
        </main>

        {/* Global App Footer */}
        <footer className="mt-auto py-5 text-center text-xs text-gray-400 font-medium select-none">
          Phát triển bởi Bảo Duy
        </footer>
      </div>

      {/* App Update Prompt Modal */}
      <UpdatePromptModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onUpdate={handleApplyUpdate}
      />

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

      {/* Sweet Care & Encouragement Received Popup for Lover */}
      {activeSweetCare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 text-center relative animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 text-white flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-rose-500/30 animate-bounce">
              <Heart className="w-7 h-7 fill-white" />
            </div>

            <span className="px-3 py-1 rounded-full bg-pink-100 text-pink-700 font-bold text-[10px] uppercase tracking-wider inline-block mb-2">
              {activeSweetCare.senderName || 'Bạn trai'} gửi bạn
            </span>

            <h3 className="text-base font-bold text-gray-900 mb-2">
              {activeSweetCare.title || '💌 Lời Nhắn Yêu Thương'}
            </h3>

            <p className="text-xs text-gray-600 leading-relaxed bg-pink-50/60 p-3.5 rounded-2xl border border-pink-200/60 mb-5">
              {activeSweetCare.body}
            </p>

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await api.sendMessage(user, couple, {
                      text: 'Dạ em cảm ơn anh yêu nhiều nha! Em sẽ chú ý chăm sóc bản thân ❤️🥰',
                      emoji: '❤️'
                    });
                    showToast('Đã gửi phản hồi tới bạn trai ❤️');
                  } catch (e) {}
                  setActiveSweetCare(null);
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/20 active:scale-95 transition"
              >
                Cảm ơn anh yêu ❤️
              </button>

              <button
                type="button"
                onClick={() => setActiveSweetCare(null)}
                className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Floating Locket Chat Bubble at corner */}
      {user && (
        <div className="fixed bottom-6 right-5 z-40 flex items-center gap-2">
          {/* Preview pill if there was a recent message and chat box is closed */}
          {lastChatMessage && !isChatBoxOpen && (
            <button
              onClick={() => {
                setIsChatBoxOpen(true);
                setUnreadChatCount(0);
              }}
              className="bg-gray-900/90 hover:bg-black text-white text-xs font-medium px-3.5 py-2 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 max-w-[200px] truncate transition active:scale-95 animate-in fade-in slide-in-from-right-3"
            >
              <span className="font-bold text-rose-400 shrink-0">
                {lastChatMessage.userName}:
              </span>
              <span className="truncate">{lastChatMessage.text}</span>
            </button>
          )}

          <button
            onClick={() => {
              setIsChatBoxOpen(!isChatBoxOpen);
              setUnreadChatCount(0);
            }}
            className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 via-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-xl shadow-rose-500/40 flex items-center justify-center transition-all duration-200 active:scale-90 border-2 border-white ring-4 ring-rose-500/20 group"
            title={isChatBoxOpen ? 'Đóng chat Locket' : 'Mở Chat Box Locket'}
          >
            <MessageCircle className="w-5 h-5 fill-white/20 group-hover:scale-110 transition duration-200" />
            {unreadChatCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-white text-rose-600 text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-rose-500 animate-bounce">
                {unreadChatCount}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Dedicated Locket Chat Box Modal */}
      <LocketChatBox
        isOpen={isChatBoxOpen}
        onClose={() => setIsChatBoxOpen(false)}
        onSelectCheckin={handleSelectCheckinFromChat}
      />

      {/* Full Photo Modal when tapping on a quoted checkin inside LocketChatBox */}
      <ReactionModal
        checkin={chatSelectedCheckin}
        isOpen={!!chatSelectedCheckin}
        onClose={() => setChatSelectedCheckin(null)}
        onReact={async (checkinId, reaction) => {
          await api.reactToCheckin(user, couple, checkinId, reaction);
        }}
      />

      {/* Global Alarm & Mandatory Notification Settings Modal */}
      <AlarmSettingsModal
        isOpen={isAlarmSettingsOpen}
        onClose={() => setIsAlarmSettingsOpen(false)}
        onTestAlarm={testAlarm}
      />
    </div>
  );
}
export default App;

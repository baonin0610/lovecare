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
import { DiagnosticModal } from './components/DiagnosticModal';
import { BottomNavBar } from './components/BottomNavBar';
import { BedtimeJournalModal } from './components/BedtimeJournalModal';
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
  MessageCircle,
  MoreVertical,
  Wrench,
  Sparkles,
  ChevronRight,
  BookHeart
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

  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeNavTab, setActiveNavTab] = useState('today');
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [hasNewJournalAlert, setHasNewJournalAlert] = useState(false);
  const menuRef = useRef(null);

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

  // Click outside to close top-right menu hub
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  // Open Bedtime Journal if query param ?journal=1 is present
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('journal=1')) {
      setIsJournalOpen(true);
    }
  }, []);

  // Realtime Socket listener for Bedtime Journal events
  useEffect(() => {
    if (!socket || !user) return;

    const handleJournalUpdated = (data) => {
      if (user.role === 'caretaker') {
        setHasNewJournalAlert(true);
        showToast('Bạn gái vừa gửi nhật ký cuối ngày ❤️');
      }
    };

    const handleJournalReacted = (data) => {
      if (user.role === 'lover') {
        showToast('Bạn trai vừa gửi cho bạn một cái ôm và lời chúc ngủ ngon ❤️');
      }
    };

    const handleJournalNudge = (data) => {
      if (user.role === 'lover') {
        setIsJournalOpen(true);
        showToast(data.message || 'Bạn trai đang chờ nghe tâm sự hôm nay của bạn đó ❤️');
      }
    };

    socket.on('journal_updated', handleJournalUpdated);
    socket.on('journal_reacted', handleJournalReacted);
    socket.on('journal_nudge', handleJournalNudge);

    return () => {
      socket.off('journal_updated', handleJournalUpdated);
      socket.off('journal_reacted', handleJournalReacted);
      socket.off('journal_nudge', handleJournalNudge);
    };
  }, [socket, user?.role, showToast]);

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
                // Permission was already granted by user: Auto-subscribe to ensure server has valid PushSubscription
                subscribePushNotifications(user, couple)
                  .then((res) => {
                    if (res.success) {
                      setPushStatus('subscribed');
                    } else {
                      setPushStatus('needs_permission');
                    }
                  })
                  .catch(() => setPushStatus('needs_permission'));
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

          {/* Action buttons (compact & future-proof) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user ? (
              <>
                {/* 1. Bedtime Journal Button (Icon cuốn sổ góc trên màn hình) */}
                <button
                  onClick={() => {
                    setIsJournalOpen(true);
                    setHasNewJournalAlert(false);
                  }}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition border border-rose-100 shadow-2xs active:scale-95 shrink-0"
                  title="Nhật ký cuối ngày"
                >
                  <BookHeart className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  {hasNewJournalAlert && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                      •
                    </span>
                  )}
                </button>

                {/* 2. Locket Chat Box Header Button (Primary Shortcut) */}
                <button
                  onClick={() => {
                    setIsChatBoxOpen(true);
                    setUnreadChatCount(0);
                  }}
                  className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-2xl transition border border-rose-100 shadow-2xs active:scale-95 shrink-0"
                  title="Tin nhắn Locket"
                >
                  <MessageCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 fill-rose-500/20" />
                  {unreadChatCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4.5 h-4.5 min-w-[18px] px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                      {unreadChatCount}
                    </span>
                  )}
                </button>

                {/* 3. Quick Menu Hub Button (...) */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl transition border active:scale-95 shrink-0 ${
                      isMenuOpen
                        ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                        : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-200/80 shadow-2xs'
                    }`}
                    title="Menu tiện ích & Cài đặt"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                  </button>

                  {/* Dropdown Popover */}
                  {isMenuOpen && (
                    <div className="absolute right-0 top-12 z-50 w-72 bg-white/95 backdrop-blur-xl border border-gray-100/90 rounded-3xl shadow-2xl p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150">
                      {/* User & Couple Status Card */}
                      <div className="px-3 py-2.5 bg-gradient-to-br from-rose-50/70 to-pink-50/50 rounded-2xl border border-rose-100/60 mb-1">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {user.name ? user.name.charAt(0).toUpperCase() : (isCaretaker ? 'A' : 'E')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">
                              {user.name || (isCaretaker ? 'Bạn trai' : 'Bạn gái')}
                            </p>
                            <p className="text-[10px] text-rose-600 font-semibold flex items-center gap-1 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                              {isCoupleConnected ? 'Đã kết đôi hạnh phúc ❤️' : 'Chưa kết nối đôi'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Section: Tiện ích hệ thống */}
                      <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Tiện ích hệ thống
                      </p>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsJournalOpen(true);
                          setHasNewJournalAlert(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-700 transition group text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <BookHeart className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">Nhật ký cuối ngày</span>
                            <span className="text-[10px] text-gray-400">Tâm sự trước khi ngủ</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsAlarmSettingsOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-700 transition group text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <BellRing className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">Báo thức màn hình</span>
                            <span className="text-[10px] text-gray-400">Chuông &amp; rung toàn màn hình</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsDiagnosticOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-700 transition group text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Wrench className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">Chẩn đoán &amp; Check lỗi</span>
                            <span className="text-[10px] text-gray-400">Kiểm tra kết nối và ảnh</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
                      </button>

                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsGuideOpen(true);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-gray-50 text-gray-700 transition group text-left"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Smartphone className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-gray-800 block">Cài app lên iPhone</span>
                            <span className="text-[10px] text-gray-400">Thêm vào Màn hình chính</span>
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition" />
                      </button>

                      {/* Section: Sẵn sàng cho tính năng mới */}
                      <div className="pt-1.5 pb-0.5">
                        <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                          Không gian tính năng mới
                        </p>
                        <div className="px-3 py-2 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-700 block">Tính năng sắp tới</span>
                              <span className="text-[10px] text-gray-400">Sẵn sàng mở rộng thêm</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-bold">
                            Sẵn sàng
                          </span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-gray-100 my-1" />

                      {/* Dev Switch Role if enabled */}
                      {IS_DEV_MODE && (
                        <button
                          onClick={() => {
                            setIsMenuOpen(false);
                            quickSwitch(isCaretaker ? 'lover' : 'caretaker');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-amber-50 text-amber-800 transition text-left"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                            <Repeat className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-semibold block">Đổi vai: {isCaretaker ? 'Bạn gái' : 'Bạn trai'}</span>
                            <span className="text-[10px] text-amber-600/80">Dành riêng cho Dev</span>
                          </div>
                        </button>
                      )}

                      {/* Logout */}
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-50 text-rose-600 transition text-left"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-semibold">Đăng xuất tài khoản</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-gray-600 bg-white hover:bg-gray-50 rounded-2xl border border-gray-200/80 shadow-2xs active:scale-95 transition"
                  title="Cài app trên iPhone"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 sm:py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-full text-xs border border-gray-200 shadow-2xs active:scale-95 transition"
                >
                  Đăng nhập
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setIsAuthOpen(true);
                  }}
                  className="px-3.5 py-1.5 sm:py-2 bg-gray-900 hover:bg-black text-white font-semibold rounded-full text-xs active:scale-95 shadow-xs transition"
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
              <CaretakerView navTab={activeNavTab} onNavTabChange={setActiveNavTab} />
            ) : (
              <LoverView navTab={activeNavTab} onNavTabChange={setActiveNavTab} />
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

      {/* Global Diagnostic & Sync Modal */}
      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />

      {/* Floating Locket Chat Preview pill above Bottom Nav */}
      {user && lastChatMessage && !isChatBoxOpen && (
        <div className="fixed bottom-20 right-4 z-40 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <button
            onClick={() => {
              setIsChatBoxOpen(true);
              setUnreadChatCount(0);
            }}
            className="bg-gray-900/95 hover:bg-black text-white text-xs font-medium px-3.5 py-2.5 rounded-2xl shadow-xl border border-white/20 flex items-center gap-2 max-w-[240px] truncate transition active:scale-95"
          >
            <MessageCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold text-rose-300 shrink-0">
              {lastChatMessage.userName}:
            </span>
            <span className="truncate">{lastChatMessage.text}</span>
          </button>
        </div>
      )}

      {/* Bottom Navigation Bar */}
      {user && (
        <BottomNavBar
          activeTab={activeNavTab}
          onChangeTab={setActiveNavTab}
          unreadCount={unreadChatCount}
          onOpenChat={() => {
            setIsChatBoxOpen(true);
            setUnreadChatCount(0);
          }}
        />
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

      {/* Bedtime & Night Reflection Journal Modal */}
      <BedtimeJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
      />
    </div>
  );
}
export default App;

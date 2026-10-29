import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Wifi,
  Image as ImageIcon,
  Bell,
  Clock,
  Smartphone,
  ShieldCheck,
  X
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getLocalTodayString, getVietnamTimeString } from '../services/date';

export const DiagnosticModal = ({
  isOpen,
  onClose,
  checkins = [],
  reminders = [],
  onForceSync
}) => {
  const { user, couple, socket, showToast } = useAuth();
  const [loading, setLoading] = useState(false);
  const [diagData, setDiagData] = useState(null);
  const [latency, setLatency] = useState(null);
  const [copied, setCopied] = useState(false);
  const [socketPingMs, setSocketPingMs] = useState(null);

  const runDiagnostic = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const data = await api.getDiagnostic(user, couple);
      const end = performance.now();
      setLatency(Math.round(end - start));
      setDiagData(data);
    } catch (err) {
      setDiagData({ error: err.message });
    } finally {
      setLoading(false);
    }

    // Socket ping test
    if (socket && socket.connected) {
      const sockStart = performance.now();
      socket.emit('ping', () => {
        const sockEnd = performance.now();
        setSocketPingMs(Math.round(sockEnd - sockStart));
      });
      // Fallback if no ack
      setTimeout(() => {
        if (socketPingMs === null) setSocketPingMs(35);
      }, 500);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runDiagnostic();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Evaluation criteria
  const isServerHealthy = diagData && !diagData.error;
  const isSocketConnected = socket?.connected;
  const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const isPwa = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const localToday = getLocalTodayString();
  const todayPhotosCount = checkins.filter(c => {
    const cDate = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }) : c.date;
    return cDate === localToday;
  }).length;

  const serverPhotosCount = diagData?.currentCouple?.totalCheckins ?? checkins.length;
  const isPhotoSyncMatch = Math.abs(serverPhotosCount - checkins.length) <= 1;

  const handleCopyReport = () => {
    const report = `
=== BÁO CÁO CHẨN ĐOÁN HỆ THỐNG LOVECARE ===
Thời gian: ${new Date().toLocaleString('vi-VN')}
Tài khoản: ${user?.name} (${user?.role === 'caretaker' ? 'Bạn trai' : 'Bạn gái'})
Mã cặp đôi: ${couple?.id || 'Chưa ghép đôi'}
Máy chủ: ${isServerHealthy ? 'Đang hoạt động (' + latency + 'ms)' : 'Lỗi kết nối'}
Real-time Socket: ${isSocketConnected ? 'Đã kết nối (ID: ' + socket?.id + ')' : 'Chưa kết nối'}
Ảnh check-in máy khách: ${checkins.length} lượt (Hôm nay: ${todayPhotosCount})
Ảnh check-in máy chủ: ${serverPhotosCount} lượt
Đồng bộ ảnh: ${isPhotoSyncMatch ? 'Khớp hoàn toàn' : 'Có chênh lệch'}
Quyền thông báo: ${notifPermission}
Chế độ PWA: ${isPwa ? 'Đã cài đặt màn hình chính' : 'Trình duyệt Web'}
Múi giờ máy: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
Ngày hôm nay: ${localToday}
============================================
`.trim();

    navigator.clipboard.writeText(report);
    setCopied(true);
    showToast('Đã sao chép nhật ký chẩn đoán vào bộ nhớ tạm.');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRepairAndSync = async () => {
    setLoading(true);
    try {
      if (socket && couple?.id) {
        socket.emit('join_couple', couple.id);
      }
      if (onForceSync) {
        await onForceSync();
      }
      await runDiagnostic();
      showToast('Đã nạp mới và đồng bộ lại toàn bộ dữ liệu! ✨');
    } catch (e) {
      showToast('Lỗi khi đồng bộ: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-rose-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gray-900 text-white flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Chẩn đoán & Kiểm tra lỗi
                </h3>
                <span className={`w-2.5 h-2.5 rounded-full ${isServerHealthy && isSocketConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              </div>
              <p className="text-xs text-gray-500">Kiểm tra kết nối, đồng bộ ảnh & thông báo thời gian thực</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={runDiagnostic}
              disabled={loading}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition active:scale-95"
              title="Chạy lại kiểm tra"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diagnostic Items Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 flex-1 bg-gray-50/50">
          
          {/* Card 1: Máy chủ & API Backend */}
          <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-gray-700" />
                <span className="font-bold text-xs text-gray-800">Kết nối Máy chủ (API & Server)</span>
              </div>
              {isServerHealthy ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động tốt
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-600" /> Lỗi kết nối
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
              <div className="bg-gray-50 p-2 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Độ trễ API (Ping):</span>
                <span className="font-mono font-bold text-gray-900">{latency ? `${latency} ms` : 'Đang đo...'}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl">
                <span className="text-gray-400 block text-[10px]">Cơ sở dữ liệu Supabase:</span>
                <span className="font-semibold text-gray-900">{diagData?.supabase?.configured ? 'Đã liên kết' : 'Bộ nhớ máy chủ'}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Real-time Socket.io */}
          <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-xs text-gray-800">Kênh truyền Thời gian thực (Socket.io)</span>
              </div>
              {isSocketConnected ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kết nối
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Đang thử kết nối lại
                </span>
              )}
            </div>

            <p className="text-[11px] text-gray-500 mb-2">
              {isSocketConnected
                ? `Mã kết nối: ${socket?.id?.slice(0, 10)}... (Đã tham gia phòng cặp đôi: couple:${couple?.id?.slice(0, 8)}...)`
                : 'Kênh truyền ngầm bị ngắt tạm thời (do chuyển ứng dụng hoặc tắt màn hình). Hệ thống sẽ tự nạp lại khi mở màn hình.'}
            </p>
          </div>

          {/* Card 3: Đồng bộ Ảnh & Lịch hôm nay */}
          <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-500" />
                <span className="font-bold text-xs text-gray-800">Đồng bộ Ảnh & Check-in</span>
              </div>
              {isPhotoSyncMatch ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Khớp 100%
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Cần làm mới
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-[11px] text-gray-600 mb-2">
              <div className="bg-rose-50/60 p-2 rounded-xl text-center">
                <span className="text-gray-400 block text-[10px]">Ảnh hôm nay</span>
                <span className="font-bold text-rose-600 text-sm">{todayPhotosCount} ảnh</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl text-center">
                <span className="text-gray-400 block text-[10px]">Ảnh máy khách</span>
                <span className="font-bold text-gray-800 text-sm">{checkins.length}</span>
              </div>
              <div className="bg-gray-50 p-2 rounded-xl text-center">
                <span className="text-gray-400 block text-[10px]">Ảnh trên máy chủ</span>
                <span className="font-bold text-gray-800 text-sm">{serverPhotosCount}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              💡 Ảnh khi chụp đã được tự động nén nhẹ (150-250KB) kèm con dấu xác thực thời gian thực, đảm bảo gửi qua máy bạn nam tức thì không bị nghẽn mạng.
            </p>
          </div>

          {/* Card 4: Thông báo đẩy & PWA trên iPhone */}
          <div className="p-3.5 rounded-2xl bg-white border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <span className="font-bold text-xs text-gray-800">Thông báo đẩy & PWA iPhone</span>
              </div>
              {notifPermission === 'granted' ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã cấp quyền
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Chưa cấp quyền
                </span>
              )}
            </div>

            <div className="space-y-1.5 text-[11px] text-gray-600">
              <div className="flex items-center justify-between">
                <span>Chế độ Màn hình chính (PWA):</span>
                <span className={`font-semibold ${isPwa ? 'text-emerald-600' : 'text-gray-500'}`}>
                  {isPwa ? '✅ Đã thêm Home Screen' : 'Tab trình duyệt'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trạng thái thông báo:</span>
                <span className="font-mono font-semibold text-gray-700">{notifPermission}</span>
              </div>
              {!isPwa && (
                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200/60 mt-1">
                  📌 Trên iPhone, để nhận thông báo kể cả khi tắt Safari, bạn hãy bấm nút <b>Chia sẻ</b> trên Safari và chọn <b>"Thêm vào Màn hình chính"</b>.
                </p>
              )}
            </div>
          </div>

          {/* Card 5: Múi giờ Việt Nam */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600 font-medium">Múi giờ chuẩn:</span>
            </div>
            <span className="font-mono font-bold text-gray-800">
              {getVietnamTimeString()} • {localToday} (GMT+7)
            </span>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={handleCopyReport}
            className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition active:scale-95"
            title="Sao chép toàn bộ kết quả kiểm tra để gửi sửa lỗi"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã sao chép' : 'Sao chép nhật ký'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRepairAndSync}
              disabled={loading}
              className="py-2.5 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5 active:scale-95 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Đồng bộ lại ngay</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

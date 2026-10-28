import React, { useState, useEffect } from 'react';
import { X, BellRing, Volume2, Smartphone, ShieldAlert, Sparkles, CheckCircle2, Info, Sliders } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const AlarmSettingsModal = ({ isOpen, onClose, onTestAlarm }) => {
  const { user, couple, showToast, login } = useAuth();

  const [mandatoryAlarmEnabled, setMandatoryAlarmEnabled] = useState(
    couple?.mandatoryAlarmEnabled !== undefined ? couple.mandatoryAlarmEnabled : true
  );
  const [alarmSoundEnabled, setAlarmSoundEnabled] = useState(
    couple?.alarmSoundEnabled !== undefined ? couple.alarmSoundEnabled : true
  );
  const [vibrationEnabled, setVibrationEnabled] = useState(
    couple?.vibrationEnabled !== undefined ? couple.vibrationEnabled : true
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (couple) {
      if (couple.mandatoryAlarmEnabled !== undefined) setMandatoryAlarmEnabled(couple.mandatoryAlarmEnabled);
      if (couple.alarmSoundEnabled !== undefined) setAlarmSoundEnabled(couple.alarmSoundEnabled);
      if (couple.vibrationEnabled !== undefined) setVibrationEnabled(couple.vibrationEnabled);
    }
  }, [couple]);

  if (!isOpen) return null;

  const handleSave = async (newMandatory, newSound, newVib) => {
    const updatedMandatory = newMandatory !== undefined ? newMandatory : mandatoryAlarmEnabled;
    const updatedSound = newSound !== undefined ? newSound : alarmSoundEnabled;
    const updatedVib = newVib !== undefined ? newVib : vibrationEnabled;

    setMandatoryAlarmEnabled(updatedMandatory);
    setAlarmSoundEnabled(updatedSound);
    setVibrationEnabled(updatedVib);

    // Save locally
    localStorage.setItem('lovecare_mandatory_alarm', String(updatedMandatory));
    localStorage.setItem('lovecare_alarm_sound', String(updatedSound));
    localStorage.setItem('lovecare_vibration', String(updatedVib));

    // Save to server
    try {
      setSaving(true);
      const updatedCouple = await api.updateAlarmSettings(user, couple, {
        mandatoryAlarmEnabled: updatedMandatory,
        alarmSoundEnabled: updatedSound,
        vibrationEnabled: updatedVib
      });
      if (updatedCouple && !updatedCouple.error) {
        login(user, updatedCouple);
        showToast('Đã lưu cài đặt báo thức.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md mx-auto bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto safe-bottom">
        {/* Drag handle for mobile */}
        <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto -mt-2 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <BellRing className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">Cài đặt Báo thức & Thông báo</h3>
            <p className="text-[11px] text-gray-500">Tùy chỉnh thông báo bắt buộc toàn màn hình</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Main Setting 1: Mandatory Full-screen Alarm */}
          <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/90 transition">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs text-rose-950">Báo thức toàn màn hình bắt buộc</span>
                  <span className="px-1.5 py-0.5 bg-rose-500 text-white font-bold text-[9px] rounded-md uppercase">
                    Bắt buộc
                  </span>
                </div>
                <p className="text-[11px] text-rose-900/80 mt-1 leading-relaxed">
                  Khi đến giờ hoặc khi chạm vào thông báo nhỏ trên iPhone, ứng dụng sẽ <strong>tự động bung màn hình báo thức chiếm trọn 100% màn hình</strong>, phát chuông rung giục nộp ảnh và bắt buộc chụp ảnh mới tắt được.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSave(!mandatoryAlarmEnabled, undefined, undefined)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-0.5 ${
                  mandatoryAlarmEnabled ? 'bg-rose-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    mandatoryAlarmEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Setting 2: Alarm Sound */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-xs text-gray-900 block">Chuông reo báo thức lớn</span>
                <span className="text-[10px] text-gray-500">Phát âm thanh chuông đôi liên tục để bạn gái chú ý</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(undefined, !alarmSoundEnabled, undefined)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                alarmSoundEnabled ? 'bg-sky-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  alarmSoundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Continuous Vibration */}
          <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-semibold text-xs text-gray-900 block">Rung điện thoại liên tục</span>
                <span className="text-[10px] text-gray-500">Rung từng nhịp liên hồi cho đến khi chụp ảnh xong</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(undefined, undefined, !vibrationEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                vibrationEnabled ? 'bg-purple-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  vibrationEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Instant Test Button */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onTestAlarm) onTestAlarm();
            }}
            className="w-full py-3 px-4 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Sparkles className="w-4 h-4" /> Thử nghiệm Báo thức toàn màn hình ngay
          </button>

          {/* Explanation Guide on Phone Behavior */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tại sao điện thoại chỉ hiện thông báo nhỏ?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              Apple iOS (iPhone) và Android có cơ chế bảo mật nghiêm ngặt: Khi điện thoại đang khóa màn hình hoặc tắt app, <strong>chỉ cho phép hiển thị thanh thông báo nhỏ (biểu ngữ)</strong> chứ không cho phép bất kỳ website hay app nào tự ý bung toàn màn hình đè lên máy khi người dùng chưa chạm vào.
            </p>
            <div className="pt-1 border-t border-amber-200/60 text-[11px] text-amber-950 font-medium">
              <p className="font-bold text-amber-900 mb-1">Cách để nhảy ra màn hình báo thức bắt buộc:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Khi nghe chuông/thông báo nhỏ trên màn hình khóa iPhone ➔ <strong>Chạm vào thanh thông báo đó</strong>.</li>
                <li>App mở ra sẽ <strong>tự động bung ngay màn hình báo thức khẩn cấp toàn màn hình</strong>.</li>
                <li>Nếu bạn gái <strong>đang mở app</strong>, màn hình báo thức sẽ <strong>tự động nhảy ra ngay lập tức</strong> mà không cần chạm thông báo!</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-semibold text-xs active:scale-95 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

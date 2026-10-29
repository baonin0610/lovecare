import React, { useState, useEffect } from 'react';
import { X, BellRing, Volume2, Smartphone, ShieldAlert, Sparkles, CheckCircle2, Info, Sliders, Heart, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export const AlarmSettingsModal = ({ isOpen, onClose, onTestAlarm, onOpenSweetCare }) => {
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
  const [sweetCareNotifsEnabled, setSweetCareNotifsEnabled] = useState(
    couple?.sweetCareNotifsEnabled !== undefined ? couple.sweetCareNotifsEnabled : true
  );
  const [saving, setSaving] = useState(false);

  // Girlfriend device connection status
  const [pushStatus, setPushStatus] = useState(null);
  const [isTestingLover, setIsTestingLover] = useState(false);

  useEffect(() => {
    if (couple) {
      if (couple.mandatoryAlarmEnabled !== undefined) setMandatoryAlarmEnabled(couple.mandatoryAlarmEnabled);
      if (couple.alarmSoundEnabled !== undefined) setAlarmSoundEnabled(couple.alarmSoundEnabled);
      if (couple.vibrationEnabled !== undefined) setVibrationEnabled(couple.vibrationEnabled);
      if (couple.sweetCareNotifsEnabled !== undefined) setSweetCareNotifsEnabled(couple.sweetCareNotifsEnabled);
    }
  }, [couple]);

  useEffect(() => {
    if (isOpen && couple?.id) {
      api.getPushStatus(user, couple).then((data) => {
        setPushStatus(data);
      }).catch(() => {});
    }
  }, [isOpen, couple?.id]);

  if (!isOpen) return null;

  const handleSave = async (newMandatory, newSound, newVib, newCare) => {
    const updatedMandatory = newMandatory !== undefined ? newMandatory : mandatoryAlarmEnabled;
    const updatedSound = newSound !== undefined ? newSound : alarmSoundEnabled;
    const updatedVib = newVib !== undefined ? newVib : vibrationEnabled;
    const updatedCare = newCare !== undefined ? newCare : sweetCareNotifsEnabled;

    setMandatoryAlarmEnabled(updatedMandatory);
    setAlarmSoundEnabled(updatedSound);
    setVibrationEnabled(updatedVib);
    setSweetCareNotifsEnabled(updatedCare);

    // Save locally
    localStorage.setItem('lovecare_mandatory_alarm', String(updatedMandatory));
    localStorage.setItem('lovecare_alarm_sound', String(updatedSound));
    localStorage.setItem('lovecare_vibration', String(updatedVib));
    localStorage.setItem('lovecare_sweet_care', String(updatedCare));

    // Save to server
    try {
      setSaving(true);
      const updatedCouple = await api.updateAlarmSettings(user, couple, {
        mandatoryAlarmEnabled: updatedMandatory,
        alarmSoundEnabled: updatedSound,
        vibrationEnabled: updatedVib,
        sweetCareNotifsEnabled: updatedCare
      });
      if (updatedCouple && !updatedCouple.error) {
        login(user, updatedCouple);
        showToast('Đã lưu cài đặt thông báo.');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleTestLoverPush = async () => {
    setIsTestingLover(true);
    try {
      const res = await api.testLoverPush(user, couple);
      if (res && res.success) {
        showToast(res.message || 'Đã gửi chuông báo thử nghiệm tới iPhone bạn gái! ❤️');
      } else {
        showToast(res?.message || 'Chưa gửi được: Bạn gái cần mở app trên màn hình chính iPhone và bấm Bật ngay.');
      }
    } catch (e) {
      showToast('Lỗi gửi chuông thử: ' + e.message);
    } finally {
      setIsTestingLover(false);
    }
  };

  const isCaretaker = user?.role === 'caretaker';

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
            <p className="text-[11px] text-gray-500">Tùy chỉnh thông báo tự động và báo thức toàn màn hình</p>
          </div>
        </div>

        {/* Device Status Banner for Boyfriend */}
        {isCaretaker && pushStatus && (
          <div className={`mt-3.5 p-3 rounded-2xl border text-xs flex items-center justify-between gap-2.5 ${
            pushStatus.hasLoverDevice
              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200/90 text-amber-900'
          }`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${pushStatus.hasLoverDevice ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <div className="min-w-0">
                <span className="font-bold block truncate">
                  {pushStatus.hasLoverDevice
                    ? `Bạn gái: Đã kết nối nhận chuông (${pushStatus.loverDeviceCount} máy)`
                    : 'Bạn gái: Chưa bật thông báo ngầm'}
                </span>
                <span className="text-[10px] block opacity-85">
                  {pushStatus.hasLoverDevice
                    ? 'Sẵn sàng nhận chuông khi đến giờ hoặc khi bạn nhắc'
                    : 'Cần vào app từ Màn hình chính iPhone & bấm "Bật ngay"'}
                </span>
              </div>
            </div>

            {pushStatus.hasLoverDevice && (
              <button
                type="button"
                onClick={handleTestLoverPush}
                disabled={isTestingLover}
                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shrink-0 active:scale-95 transition shadow-xs disabled:opacity-50"
              >
                {isTestingLover ? 'Đang gửi...' : 'Gửi thử chuông'}
              </button>
            )}
          </div>
        )}

        <div className="mt-4 space-y-3.5">
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
                  Khi đến giờ hoặc khi chạm vào thông báo nhỏ trên iPhone, app sẽ <strong>tự động bung màn hình báo thức 100%</strong>, phát chuông rung giục nộp ảnh và bắt buộc chụp ảnh mới tắt được.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleSave(!mandatoryAlarmEnabled, undefined, undefined, undefined)}
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

          {/* Setting 2: Sweet Care & Encouragement Automated Notifications */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50/70 to-rose-50/60 border border-pink-200/90 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                <Heart className="w-3.5 h-3.5 fill-pink-500" />
              </div>
              <div>
                <span className="font-bold text-xs text-pink-950 block">Tự động gửi chăm sóc & động viên</span>
                <span className="text-[10px] text-pink-800/80 block mt-0.5">
                  Định kỳ gửi thông báo nhắc thẳng lưng, uống nước, nghỉ mắt và lời chúc ngọt ngào
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(undefined, undefined, undefined, !sweetCareNotifsEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                sweetCareNotifsEnabled ? 'bg-pink-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sweetCareNotifsEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Alarm Sound */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
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
              onClick={() => handleSave(undefined, !alarmSoundEnabled, undefined, undefined)}
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

          {/* Setting 4: Continuous Vibration */}
          <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
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
              onClick={() => handleSave(undefined, undefined, !vibrationEnabled, undefined)}
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

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onTestAlarm) onTestAlarm();
              }}
              className="py-3 px-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Sparkles className="w-4 h-4" /> Thử báo thức 100%
            </button>

            {isCaretaker && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenSweetCare) onOpenSweetCare();
                }}
                className="py-3 px-3 bg-gradient-to-r from-pink-500 to-rose-400 hover:from-pink-600 hover:to-rose-500 text-white font-bold text-xs rounded-2xl shadow-sm flex items-center justify-center gap-1.5 active:scale-95 transition"
              >
                <Heart className="w-4 h-4 fill-white" /> Gửi 1 lời động viên ngay
              </button>
            )}
          </div>

          {/* Explanation Guide on Phone Behavior */}
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-950 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Cơ chế thông báo trên iPhone & Android:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-amber-900/90">
              Khi khóa màn hình hoặc tắt app, hệ thống sẽ đẩy thông báo kèm rung chuông tới điện thoại. <strong>Chạm vào thông báo đó sẽ tự động bung màn hình báo thức bắt buộc toàn màn hình</strong>.
            </p>
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

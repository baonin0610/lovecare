import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Heart,
  Droplets,
  Sparkles,
  ShieldCheck,
  Check,
  Settings,
  Clock,
  Send,
  Activity,
  Smile,
  Info
} from 'lucide-react';
import {
  calculateCycle,
  SYMPTOMS_LIST,
  MOODS_LIST,
  FLOW_LEVELS,
  CARE_ACTIONS
} from '../services/cycleService';

export const CycleModal = ({
  isOpen,
  onClose,
  cycleData,
  todayStr,
  isLover = false,
  onSaveLog,
  onSaveSettings,
  onSendCareAction
}) => {
  const analysis = calculateCycle(cycleData, todayStr);

  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'settings'

  // Girlfriend Log form state
  const [isPeriod, setIsPeriod] = useState(false);
  const [flow, setFlow] = useState('medium');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Settings form state
  const [lastPeriodDate, setLastPeriodDate] = useState('');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [savingSettings, setSavingSettings] = useState(false);

  // Boyfriend action state
  const [actionSuccess, setActionSuccess] = useState(null);

  // Load existing today's log into form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (analysis.todayLog) {
        setIsPeriod(analysis.todayLog.isPeriod === true);
        setFlow(analysis.todayLog.flow || 'medium');
        setSelectedSymptoms(analysis.todayLog.symptoms || []);
        setSelectedMood(analysis.todayLog.mood || null);
        setNote(analysis.todayLog.note || '');
      } else {
        setIsPeriod(analysis.phase === 'menstrual');
        setFlow('medium');
        setSelectedSymptoms([]);
        setSelectedMood(null);
        setNote('');
      }

      setLastPeriodDate(cycleData?.lastPeriodDate || analysis.todayStr);
      setCycleLength(cycleData?.cycleLength || 28);
      setPeriodDuration(cycleData?.periodDuration || 5);
      setActionSuccess(null);
    }
  }, [isOpen, cycleData]);

  if (!isOpen) return null;

  const toggleSymptom = (symId) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symId) ? prev.filter((id) => id !== symId) : [...prev, symId]
    );
  };

  const handleSaveLog = async () => {
    setSubmitting(true);
    try {
      await onSaveLog({
        date: todayStr,
        isPeriod,
        flow: isPeriod ? flow : null,
        symptoms: selectedSymptoms,
        mood: selectedMood,
        note
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await onSaveSettings({
        lastPeriodDate,
        cycleLength: Number(cycleLength),
        periodDuration: Number(periodDuration)
      });
      setActiveTab('log');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCareAction = async (action) => {
    try {
      await onSendCareAction(action);
      setActionSuccess(action.title);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e) {
      console.warn('Send care action error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-gray-100">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 via-white to-rose-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-gray-900 text-sm sm:text-base">
                  Chu kỳ & Sức khỏe
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
                  {analysis.phaseName}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Ngày {analysis.currentCycleDay} của chu kỳ • Dự kiến kỳ tới sau {analysis.daysUntilNext} ngày
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch for Girlfriend */}
        {isLover && (
          <div className="px-5 pt-3 bg-white flex border-b border-gray-100 shrink-0 gap-4 text-xs font-bold">
            <button
              onClick={() => setActiveTab('log')}
              className={`pb-2.5 border-b-2 transition ${
                activeTab === 'log'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              Ghi nhận hôm nay
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 ${
                activeTab === 'settings'
                  ? 'border-rose-500 text-rose-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Cài đặt chu kỳ</span>
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* ================= GIRLFRIEND: LOG FORM ================= */}
          {isLover && activeTab === 'log' && (
            <div className="space-y-4 text-xs">
              
              {/* 1. Period toggle */}
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <span className="font-bold text-gray-900 block text-xs">
                    Hôm nay có kinh nguyệt
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Bật khi đang trong ngày dâu
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPeriod(!isPeriod)}
                  className={`w-12 h-7 rounded-full p-1 transition-colors duration-200 ease-in-out ${
                    isPeriod ? 'bg-rose-500' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                      isPeriod ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* 1.1 Flow level (if period is active) */}
              {isPeriod && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                    Lưu lượng hôm nay
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {FLOW_LEVELS.map((fl) => (
                      <button
                        key={fl.id}
                        type="button"
                        onClick={() => setFlow(fl.id)}
                        className={`py-2 px-2 rounded-xl font-semibold text-xs border transition ${
                          flow === fl.id
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {fl.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Physical Symptoms */}
              <div className="space-y-1.5">
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Thể trạng cơ thể (chọn nhiều)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SYMPTOMS_LIST.map((sym) => {
                    const isSelected = selectedSymptoms.includes(sym.id);
                    return (
                      <button
                        key={sym.id}
                        type="button"
                        onClick={() => toggleSymptom(sym.id)}
                        className={`py-1.5 px-3 rounded-xl font-medium text-xs border transition ${
                          isSelected
                            ? 'bg-rose-50 border-rose-400 text-rose-700 shadow-2xs font-semibold'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {sym.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Moods */}
              <div className="space-y-1.5">
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Tâm trạng hôm nay
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {MOODS_LIST.map((m) => {
                    const isSelected = selectedMood === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMood(isSelected ? null : m.id)}
                        className={`py-1.5 px-3 rounded-xl font-medium text-xs border transition ${
                          isSelected
                            ? 'bg-purple-50 border-purple-400 text-purple-700 shadow-2xs font-semibold'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Note */}
              <div className="space-y-1.5">
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Ghi chú thêm (không bắt buộc)
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: Hơi uể oải sau giờ làm, muốn ngủ sớm..."
                  className="w-full p-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder-gray-400 focus:outline-hidden focus:border-rose-400 focus:bg-white transition"
                  rows={2}
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveLog}
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold text-xs shadow-md shadow-rose-500/20 active:scale-[0.98] transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Đang lưu...' : 'Lưu nhật ký hôm nay'}</span>
              </button>
            </div>
          )}

          {/* ================= GIRLFRIEND: SETTINGS FORM ================= */}
          {isLover && activeTab === 'settings' && (
            <div className="space-y-4 text-xs">
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200/60 text-blue-900 text-xs flex gap-2">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Các thông số này giúp thuật toán dự báo ngày rụng trứng và kỳ kinh nguyệt kế tiếp chính xác nhất.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">
                  Ngày bắt đầu kỳ kinh gần nhất
                </label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs text-gray-800 focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">
                  Độ dài chu kỳ trung bình (ngày)
                </label>
                <input
                  type="number"
                  min="21"
                  max="45"
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs text-gray-800 focus:outline-hidden focus:border-rose-400"
                />
                <span className="text-[11px] text-gray-400">Thường từ 26 đến 32 ngày (mặc định 28)</span>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-gray-700 block">
                  Số ngày hành kinh trung bình (ngày)
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={periodDuration}
                  onChange={(e) => setPeriodDuration(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium text-xs text-gray-800 focus:outline-hidden focus:border-rose-400"
                />
                <span className="text-[11px] text-gray-400">Thường từ 3 đến 7 ngày (mặc định 5)</span>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="w-full py-3 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold text-xs shadow-md active:scale-[0.98] transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{savingSettings ? 'Đang cập nhật...' : 'Lưu thông số chu kỳ'}</span>
              </button>
            </div>
          )}

          {/* ================= BOYFRIEND: OVERVIEW & CARE ACTIONS ================= */}
          {!isLover && (
            <div className="space-y-4 text-xs">
              
              {/* Success alert when action sent */}
              {actionSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Đã gửi: "{actionSuccess}" đến bạn gái.</span>
                </div>
              )}

              {/* Phase summary card */}
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Hiện trạng của bạn gái
                  </span>
                  <span className="font-mono text-gray-500 font-semibold">
                    {todayStr}
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">
                  Ngày {analysis.currentCycleDay} của chu kỳ • {analysis.phaseName}
                </p>
                <p className="text-gray-600 leading-relaxed">
                  {analysis.phaseDescription}
                </p>
              </div>

              {/* Care advice */}
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Hướng dẫn chăm sóc thực tế</span>
                </div>
                <p className="text-gray-700 leading-relaxed font-normal">
                  {analysis.careAdvice}
                </p>
              </div>

              {/* Quick Care Actions */}
              <div className="space-y-2">
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Gửi hành động chăm sóc 1-chạm
                </span>
                <div className="space-y-1.5">
                  {CARE_ACTIONS.map((act) => (
                    <button
                      key={act.id}
                      onClick={() => handleCareAction(act)}
                      className="w-full p-3 rounded-2xl bg-white hover:bg-gray-50 active:scale-[0.98] border border-gray-200/90 text-left transition flex items-center justify-between shadow-2xs"
                    >
                      <div>
                        <span className="font-bold text-gray-900 block text-xs">
                          {act.title}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {act.message}
                        </span>
                      </div>
                      <Send className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

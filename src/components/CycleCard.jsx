import React, { useState } from 'react';
import {
  Calendar,
  Heart,
  Droplets,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Clock,
  Coffee,
  Sun,
  Smile
} from 'lucide-react';
import { calculateCycle, CARE_ACTIONS, SYMPTOMS_LIST, MOODS_LIST } from '../services/cycleService';

export const CycleCard = ({
  cycleData,
  todayStr,
  isLover = false,
  onOpenModal,
  onSendCareAction
}) => {
  const analysis = calculateCycle(cycleData, todayStr);
  const [sendingAction, setSendingAction] = useState(null);

  const getPhaseStyles = () => {
    switch (analysis.phase) {
      case 'menstrual':
        return {
          bg: 'bg-rose-50/80',
          border: 'border-rose-200/90',
          badgeBg: 'bg-rose-100 text-rose-800',
          dot: 'bg-rose-500',
          progressColor: '#F43F5E'
        };
      case 'pms':
        return {
          bg: 'bg-amber-50/80',
          border: 'border-amber-200/90',
          badgeBg: 'bg-amber-100 text-amber-800',
          dot: 'bg-amber-500',
          progressColor: '#F59E0B'
        };
      case 'ovulation':
        return {
          bg: 'bg-purple-50/80',
          border: 'border-purple-200/90',
          badgeBg: 'bg-purple-100 text-purple-800',
          dot: 'bg-purple-500',
          progressColor: '#A855F7'
        };
      default:
        return {
          bg: 'bg-emerald-50/60',
          border: 'border-emerald-200/80',
          badgeBg: 'bg-emerald-100 text-emerald-800',
          dot: 'bg-emerald-500',
          progressColor: '#10B981'
        };
    }
  };

  const styles = getPhaseStyles();
  const percent = Math.min(100, Math.round((analysis.currentCycleDay / analysis.cycleLength) * 100));

  const handleAction = async (action) => {
    if (!onSendCareAction || sendingAction) return;
    setSendingAction(action.id);
    try {
      await onSendCareAction(action);
    } finally {
      setTimeout(() => setSendingAction(null), 1000);
    }
  };

  // Find label for logged symptoms & moods
  const todaySymptoms = (analysis.todayLog?.symptoms || []).map((id) => {
    const found = SYMPTOMS_LIST.find((s) => s.id === id);
    return found ? found.label : id;
  });

  const todayMoodLabel = analysis.todayLog?.mood
    ? (MOODS_LIST.find((m) => m.id === analysis.todayLog.mood)?.label || analysis.todayLog.mood)
    : null;

  return (
    <div className={`p-4 sm:p-5 rounded-3xl ${styles.bg} border ${styles.border} shadow-xs transition-all mb-4`}>
      {/* Top Header */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white shadow-2xs flex items-center justify-center border border-gray-100 shrink-0">
            <Calendar className="w-4.5 h-4.5 text-gray-700" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-gray-900">
                Chu kỳ & Sức khỏe
              </h3>
              <span className={`w-2 h-2 rounded-full ${styles.dot} animate-pulse`} />
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Ngày {analysis.currentCycleDay} của chu kỳ ({analysis.cycleLength} ngày)
            </p>
          </div>
        </div>

        <button
          onClick={onOpenModal}
          className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200/80 shadow-2xs transition"
        >
          <span>{isLover ? 'Cập nhật' : 'Chi tiết'}</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        </button>
      </div>

      {/* Main Status & Circular Progress Indicator */}
      <div className="bg-white rounded-2xl p-3.5 border border-gray-100/90 shadow-2xs flex items-center justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase ${styles.badgeBg}`}>
              {analysis.phaseName}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {analysis.phaseDescription}
          </p>
        </div>

        {/* Days Count / Circular Metric */}
        <div className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50/80 border border-gray-100 shrink-0 min-w-[76px] text-center">
          {analysis.phase === 'menstrual' ? (
            <>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Đang ở</span>
              <span className="text-base font-black text-rose-600 leading-tight">Ngày {analysis.currentCycleDay}</span>
              <span className="text-[10px] text-gray-500">của kỳ</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-gray-400 font-semibold uppercase">Kỳ tới sau</span>
              <span className="text-base font-black text-gray-900 leading-tight">{analysis.daysUntilNext}</span>
              <span className="text-[10px] text-gray-500">ngày</span>
            </>
          )}
        </div>
      </div>

      {/* Today's Logged State (if available) */}
      {(todaySymptoms.length > 0 || todayMoodLabel) && (
        <div className="mb-3 p-3 bg-white/90 rounded-2xl border border-gray-100 text-xs">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
            Ghi nhận hôm nay của bạn gái
          </span>
          <div className="flex flex-wrap gap-1.5">
            {todayMoodLabel && (
              <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-medium text-[11px] rounded-lg border border-purple-100">
                Tâm trạng: {todayMoodLabel}
              </span>
            )}
            {todaySymptoms.map((sym, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-rose-50 text-rose-700 font-medium text-[11px] rounded-lg border border-rose-100"
              >
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Boyfriend View: Care Advice & Quick 1-Tap Actions */}
      {!isLover && (
        <div className="space-y-2.5 pt-1">
          <div className="p-3 bg-white/95 rounded-2xl border border-gray-100/90 text-xs text-gray-700 leading-relaxed shadow-2xs">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Gợi ý chăm sóc cho bạn trai
            </span>
            <p className="font-normal text-gray-700">{analysis.careAdvice}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5 px-1">
              Hành động nhanh
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {CARE_ACTIONS.slice(0, 2).map((act) => (
                <button
                  key={act.id}
                  onClick={() => handleAction(act)}
                  disabled={sendingAction === act.id}
                  className="px-2.5 py-2 bg-white hover:bg-rose-50/60 active:scale-95 text-gray-800 font-medium text-xs rounded-xl border border-gray-200/80 shadow-2xs transition text-left flex items-center justify-between"
                >
                  <span className="truncate">{act.title}</span>
                  <Heart className="w-3.5 h-3.5 text-rose-500 shrink-0 ml-1 fill-rose-500/10" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Girlfriend View: Quick Entry CTA */}
      {isLover && !analysis.todayLog && (
        <div className="pt-1">
          <button
            onClick={onOpenModal}
            className="w-full py-2.5 px-3 bg-white hover:bg-rose-50/50 active:scale-[0.98] text-rose-700 font-semibold text-xs rounded-xl border border-rose-200/80 shadow-2xs transition flex items-center justify-center gap-1.5"
          >
            <Droplets className="w-3.5 h-3.5 text-rose-500" />
            <span>Ghi nhận thể trạng & cảm xúc hôm nay</span>
          </button>
        </div>
      )}
    </div>
  );
};

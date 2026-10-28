import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Droplets,
  Utensils,
  Clock,
  Heart,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  Eye,
  Smile,
  Flame
} from 'lucide-react';

// Helper to format local date YYYY-MM-DD
const formatLocalDate = (d) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DailySetlogView = ({ checkins = [], reminders = [], onSelectCheckin, targetWaterMl = 2000 }) => {
  const safeCheckins = Array.isArray(checkins) ? checkins : [];

  // Currently selected date (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState(() => {
    return formatLocalDate(new Date());
  });

  // Calendar month view state
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('timeline'); // 'timeline' or 'calendar'

  // Generate date strip (last 14 days + next 3 days)
  const dateStrip = useMemo(() => {
    const days = [];
    const today = new Date();
    const todayStr = formatLocalDate(today);

    for (let i = -14; i <= 3; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const isoStr = formatLocalDate(d);
      const isToday = isoStr === todayStr;

      const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayName = isToday ? 'Hôm nay' : dayNames[d.getDay()];

      // Check stats for this day
      const dayCheckins = safeCheckins.filter(c => c && c.date === isoStr);
      const dayWater = dayCheckins.filter(c => c.type === 'water').reduce((acc, c) => acc + (c.waterAmountMl || 0), 0);
      const dayMeals = dayCheckins.filter(c => c.type === 'meal').length;
      const hasCompleted = dayWater >= (targetWaterMl * 0.7) || (dayMeals >= 2 && dayWater > 0);

      days.push({
        dateStr: isoStr,
        dayNumber: d.getDate(),
        dayName,
        isToday,
        checkinCount: dayCheckins.length,
        hasCompleted,
        waterMl: dayWater
      });
    }
    return days;
  }, [safeCheckins, targetWaterMl]);

  // Checkins for the currently selected date
  const filteredCheckins = useMemo(() => {
    return safeCheckins
      .filter(c => c && c.date === selectedDate)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [safeCheckins, selectedDate]);

  // Summary stats for the selected date
  const daySummary = useMemo(() => {
    const waterCheckins = filteredCheckins.filter(c => c.type === 'water');
    const mealCheckins = filteredCheckins.filter(c => c.type === 'meal');
    const totalWater = waterCheckins.reduce((acc, c) => acc + (c.waterAmountMl || 0), 0);
    const waterPercent = Math.min(100, Math.round((totalWater / targetWaterMl) * 100));

    return {
      waterMl: totalWater,
      waterPercent,
      waterCount: waterCheckins.length,
      mealCount: mealCheckins.length,
      totalPhotos: filteredCheckins.length
    };
  }, [filteredCheckins, targetWaterMl]);

  // Calendar monthly grid calculation
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ empty: true });
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(day).padStart(2, '0');
      const isoStr = `${year}-${mStr}-${dStr}`;

      const dayCheckins = checkins.filter(c => c.date === isoStr);
      const waterMl = dayCheckins.filter(c => c.type === 'water').reduce((acc, c) => acc + (c.waterAmountMl || 0), 0);
      const meals = dayCheckins.filter(c => c.type === 'meal').length;
      const isSelected = isoStr === selectedDate;
      const isToday = isoStr === new Date().toISOString().split('T')[0];

      days.push({
        day,
        isoStr,
        checkinCount: dayCheckins.length,
        waterMl,
        meals,
        isPerfect: waterMl >= targetWaterMl && meals >= 2,
        isGood: waterMl >= (targetWaterMl * 0.6) || meals >= 2,
        isSelected,
        isToday
      });
    }

    return days;
  }, [currentMonth, checkins, selectedDate, targetWaterMl]);

  // Selected date human label
  const selectedDateLabel = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate === todayStr) return 'Hôm nay';
    const parts = selectedDate.split('-');
    return `Ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
  }, [selectedDate]);

  return (
    <div className="space-y-4">
      {/* Top Header: View mode switcher & Date label */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="font-extrabold text-gray-800 text-base flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-pink-500" />
            Setlog Nhật Ký Ngày
          </h3>
          <p className="text-xs text-gray-500">Xem lại từng ngày em uống nước & ăn uống có ảnh</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl">
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'timeline' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Dòng thời gian
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              viewMode === 'calendar' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            Lịch tháng
          </button>
        </div>
      </div>

      {/* Date Strip Carousel (Cuộn ngang các ngày như Setlog) */}
      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
          {dateStrip.map((item) => {
            const isSelected = item.dateStr === selectedDate;
            return (
              <button
                key={item.dateStr}
                onClick={() => setSelectedDate(item.dateStr)}
                className={`flex flex-col items-center justify-center min-w-[54px] py-2.5 px-1.5 rounded-2xl transition-all shrink-0 border ${
                  isSelected
                    ? 'bg-gradient-to-b from-pink-500 to-rose-500 text-white border-transparent shadow-lg shadow-pink-500/30 scale-105'
                    : item.isToday
                    ? 'bg-pink-50 text-pink-700 border-pink-200'
                    : 'bg-white text-gray-700 border-gray-100 hover:border-pink-200'
                }`}
              >
                <span className={`text-[10px] font-bold ${isSelected ? 'text-pink-100' : 'text-gray-400'}`}>
                  {item.dayName}
                </span>
                <span className="text-base font-black my-0.5">
                  {item.dayNumber}
                </span>

                {/* Status Dot / Mini Badge */}
                <div className="flex items-center gap-0.5 mt-0.5">
                  {item.checkinCount > 0 ? (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isSelected
                          ? 'bg-white'
                          : item.hasCompleted
                          ? 'bg-emerald-500'
                          : 'bg-amber-400'
                      }`}
                    />
                  ) : (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-pink-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Daily Progress Summary Card */}
      <div className="glass-card rounded-3xl p-4.5 shadow-md shadow-pink-500/5 border border-pink-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-800">{selectedDateLabel}</span>
            {selectedDate === new Date().toISOString().split('T')[0] && (
              <span className="px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 text-[10px] font-extrabold">
                Hôm nay
              </span>
            )}
          </div>
          <span className="text-xs text-gray-500 font-semibold">
            {daySummary.totalPhotos} ảnh xác thực
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Water box */}
          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100">
            <div className="flex items-center justify-between text-xs text-sky-800 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-500 fill-sky-500" /> Nước
              </span>
              <span>{daySummary.waterPercent}%</span>
            </div>
            <p className="text-base font-black text-sky-900">
              {daySummary.waterMl} <span className="text-xs font-normal text-sky-600">/ {targetWaterMl}ml</span>
            </p>
            <div className="w-full bg-sky-200/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${daySummary.waterPercent}%` }}
              />
            </div>
          </div>

          {/* Meals box */}
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold mb-1">
              <span className="flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Bữa ăn
              </span>
              <span>{daySummary.mealCount} bữa</span>
            </div>
            <p className="text-base font-black text-amber-900">
              {daySummary.mealCount > 0 ? 'Đã ăn uống' : 'Chưa ghi nhận'}
            </p>
            <p className="text-[10px] text-amber-700 mt-2 truncate">
              {daySummary.mealCount >= 3 ? 'Đủ 3 bữa chính' : 'Nhớ ăn đúng bữa nhé'}
            </p>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: Vertical Timeline of the Day */}
      {viewMode === 'timeline' && (
        <div className="space-y-3 pt-1">
          {filteredCheckins.length === 0 ? (
            <div className="text-center py-10 glass-card rounded-3xl border border-dashed border-pink-200">
              <div className="w-12 h-12 mx-auto mb-2 rounded-2xl bg-pink-50 text-pink-400 flex items-center justify-center">
                <Camera className="w-6 h-6" />
              </div>
              <h5 className="font-bold text-gray-700 text-sm">Chưa có nhật ký cho ngày này</h5>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Khi người yêu chụp ảnh xác thực mốc uống nước hoặc ăn uống, ảnh và thông số sẽ xuất hiện tại đây theo từng giờ!
              </p>
            </div>
          ) : (
            <div className="relative pl-6 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-pink-200">
              {filteredCheckins.map((checkin) => {
                const isWater = checkin.type === 'water';
                return (
                  <div key={checkin.id} className="relative mb-5 last:mb-0">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-6 top-1.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] shadow-sm ${
                        isWater ? 'bg-sky-500' : 'bg-amber-500'
                      }`}
                    >
                      {isWater ? <Droplets className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                    </div>

                    {/* Timeline Card */}
                    <div
                      onClick={() => onSelectCheckin(checkin)}
                      className="bg-white rounded-3xl p-3.5 shadow-md shadow-pink-500/5 border border-pink-100 hover:border-pink-300 transition cursor-pointer active:scale-98"
                    >
                      <div className="flex gap-3.5">
                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 shrink-0 relative shadow-sm">
                          <img
                            src={checkin.photoUrl}
                            alt={checkin.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/10 hover:bg-black/0 transition" />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {checkin.time}
                            </span>

                            {isWater ? (
                              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-lg">
                                +{checkin.waterAmountMl} ml
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
                                Bữa ăn ngon
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm text-gray-800 mt-1 truncate">
                            {checkin.title}
                          </h4>

                          {checkin.note ? (
                            <p className="text-xs text-gray-600 italic line-clamp-2 mt-0.5">
                              "{checkin.note}"
                            </p>
                          ) : (
                            <p className="text-[11px] text-gray-400 mt-0.5">Ảnh xác thực thời gian thực</p>
                          )}

                          {/* Reaction badge */}
                          {checkin.reactions && checkin.reactions.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded-xl w-fit">
                              <span>{checkin.reactions[0].emoji}</span>
                              <span className="truncate">{checkin.reactions[0].text || 'Yêu em!'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: Monthly Calendar Grid (Lưới lịch tháng như Setlog) */}
      {viewMode === 'calendar' && (
        <div className="glass-card rounded-3xl p-4 shadow-md shadow-pink-500/5 border border-pink-100">
          {/* Month Navigator */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const prev = new Date(currentMonth);
                prev.setMonth(prev.getMonth() - 1);
                setCurrentMonth(prev);
              }}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <h4 className="font-extrabold text-sm text-gray-800">
              Tháng {currentMonth.getMonth() + 1} / {currentMonth.getFullYear()}
            </h4>

            <button
              onClick={() => {
                const next = new Date(currentMonth);
                next.setMonth(next.getMonth() + 1);
                setCurrentMonth(next);
              }}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-gray-400 mb-2">
            <span>CN</span>
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
          </div>

          {/* Grid Cells */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {calendarDays.map((cell, idx) => {
              if (cell.empty) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }

              return (
                <button
                  key={cell.isoStr}
                  onClick={() => {
                    setSelectedDate(cell.isoStr);
                    setViewMode('timeline');
                  }}
                  className={`h-11 rounded-2xl flex flex-col items-center justify-center relative transition ${
                    cell.isSelected
                      ? 'bg-pink-500 text-white font-black shadow-md shadow-pink-500/30'
                      : cell.isToday
                      ? 'bg-pink-100 text-pink-700 font-bold border border-pink-300'
                      : 'hover:bg-gray-100 text-gray-700 font-medium'
                  }`}
                >
                  <span className="text-xs leading-none">{cell.day}</span>

                  {/* Indicator icons */}
                  {cell.checkinCount > 0 && (
                    <div className="flex items-center gap-0.5 mt-1">
                      {cell.isGood ? (
                        <span className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${cell.isSelected ? 'bg-pink-200' : 'bg-amber-400'}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Đạt chỉ tiêu
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Chưa đủ mốc
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

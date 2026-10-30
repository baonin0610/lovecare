/**
 * Cycle Calculation Engine (Flo / Apple Health Standard)
 * Provides accurate menstrual cycle calculations, phase classification,
 * fertile window predictions, and medical-grade care recommendations.
 */

export const SYMPTOMS_LIST = [
  { id: 'cramps', label: 'Đau bụng dưới' },
  { id: 'backache', label: 'Mỏi thắt lưng' },
  { id: 'fatigue', label: 'Mệt mỏi' },
  { id: 'headache', label: 'Đau đầu' },
  { id: 'bloating', label: 'Đầy hơi' },
  { id: 'tenderBreasts', label: 'Căng tức ngực' },
  { id: 'acne', label: 'Nổi mụn' }
];

export const MOODS_LIST = [
  { id: 'sensitive', label: 'Nhạy cảm' },
  { id: 'irritable', label: 'Dễ cáu gắt' },
  { id: 'cravings', label: 'Thèm đồ ngọt' },
  { id: 'needRest', label: 'Cần nghỉ ngơi' },
  { id: 'anxious', label: 'Căng thẳng' },
  { id: 'calm', label: 'Thoải mái' },
  { id: 'energetic', label: 'Năng động' }
];

export const FLOW_LEVELS = [
  { id: 'light', label: 'Lưu lượng nhẹ' },
  { id: 'medium', label: 'Lưu lượng vừa' },
  { id: 'heavy', label: 'Lưu lượng nhiều' }
];

export const CARE_ACTIONS = [
  {
    id: 'warm_water',
    title: 'Nhắc uống nước ấm',
    message: 'Bé nhớ uống nước ấm đều đặn và hạn chế đồ đá lạnh nhé.'
  },
  {
    id: 'warm_compress',
    title: 'Nhắc chườm ấm bụng',
    message: 'Bé nhớ chườm ấm bụng và nằm nghỉ một chút cho dễ chịu nhé.'
  },
  {
    id: 'rest_early',
    title: 'Gợi ý nghỉ ngơi sớm',
    message: 'Hôm nay cơ thể cần nạp lại năng lượng, tối nay bé nhớ ngủ sớm nhé.'
  },
  {
    id: 'encouragement',
    title: 'Gửi lời động viên',
    message: 'Anh luôn ở bên cạnh bé, có mệt hay khó chịu gì cứ nói với anh nhé.'
  }
];

function parseDateOnly(dateStr) {
  if (!dateStr) return new Date();
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

function formatDateOnly(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculates current cycle status, phase, and predictions
 */
export function calculateCycle(rawCycleData = {}, currentDateStr = null) {
  const cycleData = (rawCycleData && typeof rawCycleData === 'object') ? rawCycleData : {};
  const today = currentDateStr ? parseDateOnly(currentDateStr) : new Date();
  const todayStr = currentDateStr || formatDateOnly(today);

  const cycleLength = Math.max(21, Math.min(45, Number(cycleData.cycleLength) || 28));
  const periodDuration = Math.max(2, Math.min(10, Number(cycleData.periodDuration) || 5));
  
  // Default to 14 days ago if not set yet
  let lastPeriodDateStr = cycleData.lastPeriodDate;
  if (!lastPeriodDateStr) {
    const defaultLast = addDays(today, -14);
    lastPeriodDateStr = formatDateOnly(defaultLast);
  }
  const lastPeriodDate = parseDateOnly(lastPeriodDateStr);

  const diffTime = today.getTime() - lastPeriodDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Determine current cycle day (1 to cycleLength)
  let currentCycleDay = 1;
  let cyclesElapsed = 0;
  if (diffDays >= 0) {
    currentCycleDay = (diffDays % cycleLength) + 1;
    cyclesElapsed = Math.floor(diffDays / cycleLength);
  } else {
    currentCycleDay = 1;
  }

  // Next period date prediction
  const currentCycleStartDate = addDays(lastPeriodDate, cyclesElapsed * cycleLength);
  const nextPeriodDate = addDays(currentCycleStartDate, cycleLength);
  const nextPeriodDateStr = formatDateOnly(nextPeriodDate);

  const daysUntilNext = Math.max(0, Math.ceil((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  // Estimated Ovulation Day (approx 14 days before next period)
  const ovulationDate = addDays(nextPeriodDate, -14);
  const ovulationDateStr = formatDateOnly(ovulationDate);
  const ovulationCycleDay = Math.max(1, cycleLength - 14 + 1);

  // Fertile Window: ovulation - 4 days to ovulation + 1 day
  const fertileStartCycleDay = Math.max(1, ovulationCycleDay - 4);
  const fertileEndCycleDay = Math.min(cycleLength, ovulationCycleDay + 1);

  // Today's log if girlfriend entered one
  const logs = Array.isArray(cycleData.logs) ? cycleData.logs : [];
  const todayLog = logs.find((l) => l.date === todayStr) || null;

  // Phase Classification
  let phase = 'stable';
  let phaseName = 'Giai đoạn ổn định';
  let phaseDescription = 'Thể trạng cân bằng, sinh hoạt bình thường';
  let phaseColor = 'emerald';

  const isMarkedPeriod = todayLog ? todayLog.isPeriod : (currentCycleDay <= periodDuration);

  if (isMarkedPeriod) {
    phase = 'menstrual';
    phaseName = 'Kỳ kinh nguyệt';
    phaseDescription = 'Cơ thể cần được giữ ấm và nghỉ ngơi';
    phaseColor = 'rose';
  } else if (daysUntilNext <= 5 && daysUntilNext >= 1) {
    phase = 'pms';
    phaseName = 'Giai đoạn tiền kinh nguyệt';
    phaseDescription = 'Nội tiết tố thay đổi, cơ thể dễ nhạy cảm';
    phaseColor = 'amber';
  } else if (currentCycleDay >= fertileStartCycleDay && currentCycleDay <= fertileEndCycleDay) {
    phase = 'ovulation';
    phaseName = 'Cửa sổ rụng trứng';
    phaseDescription = 'Khả năng thụ thai cao, thể trạng tích cực';
    phaseColor = 'purple';
  }

  // Care Advice for Boyfriend
  let careAdvice = 'Thể trạng bạn gái đang ở trạng thái ổn định.';
  if (todayLog && todayLog.symptoms && todayLog.symptoms.length > 0) {
    const syms = todayLog.symptoms;
    if (syms.includes('cramps')) {
      careAdvice = 'Bạn gái đang đau bụng dưới. Hạn chế đồ uống đá lạnh, chuẩn bị nước ấm hoặc túi chườm bụng, tránh vận động nặng.';
    } else if (syms.includes('fatigue')) {
      careAdvice = 'Bạn gái đang cảm thấy mệt mỏi. Khuyến khích bạn gái nghỉ ngơi sớm và giảm bớt các việc căng thẳng.';
    } else if (syms.includes('backache')) {
      careAdvice = 'Bạn gái đang mỏi thắt lưng. Tránh ngồi một tư thế quá lâu và có thể xoa bóp nhẹ nhàng cho bạn gái.';
    } else if (syms.includes('headache')) {
      careAdvice = 'Bạn gái đang bị đau đầu. Chuẩn bị không gian yên tĩnh, giảm ánh sáng mạnh và nhắc bạn gái thư giãn.';
    }
  } else if (todayLog && todayLog.mood) {
    if (['sensitive', 'irritable'].includes(todayLog.mood)) {
      careAdvice = 'Tâm trạng bạn gái đang nhạy cảm do thay đổi nội tiết. Hãy kiên nhẫn lắng nghe, tạo sự thoải mái và tránh tranh cãi.';
    } else if (todayLog.mood === 'cravings') {
      careAdvice = 'Bạn gái đang có cảm giác thèm ngọt. Một món tráng miệng thanh nhẹ sẽ giúp tinh thần bạn gái thoải mái hơn.';
    }
  } else {
    // Default phase advice
    if (phase === 'menstrual') {
      careAdvice = `Bạn gái đang ở ngày thứ ${currentCycleDay} của kỳ kinh nguyệt. Hãy nhắc bạn gái giữ ấm cơ thể và uống đủ nước ấm.`;
    } else if (phase === 'pms') {
      careAdvice = `Dự kiến khoảng ${daysUntilNext} ngày nữa bạn gái sẽ bắt đầu kỳ mới. Hãy chủ động quan tâm và hỗ trợ bạn gái từ sớm.`;
    } else if (phase === 'ovulation') {
      careAdvice = 'Bạn gái đang trong giai đoạn năng lượng cao, tinh thần và thể trạng nhìn chung rất tốt.';
    }
  }

  return {
    todayStr,
    currentCycleDay,
    cycleLength,
    periodDuration,
    daysUntilNext,
    nextPeriodDateStr,
    ovulationDateStr,
    phase,
    phaseName,
    phaseDescription,
    phaseColor,
    careAdvice,
    todayLog,
    logs
  };
}

// src/utils/fapAttendanceHelper.js
// Bộ công cụ quản lý điểm danh FAP & Cảnh báo vắng (Absent Alert) cuối ca học +10 phút

// Định nghĩa 6 Slot học chuẩn cơ sở Hà Nội / Hòa Lạc kèm mốc giờ kết thúc & giờ cảnh báo vắng (+10p)
export const FAP_TIMESLOTS = [
  {
    slot: 1,
    time: '07h30 - 09h50',
    startTime: '07:30',
    endTime: '09:50',
    alertTime: '10:00', // Cuối slot + 10 phút
    endHour: 9,
    endMinute: 50,
    alertHour: 10,
    alertMinute: 0,
  },
  {
    slot: 2,
    time: '10h00 - 12h20',
    startTime: '10:00',
    endTime: '12:20',
    alertTime: '12:30', // Cuối slot + 10 phút
    endHour: 12,
    endMinute: 20,
    alertHour: 12,
    alertMinute: 30,
  },
  {
    slot: 3,
    time: '12h50 - 15h10',
    startTime: '12:50',
    endTime: '15:10',
    alertTime: '15:20', // Cuối slot + 10 phút
    endHour: 15,
    endMinute: 10,
    alertHour: 15,
    alertMinute: 20,
  },
  {
    slot: 4,
    time: '15h20 - 17h40',
    startTime: '15:20',
    endTime: '17:40',
    alertTime: '17:50', // Cuối slot + 10 phút
    endHour: 17,
    endMinute: 40,
    alertHour: 17,
    alertMinute: 50,
  },
  {
    slot: 5,
    time: '17h50 - 20h10',
    startTime: '17:50',
    endTime: '20:10',
    alertTime: '20:20', // Cuối slot + 10 phút
    endHour: 20,
    endMinute: 10,
    alertHour: 20,
    alertMinute: 20,
  },
  {
    slot: 6,
    time: '20h20 - 22h40',
    startTime: '20:20',
    endTime: '22:40',
    alertTime: '22:50', // Cuối slot + 10 phút
    endHour: 22,
    endMinute: 40,
    alertHour: 22,
    alertMinute: 50,
  },
  {
    slot: 9,
    time: '08h00 - 11h40',
    startTime: '08:00',
    endTime: '11:40',
    alertTime: '11:50', // Cuối slot + 10 phút
    endHour: 11,
    endMinute: 40,
    alertHour: 11,
    alertMinute: 50,
  },
];

// Trạng thái điểm danh FAP
export const ATTENDANCE_STATUS = {
  ABSENT: 'Absent', // Vắng mặt -> CẦN CẢNH BÁO
  PRESENT: 'Present', // Có mặt -> Không cần cảnh báo
  NOT_YET: 'Not yet', // Chưa điểm danh -> Bỏ qua
};

/**
 * Lấy thông tin ngày hiện tại theo chuẩn FAP Việt Nam (Thứ 2 = 2, ..., Thứ 7 = 7, CN = 8)
 */
export function getCurrentVietnamDayInfo(now = new Date()) {
  const jsDay = now.getDay(); // 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7
  const dayIndex = jsDay === 0 ? 8 : jsDay + 1; // 2..8
  const dayNames = {
    2: 'Thứ 2',
    3: 'Thứ 3',
    4: 'Thứ 4',
    5: 'Thứ 5',
    6: 'Thứ 6',
    7: 'Thứ 7',
    8: 'Chủ nhật',
  };
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  const fullDateStr = `${dayNames[dayIndex]}, ${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;

  return {
    dayIndex,
    dayName: dayNames[dayIndex],
    dateStr,
    fullDateStr,
  };
}

/**
 * Tự động nhận diện Slot (1..6, 9) từ chuỗi thời gian (ví dụ: '10:00 - 12:20' -> Slot 2, '08h00 - 11h40' -> Slot 9)
 */
export function detectSlotFromTimeStr(timeStr = '') {
  if (!timeStr) return 1;
  const clean = String(timeStr).toLowerCase();
  // Slot 9 cuối tuần: 08h00 - 11h40
  if (clean.includes('11h40') || clean.includes('11:40') || (clean.includes('08h00') && clean.includes('11h'))) {
    return 9;
  }
  const m = clean.match(/(\d{1,2})[h:](\d{2})/);
  if (!m) return 1;
  const hour = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const totalMin = hour * 60 + min;

  if (totalMin < 9 * 60) return 1; // 07:30 - 09:50
  if (totalMin < 12 * 60) return 2; // 10:00 - 12:20
  if (totalMin < 14 * 60 + 30) return 3; // 12:50 - 15:10
  if (totalMin < 17 * 60) return 4; // 15:20 - 17:40
  if (totalMin < 19 * 60 + 30) return 5; // 17:50 - 20:10
  return 6; // 20:00 - 22:20 hoặc 20:20 - 22:40
}

/**
 * Chuẩn hóa và làm sạch danh sách ca học (loại bỏ slot ảo > 9 như 101, 392 và GV 'Offline'/'Online')
 */
export function sanitizeSlots(slotList = []) {
  if (!Array.isArray(slotList)) return [];
  return slotList.map((slot, idx) => {
    let validSlot = Number(slot.slot);
    if (!validSlot || validSlot < 1 || validSlot > 9) {
      validSlot = detectSlotFromTimeStr(slot.time) || 1;
    }

    let cleanLecturer = (slot.lecturer || '').trim();
    if (
      cleanLecturer.toLowerCase() === 'offline' ||
      cleanLecturer.toLowerCase() === 'online' ||
      cleanLecturer === '-' ||
      cleanLecturer.toLowerCase() === 'giảng viên'
    ) {
      cleanLecturer = '';
    }

    let cleanDate = (slot.date || '').trim();
    if (cleanDate) {
      const dm = cleanDate.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (dm) {
        const d = String(dm[1]).padStart(2, '0');
        const m = String(dm[2]).padStart(2, '0');
        cleanDate = `${d}/${m}${dm[3] ? `/${dm[3]}` : ''}`;
      }
    }

    const cfg = FAP_TIMESLOTS.find((t) => t.slot === validSlot) || FAP_TIMESLOTS[0];

    return {
      ...slot,
      id: slot.id || `slot_sanitized_${validSlot}_${idx}`,
      slot: validSlot,
      date: cleanDate || slot.date,
      lecturer: cleanLecturer,
      alertTime: slot.alertTime || cfg.alertTime,
      time: slot.time || cfg.time,
    };
  });
}

/**
 * Trích xuất danh sách ca học HÔM NAY từ tất cả các môn đã cào Full (Report/Attendance)
 */
export function extractTodaySlotsFromCourses(courses = [], now = new Date()) {
  if (!Array.isArray(courses) || courses.length === 0) return [];
  const pad = (n) => String(n).padStart(2, '0');
  const todayDateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  const shortToday = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}`;
  const { dayName } = getCurrentVietnamDayInfo(now);

  const matched = [];
  courses.forEach((course) => {
    const sessions = Array.isArray(course.sessions) ? course.sessions : [];
    sessions.forEach((s) => {
      const sDate = s.date || '';
      if (sDate === todayDateStr || sDate.includes(shortToday)) {
        const slotNum = s.slot || detectSlotFromTimeStr(s.time);
        const cfg = FAP_TIMESLOTS.find((t) => t.slot === slotNum);
        matched.push({
          id: `today_course_${course.courseCode}_${s.sessionNumber || matched.length}`,
          slot: slotNum,
          dayName,
          date: s.date,
          time: s.time || (cfg ? cfg.time : '07h30 - 09h50'),
          alertTime: cfg ? cfg.alertTime : '10:00',
          subjectCode: course.courseCode,
          subjectName: course.courseName || course.courseCode,
          room: s.room || 'DE-422',
          lecturer: s.lecturer || 'Giảng viên',
          status: s.status || ATTENDANCE_STATUS.NOT_YET,
          notified: false,
          sessionNumber: s.sessionNumber,
          totalSlots: course.totalSlots,
        });
      }
    });
  });

  // Sắp xếp ca học theo thứ tự Slot từ 1 đến 6
  return matched.sort((a, b) => a.slot - b.slot);
}

/**
 * Lấy dải ngày của một tuần (Thứ 2 đến Chủ nhật) dựa trên độ lệch tuần (weekOffset)
 * @param {number} weekOffset - Độ lệch tuần: 0 là tuần này, 1 là tuần sau, -1 là tuần trước...
 * @param {Date} baseDate - Mốc ngày cơ sở (mặc định là hôm nay)
 */
export function getWeekDateRange(weekOffset = 0, baseDate = new Date()) {
  const now = new Date(baseDate);
  const jsDay = now.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const saturday = new Date(monday);
  saturday.setDate(monday.getDate() + 5);

  const pad = (n) => String(n).padStart(2, '0');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({
      dateObj: d,
      dateStr: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`,
      shortDate: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
      dayIndex: i + 2, // 2..8 (Thứ 2..Chủ nhật)
      dayName: i === 6 ? 'Chủ nhật' : `Thứ ${i + 2}`,
      isToday:
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear(),
    });
  }

  const startStr = `${pad(monday.getDate())}/${pad(monday.getMonth() + 1)}`;
  const endStr = `${pad(sunday.getDate())}/${pad(sunday.getMonth() + 1)}`;
  const weekLabel = `Tuần (${startStr} - ${endStr})`;

  // referenceDate cho FAP WeekPartial (Thứ 7: YYYY-MM-DD theo chuẩn FAP)
  const refDate = `${saturday.getFullYear()}-${pad(saturday.getMonth() + 1)}-${pad(saturday.getDate())}`;

  return {
    monday,
    sunday,
    saturday,
    days,
    startStr,
    endStr,
    weekLabel,
    refDate,
    weekOffset,
  };
}

/**
 * Trích xuất danh sách ca học một tuần từ tất cả các môn đã cào Full (Report/Attendance)
 * Hỗ trợ chuyển tuần (weekOffset: 0 = tuần này, 1 = tuần sau, -1 = tuần trước...)
 */
export function extractWeeklySlotsFromCourses(courses = [], dateOrOffset = 0) {
  if (!Array.isArray(courses) || courses.length === 0) return [];

  let weekInfo;
  if (typeof dateOrOffset === 'number') {
    weekInfo = getWeekDateRange(dateOrOffset);
  } else if (dateOrOffset instanceof Date) {
    weekInfo = getWeekDateRange(0, dateOrOffset);
  } else {
    weekInfo = getWeekDateRange(0);
  }

  const weekDays = weekInfo.days;

  const result = [];
  courses.forEach((course) => {
    const sessions = Array.isArray(course.sessions) ? course.sessions : [];
    sessions.forEach((s) => {
      const sDate = s.date || '';
      const matchedDay = weekDays.find(
        (wd) => sDate === wd.dateStr || sDate.includes(wd.shortDate)
      );
      if (matchedDay) {
        const slotNum = s.slot || detectSlotFromTimeStr(s.time);
        const cfg = FAP_TIMESLOTS.find((t) => t.slot === slotNum);
        result.push({
          id: `week_course_${course.courseCode}_${s.sessionNumber || result.length}_${matchedDay.shortDate.replace('/', '_')}`,
          slot: slotNum,
          dayIndex: matchedDay.dayIndex,
          dayName: matchedDay.dayName,
          date: matchedDay.shortDate,
          fullDate: s.date,
          time: s.time || (cfg ? cfg.time : '07h30 - 09h50'),
          alertTime: cfg ? cfg.alertTime : '10:00',
          subjectCode: course.courseCode,
          subjectName: course.courseName || course.courseCode,
          room: s.room || 'DE-422',
          lecturer: s.lecturer || 'Giảng viên',
          status: s.status || ATTENDANCE_STATUS.NOT_YET,
          notified: false,
          sessionNumber: s.sessionNumber,
          totalSlots: course.totalSlots,
        });
      }
    });
  });

  return result.sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.slot - b.slot;
  });
}

/**
 * Lọc danh sách ca học theo tuần (weekOffset) cho các ca học lấy từ WeeklyTimetable
 */
export function filterSlotsForWeek(slots = [], weekOffset = 0) {
  if (!Array.isArray(slots) || slots.length === 0) return [];
  const weekInfo = getWeekDateRange(weekOffset);
  const pad = (n) => String(n).padStart(2, '0');
  const weekShortDates = new Set(weekInfo.days.map((d) => d.shortDate));
  const weekFullDates = new Set(weekInfo.days.map((d) => d.dateStr));

  // Chuẩn hóa ngày dạng d/m thành dd/mm để khớp chính xác 100%
  const normalizeDateStr = (raw) => {
    if (!raw) return '';
    const m = String(raw).match(/(\d{1,2})\/(\d{1,2})/);
    if (!m) return String(raw).trim();
    return `${pad(m[1])}/${pad(m[2])}`;
  };

  const normalizedWeekShort = new Set(Array.from(weekShortDates).map(normalizeDateStr));

  // 1. Lọc các slot có date nằm trong dải ngày của tuần
  const matched = slots.filter((s) => {
    if (!s.date) return false;
    const norm = normalizeDateStr(s.date);
    const cleanDate = String(s.date).trim();
    if (normalizedWeekShort.has(norm) || weekShortDates.has(cleanDate) || weekFullDates.has(cleanDate)) {
      return true;
    }
    for (const shortD of normalizedWeekShort) {
      if (norm.includes(shortD)) return true;
    }
    return false;
  });

  if (matched.length > 0) {
    return matched.sort((a, b) => {
      const dayA = a.dayIndex || 2;
      const dayB = b.dayIndex || 2;
      if (dayA !== dayB) return dayA - dayB;
      return (a.slot || 1) - (b.slot || 1);
    });
  }

  // 2. Nếu đang ở tuần hiện tại (weekOffset === 0) và không có slot nào gắn date cụ thể, nhưng có slot theo dayIndex
  if (weekOffset === 0) {
    const hasAnyDatedSlot = slots.some((s) => s.date && /\d{1,2}\/\d{1,2}/.test(s.date));
    if (!hasAnyDatedSlot) {
      return slots;
    }
  }

  return [];
}

/**
 * Tìm ca học tiếp theo sắp tới thực tế (Loại bỏ triệt để các ca đã qua trong quá khứ):
 * 1. Parse thời gian thực ngày + giờ của từng ca học.
 * 2. Chỉ chọn các ca học có thời gian kết thúc > thời điểm hiện tại.
 * 3. Sắp xếp theo thứ tự thời gian tăng dần, trả về ca học gần nhất trong tương lai.
 */
export function getNextUpcomingSlot(weeklySlots = [], now = new Date()) {
  if (!Array.isArray(weeklySlots) || weeklySlots.length === 0) return null;
  const sanitized = sanitizeSlots(weeklySlots);

  const getSlotEndTime = (slot) => {
    if (!slot) return null;
    let slotYear = now.getFullYear();
    let slotMonth = now.getMonth();
    let slotDay = now.getDate();

    if (slot.date) {
      const dm = String(slot.date).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (dm) {
        slotDay = parseInt(dm[1], 10);
        slotMonth = parseInt(dm[2], 10) - 1;
        if (dm[3]) slotYear = parseInt(dm[3], 10);
      }
    } else if (slot.dayIndex) {
      const { dayIndex: todayDayIndex } = getCurrentVietnamDayInfo(now);
      const diff = slot.dayIndex - todayDayIndex;
      const d = new Date(now);
      d.setDate(now.getDate() + diff);
      slotDay = d.getDate();
      slotMonth = d.getMonth();
      slotYear = d.getFullYear();
    }

    const cfg = FAP_TIMESLOTS.find((t) => t.slot === slot.slot);
    const endH = cfg ? cfg.endHour : 12;
    const endM = cfg ? cfg.endMinute : 20;

    return new Date(slotYear, slotMonth, slotDay, endH, endM, 0);
  };

  const getSlotStartTime = (slot) => {
    const end = getSlotEndTime(slot);
    if (!end) return null;
    const cfg = FAP_TIMESLOTS.find((t) => t.slot === slot.slot);
    const startH = cfg && cfg.startTime ? parseInt(cfg.startTime.split(':')[0], 10) : end.getHours() - 2;
    const startM = cfg && cfg.startTime ? parseInt(cfg.startTime.split(':')[1], 10) : 0;
    const st = new Date(end);
    st.setHours(startH, startM, 0, 0);
    return st;
  };

  const nowMs = now.getTime();

  // Chỉ lấy các ca học trong tương lai (chưa kết thúc)
  const futureSlots = sanitized
    .map((s) => ({
      slot: s,
      startTime: getSlotStartTime(s),
      endTime: getSlotEndTime(s),
    }))
    .filter((item) => item.endTime && item.endTime.getTime() > nowMs)
    .sort((a, b) => a.endTime.getTime() - b.endTime.getTime());

  if (futureSlots.length === 0) {
    return null; // Không có ca học nào trong tương lai -> Không hiển thị ca học quá khứ
  }

  const nextItem = futureSlots[0];
  const s = nextItem.slot;
  const isToday =
    nextItem.endTime.getDate() === now.getDate() &&
    nextItem.endTime.getMonth() === now.getMonth() &&
    nextItem.endTime.getFullYear() === now.getFullYear();

  const isHappening = nextItem.startTime && nowMs >= nextItem.startTime.getTime();

  let statusLabel = '';
  if (isHappening) {
    statusLabel = 'Đang diễn ra';
  } else if (isToday) {
    statusLabel = 'Sắp diễn ra hôm nay';
  } else {
    const rawDay = (s.dayName || '').replace(/\s*\(\d{1,2}\/\d{1,2}\)/, '').trim();
    const cleanDate = s.date ? ` (${s.date})` : '';
    statusLabel = `Sắp tới: ${rawDay || 'Tuần tới'}${cleanDate}`;
  }

  return {
    ...s,
    isToday,
    statusLabel,
  };
}

/**
 * Tạo danh sách referenceDate của toàn bộ các tuần trong học kỳ (17 tuần: từ 6 tuần trước đến 10 tuần sau)
 * Dùng để cào Full thời khóa biểu cả kỳ trong 1 click mà không cần cào từng tuần
 */
export function getSemesterWeekReferenceDates(baseDate = new Date()) {
  const dates = [];
  for (let offset = -6; offset <= 10; offset++) {
    const w = getWeekDateRange(offset, baseDate);
    dates.push({
      weekOffset: offset,
      weekLabel: w.weekLabel,
      startStr: w.startStr,
      endStr: w.endStr,
      refDate: w.refDate, // YYYY-MM-DD
    });
  }
  return dates;
}

/**
 * Lọc danh sách ca học diễn ra trong ngày hôm nay từ danh sách ca học cả tuần
 */
export function filterSlotsForToday(weeklySlots = [], now = new Date()) {
  if (!Array.isArray(weeklySlots) || weeklySlots.length === 0) return [];
  const { dayIndex, dateStr } = getCurrentVietnamDayInfo(now);

  const pad = (n) => String(n).padStart(2, '0');
  const normalizeDateStr = (raw) => {
    if (!raw) return '';
    const m = String(raw).match(/(\d{1,2})\/(\d{1,2})/);
    if (!m) return String(raw).trim();
    return `${pad(m[1])}/${pad(m[2])}`;
  };

  // Kiểm tra xem trong danh sách có ca học nào được gắn ngày (DD/MM) không
  const hasAnyDatedSlot = weeklySlots.some((s) => s.date && /\d{1,2}\/\d{1,2}/.test(s.date));

  return weeklySlots
    .filter((slot) => {
      // 1. Khi danh sách có date (cào full cả kỳ), BẮT BUỘC phải khớp chính xác ngày hôm nay (dateStr)
      if (hasAnyDatedSlot) {
        if (!slot.date) return false;
        const norm = normalizeDateStr(slot.date);
        return norm === dateStr || norm.includes(dateStr);
      }
      // 2. Chỉ khi danh sách hoàn toàn không có ngày (chỉ có duy nhất 1 tuần không ngày):
      if (slot.dayIndex !== undefined && slot.dayIndex !== null) {
        return Number(slot.dayIndex) === Number(dayIndex);
      }
      return false;
    })
    .sort((a, b) => (Number(a.slot) || 1) - (Number(b.slot) || 1));
}

/**
 * Bóc tách Thời khóa biểu tuần từ văn bản thuần (hỗ trợ văn bản copy từ WeekPartial hoặc ma trận FAP)
 */
export function parseWeeklyTimetableRawText(text = '') {
  if (!text || typeof text !== 'string') return [];
  const trimmed = text.trim();

  // 1. Nếu là chuỗi JSON
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.slots && Array.isArray(parsed.slots)) return parsed.slots;
    } catch {}
  }

  const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const slots = [];

  const dayHeaderRegex = /(?:(Thứ\s*(\d)|Chủ\s*nhật)|(Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?))\s*\(?(\d{1,2}\/\d{1,2})?\)?/i;

  const getDayIndex = (dayStr) => {
    if (!dayStr) return 2;
    const s = dayStr.toLowerCase();
    if (s.includes('mon') || s.includes('thứ 2') || s === '2') return 2;
    if (s.includes('tue') || s.includes('thứ 3') || s === '3') return 3;
    if (s.includes('wed') || s.includes('thứ 4') || s === '4') return 4;
    if (s.includes('thu') || s.includes('thứ 5') || s === '5') return 5;
    if (s.includes('fri') || s.includes('thứ 6') || s === '6') return 6;
    if (s.includes('sat') || s.includes('thứ 7') || s === '7') return 7;
    if (s.includes('sun') || s.includes('chủ nhật') || s.includes('cn') || s === '8') return 8;
    return 2;
  };

  const getDayName = (dayIdx) => {
    const names = { 2: 'Thứ 2', 3: 'Thứ 3', 4: 'Thứ 4', 5: 'Thứ 5', 6: 'Thứ 6', 7: 'Thứ 7', 8: 'Chủ nhật' };
    return names[dayIdx] || 'Thứ 2';
  };

  const defaultTimes = {
    1: { time: '07h30 - 09h50', alertTime: '10:00' },
    2: { time: '10h00 - 12h20', alertTime: '12:30' },
    3: { time: '12h50 - 15h10', alertTime: '15:20' },
    4: { time: '15h20 - 17h40', alertTime: '17:50' },
    5: { time: '17h50 - 20h10', alertTime: '20:20' },
    6: { time: '20h20 - 22h40', alertTime: '22:50' },
    9: { time: '08h00 - 11h40', alertTime: '11:50' },
  };

  // 2. Kiểm tra nếu là dạng Table copy có Tab (\t) từ Desktop Chrome
  const hasTabTable = lines.some((l) => l.includes('\t') && dayHeaderRegex.test(l));
  if (hasTabTable) {
    let colDays = [];
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      const cells = row.split('\t').map((c) => c.trim());

      if (colDays.length === 0 && cells.some((c) => dayHeaderRegex.test(c))) {
        colDays = cells.map((cell) => {
          const m = cell.match(dayHeaderRegex);
          if (m) {
            const rawDay = m[1] || m[3];
            const dIdx = getDayIndex(rawDay);
            const dDate = m[4] || '';
            return { dayIndex: dIdx, date: dDate, dayName: getDayName(dIdx) };
          }
          return null;
        });
        continue;
      }

      const slotMatch = cells[0]?.match(/(?:Slot\s*|Ca\s*)?(\d+)/i);
      if (slotMatch && colDays.length > 0) {
        const slotNum = parseInt(slotMatch[1], 10);
        const timeCfg = defaultTimes[slotNum] || defaultTimes[1];

        for (let c = 1; c < cells.length; c++) {
          const cellContent = cells[c];
          if (!cellContent || cellContent === '-' || cellContent.length < 3) continue;

          const dayInfo = colDays[c] || { dayIndex: c + 1, date: '', dayName: getDayName(c + 1) };
          const subMatch = cellContent.match(/\b([A-Z]{3}\d{3}[A-Z0-9]?)\b/i);
          if (!subMatch) continue;

          const subCode = subMatch[1].toUpperCase();
          const roomMatch = cellContent.match(/(?:at|phòng|room)\s+([A-Z0-9-]+)/i);
          const room = roomMatch ? roomMatch[1] : 'DE-422';

          const isPresent = /có mặt|present/i.test(cellContent);
          const isAbsent = /vắng|absent/i.test(cellContent);
          const status = isPresent ? 'Present' : isAbsent ? 'Absent' : 'Not yet';

          slots.push({
            id: `slot_table_${slotNum}_${dayInfo.dayIndex}_${subCode}_${slots.length}`,
            slot: slotNum,
            dayIndex: dayInfo.dayIndex,
            dayName: dayInfo.date ? `${dayInfo.dayName} (${dayInfo.date})` : dayInfo.dayName,
            date: dayInfo.date,
            subjectCode: subCode,
            subjectName: subCode,
            room: room,
            time: timeCfg.time,
            alertTime: timeCfg.alertTime,
            status: status,
            lecturer: '',
            notified: false,
          });
        }
      }
    }
    if (slots.length > 0) return slots;
  }

  // 3. Fallback: Bóc tách tuần tự theo dòng (Desktop text copy hoặc Mobile WeekPartial)
  let currentDay = 'Thứ 2';
  let currentDate = '';
  let currentDayIndex = 2;
  let currentSlot = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const dMatch = line.match(dayHeaderRegex);
    if (dMatch) {
      const rawDay = dMatch[1] || dMatch[3];
      currentDayIndex = getDayIndex(rawDay);
      currentDay = getDayName(currentDayIndex);
      if (dMatch[4]) currentDate = dMatch[4];
      continue;
    }

    const sMatch = line.match(/^(?:Slot\s*|Ca\s*)?(\d+)(?:\s*\(([\d:h\s\-–]+)\))?$/i);
    if (sMatch) {
      currentSlot = parseInt(sMatch[1], 10);
      continue;
    }

    const subMatch = line.match(/\b([A-Z]{3}\d{3}[A-Z0-9]?)\b/i);
    if (subMatch && !line.includes('fap.fpt.edu.vn') && !line.includes('HTTP')) {
      const subCode = subMatch[1].toUpperCase();
      let room = 'DE-422';
      let status = 'Not yet';

      for (let j = i; j <= Math.min(i + 4, lines.length - 1); j++) {
        const nextLine = lines[j];
        const rM = nextLine.match(/(?:at|phòng|room)\s+([A-Z0-9-]+)/i);
        if (rM) room = rM[1];
        if (/có mặt|present/i.test(nextLine)) status = 'Present';
        if (/vắng|absent/i.test(nextLine)) status = 'Absent';
      }

      const timeCfg = defaultTimes[currentSlot] || defaultTimes[1];
      slots.push({
        id: `slot_seq_${currentSlot}_${currentDayIndex}_${subCode}_${slots.length}`,
        slot: currentSlot,
        dayIndex: currentDayIndex,
        dayName: currentDate ? `${currentDay} (${currentDate})` : currentDay,
        date: currentDate,
        subjectCode: subCode,
        subjectName: subCode,
        room: room,
        time: timeCfg.time,
        alertTime: timeCfg.alertTime,
        status: status,
        lecturer: '',
        notified: false,
      });
    }
  }

  return slots;
}


/**
 * Danh sách mẫu dự phòng khi người dùng muốn kiểm tra thử chuông báo
 */
export const SAMPLE_TODAY_SLOTS = [
  {
    id: 'sample_slot_1',
    slot: 1,
    subjectCode: 'SDN302',
    subjectName: 'Server-Side development with NodeJS, Express, MongoDB',
    room: 'BE-212',
    time: '07h30 - 09h50',
    alertTime: '10:00',
    status: ATTENDANCE_STATUS.PRESENT,
    lecturer: 'NguyenVV',
    notified: false,
  },
  {
    id: 'sample_slot_2',
    slot: 2,
    subjectCode: 'MMA301',
    subjectName: 'Multiplatform Mobile App Development with React Native',
    room: 'DE-422',
    time: '10h00 - 12h20',
    alertTime: '12:30',
    status: ATTENDANCE_STATUS.ABSENT,
    lecturer: 'TranTA',
    notified: false,
  },
];

/**
 * Tạo khóa định danh duy nhất cho một ca học (theo ngày, ca và mã môn)
 */
export function getSlotUniqueKey(slot) {
  if (!slot) return '';
  const date = (slot.date || '').trim();
  const slotNum = Number(slot.slot) || 1;
  const subCode = (slot.subjectCode || '').trim().toUpperCase();
  return `${date}_${slotNum}_${subCode}`;
}

/**
 * Kiểm tra xem slot học có phải là ca học của ngày HÔM NAY hay không
 */
export function isSlotForToday(slot, now = new Date()) {
  if (!slot) return false;
  const { dayIndex, dateStr } = getCurrentVietnamDayInfo(now);
  const pad = (n) => String(n).padStart(2, '0');

  if (slot.date) {
    const m = String(slot.date).match(/(\d{1,2})\/(\d{1,2})/);
    if (m) {
      const slotDateStr = `${pad(m[1])}/${pad(m[2])}`;
      return slotDateStr === dateStr;
    }
  }

  if (slot.dayIndex !== undefined && slot.dayIndex !== null) {
    return Number(slot.dayIndex) === Number(dayIndex);
  }

  return false;
}

/**
 * Tính toán mốc Date cảnh báo (+10 phút sau khi kết thúc Slot)
 */
export function getSlotAlertTimestamp(slotNumber, dateObj = new Date()) {
  const cfg = FAP_TIMESLOTS.find((s) => s.slot === Number(slotNumber)) || FAP_TIMESLOTS[0];
  const target = new Date(dateObj);
  target.setHours(cfg.alertHour, cfg.alertMinute, 0, 0);
  return target;
}

/**
 * Kiểm tra xem slot học có bị Absent và đã chạm mốc giờ cảnh báo (hết ca + 10p) hay chưa.
 * QUY TẮC CHẶT CHẼ:
 * 1. Ca học PHẢI là ca của ngày HÔM NAY (không báo ca quá khứ hoặc ca các ngày khác trong tuần).
 * 2. Chưa từng được thông báo (notified !== true).
 * 3. Đang trong khung giờ cảnh báo hợp lệ (đã tới mốc +10p nhưng không trôi qua quá 45 phút).
 *    Nếu ca học đã kết thúc từ lâu trong quá khứ (ví dụ ca sáng nhưng tối mới mở app),
 *    sẽ tự động trả về isExpiredPast: true để đánh dấu đã qua, KHÔNG bắn chuông/popup phiền người dùng.
 */
export function checkSlotAbsentAlert(slotItem, now = new Date()) {
  const isAbsent =
    slotItem.status === ATTENDANCE_STATUS.ABSENT ||
    slotItem.status?.toLowerCase() === 'absent' ||
    slotItem.status?.toLowerCase() === 'vắng' ||
    slotItem.status?.toLowerCase() === 'vắng mặt';

  if (!isAbsent || slotItem.notified) {
    return { shouldAlert: false, isAbsent, diffMs: 0, alertTimeText: '--:--' };
  }

  // 1. Phải là ca học của ngày HÔM NAY
  if (!isSlotForToday(slotItem, now)) {
    return { shouldAlert: false, isAbsent, diffMs: 0, alertTimeText: '--:--' };
  }

  const alertDate = getSlotAlertTimestamp(slotItem.slot, now);
  const diffMs = alertDate.getTime() - now.getTime();
  const pad = (n) => String(n).padStart(2, '0');
  const alertTimeText = `${pad(alertDate.getHours())}:${pad(alertDate.getMinutes())}`;

  // 2. Chỉ cảnh báo nếu:
  // - Đã đến giờ cảnh báo: diffMs <= 0
  // - Và trong cửa sổ gần đây (trong vòng 45 phút từ mốc báo).
  // Nếu đã qua mốc hơn 45 phút (ví dụ slot 1 sáng, mở app vào buổi tối),
  // ta coi như đã biết/lịch sử cũ, không báo động giật mình.
  const isRecentWindow = diffMs <= 0 && Math.abs(diffMs) <= 45 * 60 * 1000;
  const isExpiredPast = diffMs < -45 * 60 * 1000;

  return {
    shouldAlert: isRecentWindow,
    isExpiredPast,
    isAbsent: true,
    diffMs,
    alertDate,
    alertTimeText,
  };
}

/**
 * Hợp nhất danh sách ca học mới cào được với lịch sử đã lưu,
 * BẢO TOÀN trạng thái đã thông báo (notified) và TỰ ĐỘNG dập tắt cảnh báo với các ca cũ trong quá khứ.
 */
export function mergeSlotsWithNotifiedHistory(incomingSlots = [], existingSlots = [], now = new Date()) {
  const existingMap = new Map();
  (existingSlots || []).forEach((s) => {
    const key = getSlotUniqueKey(s);
    if (key) existingMap.set(key, s);
  });

  const sanitized = sanitizeSlots(incomingSlots);

  return sanitized.map((slot) => {
    const key = getSlotUniqueKey(slot);
    const old = existingMap.get(key);

    const isAbsent =
      slot.status === ATTENDANCE_STATUS.ABSENT ||
      slot.status?.toLowerCase() === 'absent' ||
      slot.status?.toLowerCase() === 'vắng' ||
      slot.status?.toLowerCase() === 'vắng mặt';

    // Giữ cờ notified cũ nếu trước đó đã từng được xử lý
    let notified = old?.notified || slot.notified || false;

    // Nếu slot bị VẮNG MẶT nhưng:
    // a) Không phải ca học của ngày hôm nay (ca tuần trước, ca hôm qua...), HOẶC
    // b) Là ca hôm nay nhưng mốc giờ cảnh báo đã trôi qua hơn 45 phút trước khi cào dữ liệu:
    // -> TỰ ĐỘNG ĐÁNH DẤU notified = true để KHÔNG bao giờ làm phiền người dùng!
    if (isAbsent && !notified) {
      if (!isSlotForToday(slot, now)) {
        notified = true;
      } else {
        const alertDate = getSlotAlertTimestamp(slot.slot, now);
        const diffMs = alertDate.getTime() - now.getTime();
        if (diffMs < -45 * 60 * 1000) {
          notified = true;
        }
      }
    }

    return {
      ...slot,
      notified,
    };
  });
}


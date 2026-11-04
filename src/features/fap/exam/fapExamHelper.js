// src/utils/fapExamHelper.js
// Bộ công cụ hỗ trợ tích hợp cổng FAP (fap.fpt.edu.vn), bóc tách lịch thi & tính toán thời gian nhắc nhở

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

export const FAP_CAMPUSES = [
  { id: 'HN', name: 'Cơ sở Hà Nội (HN)' },
  { id: 'HCM', name: 'Cơ sở TP. Hồ Chí Minh (HCM)' },
  { id: 'DN', name: 'Cơ sở Đà Nẵng (DN)' },
  { id: 'CT', name: 'Cơ sở Cần Thơ (CT)' },
  { id: 'QN', name: 'Cơ sở Quy Nhơn (QN)' },
];

export const REMINDER_PRESETS = [
  { label: '1 phút', minutes: 1 },
  { label: '5 phút', minutes: 5 },
  { label: '15 phút', minutes: 15 },
  { label: '30 phút', minutes: 30 },
  { label: '1 giờ', minutes: 60 },
  { label: '2 giờ', minutes: 120 },
  { label: '1 ngày', minutes: 1440 },
];

export const SAMPLE_SSO_ACCOUNTS = [
  {
    id: 'acc_1',
    name: 'Sinh Viên FPT',
    studentId: 'HE180000',
    program: 'BIT_SE_19C_NJ',
    cohort: '19',
    email: 'sinhvien.fpt@gmail.com',
    fptEmail: 'sinhvienhe180000@fpt.edu.vn',
    campus: 'Cơ sở Hà Nội (HN)',
    status: 'HD',
  },
  {
    id: 'acc_2',
    name: 'Nguyễn Văn A (Demo)',
    studentId: 'HE180001',
    program: 'BIT_SE_19C_NJ',
    cohort: '19',
    email: 'sinhvien.demo@gmail.com',
    fptEmail: 'sinhvienhe180001@fpt.edu.vn',
    campus: 'Cơ sở Hà Nội (HN)',
    status: 'HD',
  },
  {
    id: 'acc_3',
    name: 'FPT Student',
    studentId: 'HE180888',
    program: 'BIT_SE_19C',
    cohort: '19',
    email: 'student.demo@gmail.com',
    fptEmail: 'studenthe180888@fpt.edu.vn',
    campus: 'Cơ sở Hà Nội (HN)',
    status: 'HD',
  },
];

// Danh sách lịch thi chuẩn theo hệ thống FAP (/ExamSchedule)
export const INITIAL_FAP_EXAMS = [
  {
    id: 'exam_sdn302_pe',
    date: '08/11/2026',
    time: '10h00-12h00',
    room: 'BE-212',
    subjectCode: 'SDN302',
    subjectName: 'Server-Side development with NodeJS, Express, and MongoDB',
    examForm: 'Practical_Exam (PEA client)',
    examType: 'PE',
    publishDate: '21/11/2026',
    note: '',
    reminderEnabled: true,
    customReminderMinutes: null, // null = dùng cấu hình mặc định chung
    notified: false,
  },
  {
    id: 'exam_mma301_pe',
    date: '10/11/2026',
    time: '07h30-09h30',
    room: 'AL-R204',
    subjectCode: 'MMA301',
    subjectName: 'Multiplatform Mobile App Development',
    examForm: 'Practical_Exam (PEA client)',
    examType: 'PE',
    publishDate: '23/11/2026',
    note: 'Mang theo cáp sạc thiết bị di động',
    reminderEnabled: true,
    customReminderMinutes: null,
    notified: false,
  },
  {
    id: 'exam_sdn302_fe',
    date: '14/11/2026',
    time: '13h00-14h30',
    room: 'BE-305',
    subjectCode: 'SDN302',
    subjectName: 'Server-Side development with NodeJS, Express, and MongoDB',
    examForm: 'Multiple_Choice (EOS client)',
    examType: 'FE',
    publishDate: '25/11/2026',
    note: 'Cập nhật EOS client bản mới nhất',
    reminderEnabled: true,
    customReminderMinutes: 60,
    notified: false,
  },
  {
    id: 'exam_swd392_fe',
    date: '17/11/2026',
    time: '09h50-11h20',
    room: 'DE-210',
    subjectCode: 'SWD392',
    subjectName: 'SW Architecture and Design',
    examForm: 'Multiple_Choice (EOS client)',
    examType: 'FE',
    publishDate: '28/11/2026',
    note: '',
    reminderEnabled: true,
    customReminderMinutes: null,
    notified: false,
  },
];

/**
 * Chuyển đổi chuỗi ngày ("08/11/2026") và giờ ("10h00-12h00" hoặc "07:30-09:30") thành Date bắt đầu thi
 */
export function parseExamStartTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    const cleanDate = dateStr.trim();
    const parts = cleanDate.split(/[\/\-]/);
    if (parts.length !== 3) return null;

    let day, month, year;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }

    // Tách giờ bắt đầu từ "10h00-12h00" hoặc "10:00 - 12:00" hoặc "10h00"
    const startPart = timeStr.trim().split(/[\-–~]/)[0].trim();
    const timeMatch = startPart.match(/(\d{1,2})[h:\.](\d{1,2})/i);
    let hours = 7;
    let minutes = 30;
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
    }

    const d = new Date(year, month, day, hours, minutes, 0, 0);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

/**
 * Định dạng thời gian còn lại tới giờ thi hoặc giờ nhắc nhở
 */
export function getExamTimeStatus(exam, defaultReminderMinutes = 30, now = new Date()) {
  const startDate = parseExamStartTime(exam.date, exam.time);
  if (!startDate) {
    return {
      valid: false,
      isPast: false,
      isReminderReached: false,
      diffMs: 0,
      countdownText: 'Chưa xác định thời gian',
      reminderTimeText: '--:--',
    };
  }

  const reminderMins =
    exam.customReminderMinutes !== null && exam.customReminderMinutes !== undefined
      ? Number(exam.customReminderMinutes)
      : Number(defaultReminderMinutes);

  const reminderDate = new Date(startDate.getTime() - reminderMins * 60 * 1000);
  const diffMs = startDate.getTime() - now.getTime();
  const diffToReminderMs = reminderDate.getTime() - now.getTime();

  const pad = (n) => String(n).padStart(2, '0');
  const reminderTimeText = `${pad(reminderDate.getHours())}:${pad(reminderDate.getMinutes())} ngày ${pad(reminderDate.getDate())}/${pad(reminderDate.getMonth() + 1)}`;

  if (diffMs <= 0) {
    return {
      valid: true,
      isPast: true,
      isReminderReached: false,
      diffMs,
      diffToReminderMs,
      reminderMins,
      startDate,
      reminderDate,
      countdownText: 'Đã đến / Qua giờ thi',
      reminderTimeText,
    };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  const secs = Math.floor((diffMs % 60000) / 1000);

  let countdownText = '';
  if (days > 0) {
    countdownText = `Còn ${days} ngày ${hours} giờ ${mins} phút`;
  } else if (hours > 0) {
    countdownText = `Còn ${hours} giờ ${mins} phút ${secs}s`;
  } else {
    countdownText = `Còn ${mins} phút ${secs} giây`;
  }

  // Đã bước vào khung thời gian nhắc nhở (từ thời điểm reminderDate đến lúc thi)
  const isReminderReached = diffToReminderMs <= 0 && diffMs > 0;

  return {
    valid: true,
    isPast: false,
    isReminderReached,
    diffMs,
    diffToReminderMs,
    reminderMins,
    startDate,
    reminderDate,
    countdownText,
    reminderTimeText,
  };
}

/**
 * Bóc tách dữ liệu lịch thi từ fap.fpt.edu.vn (hỗ trợ cả dạng bảng Table, dạng thẻ Card tiếng Anh/Việt)
 */
export function parseFapExamScheduleRaw(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return [];

  const cleanText = rawInput
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, '\t')
    .replace(/<\/th>/gi, '\t')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .trim();

  const lines = cleanText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results = [];

  const parseSubject = (subRaw) => {
    if (!subRaw) return { code: 'MÔN THI', name: 'Môn thi FPT' };
    const clean = subRaw.replace(/^(MÔN\s*THI|MÔN|SUBJECT)[:\s]*/i, '').trim();
    const parts = clean.split(/\s*[-–]\s*/);
    const code = parts[0].trim().toUpperCase();
    const name = parts.slice(1).join(' - ').trim() || clean;
    return { code, name };
  };

  // 1. Kiểm tra định dạng 1 dòng có Tab hoặc nhiều khoảng trắng (Table row)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    const timeMatch = line.match(/(\d{1,2}[h:]\d{2}\s*[\-–]\s*\d{1,2}[h:]\d{2})/i);
    if (dateMatch && timeMatch && (line.includes('\t') || line.split(/\s{2,}/).length >= 4)) {
      const cols = line.split(/\t+|\s{2,}/).map((c) => c.trim()).filter(Boolean);
      const dateIdx = cols.findIndex((c) => /\d{2}\/\d{2}\/\d{4}/.test(c));
      const timeIdx = cols.findIndex((c) => /\d{1,2}[h:]\d{2}\s*[\-–]\s*\d{1,2}[h:]\d{2}/i.test(c));
      if (dateIdx !== -1 && timeIdx !== -1) {
        const room = cols[timeIdx + 1] || 'BE-212';
        const subRaw = cols[timeIdx + 2] || '';
        const { code, name } = parseSubject(subRaw);
        const format = cols[timeIdx + 3] || 'Practical_Exam (PEA client)';
        const type = cols[timeIdx + 4] || 'PE';
        const pubDateMatch = (cols[timeIdx + 5] || '').match(/\d{2}\/\d{2}\/\d{4}/);

        results.push({
          id: `fap_row_${code}_${dateMatch[1].replace(/\D/g, '')}_${timeMatch[1].replace(/\D/g, '').slice(0, 4)}_${results.length}`,
          date: dateMatch[1],
          time: timeMatch[1].replace(/\s+/g, ''),
          room,
          subjectCode: code,
          subjectName: name,
          examForm: format,
          examType: type,
          publishDate: pubDateMatch ? pubDateMatch[0] : '',
          note: '',
          reminderEnabled: true,
          customReminderMinutes: null,
          notified: false,
        });
      }
    }
  }

  if (results.length > 0) return results;

  // 2. Kiểm tra định dạng Thẻ Card (Mobile: Label -> Value)
  let currentCard = null;
  let currentLabel = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const u = line.toUpperCase();

    if (/^(DATE|NGÀY)$/i.test(line) || u.startsWith('DATE:') || u.startsWith('NGÀY:')) {
      if (currentCard && currentCard.date && (currentCard.subjectCode || currentCard.time)) {
        results.push(currentCard);
      }
      currentCard = {
        date: '',
        time: '',
        room: '',
        subjectCode: '',
        subjectName: '',
        examForm: 'Practical_Exam (PEA client)',
        examType: 'PE',
        publishDate: '',
        note: '',
        reminderEnabled: true,
        customReminderMinutes: null,
        notified: false,
      };
      currentLabel = 'date';
      const inlineVal = line.replace(/^(DATE|NGÀY)[:\s]*/i, '').trim();
      if (inlineVal && /\d{2}\/\d{2}\/\d{4}/.test(inlineVal)) currentCard.date = inlineVal;
      continue;
    }

    if (currentCard) {
      if (/^(TIME|THỜI GIAN|GIỜ)$/i.test(line) || u.startsWith('TIME:') || u.startsWith('THỜI GIAN:')) {
        currentLabel = 'time';
        const inlineVal = line.replace(/^(TIME|THỜI GIAN|GIỜ)[:\s]*/i, '').trim();
        if (inlineVal && /\d{1,2}[h:]\d{2}/i.test(inlineVal)) currentCard.time = inlineVal.replace(/\s+/g, '');
      } else if (/^(ROOM|PHÒNG|PHÒNG THI)$/i.test(line) || u.startsWith('ROOM:') || u.startsWith('PHÒNG:')) {
        currentLabel = 'room';
        const inlineVal = line.replace(/^(ROOM|PHÒNG|PHÒNG THI)[:\s]*/i, '').trim();
        if (inlineVal) currentCard.room = inlineVal;
      } else if (/^(MÔN\s*THI|MÔN|SUBJECT)$/i.test(line) || u.startsWith('MÔN THI:') || u.startsWith('MÔN:') || u.startsWith('SUBJECT:')) {
        currentLabel = 'subject';
        const inlineVal = line.replace(/^(MÔN\s*THI|MÔN|SUBJECT)[:\s]*/i, '').trim();
        if (inlineVal && inlineVal !== line) {
          const { code, name } = parseSubject(inlineVal);
          currentCard.subjectCode = code;
          currentCard.subjectName = name;
        }
      } else if (/^(HÌNH\s*THỨC\s*THI|HÌNH\s*THỨC|EXAM\s*FORMAT)$/i.test(line) || u.startsWith('HÌNH THỨC:') || u.startsWith('EXAM FORMAT:')) {
        currentLabel = 'format';
        const inlineVal = line.replace(/^(HÌNH\s*THỨC\s*THI|HÌNH\s*THỨC|EXAM\s*FORMAT)[:\s]*/i, '').trim();
        if (inlineVal && inlineVal !== line) currentCard.examForm = inlineVal;
      } else if (/^(LOẠI\s*THI|EXAM\s*TYPE)$/i.test(line) || u.startsWith('LOẠI THI:') || u.startsWith('EXAM TYPE:')) {
        currentLabel = 'type';
        const inlineVal = line.replace(/^(LOẠI\s*THI|EXAM\s*TYPE)[:\s]*/i, '').trim();
        if (inlineVal && inlineVal !== line) currentCard.examType = inlineVal;
      } else if (/^(NGÀY\s*CÔNG\s*BỐ\s*ĐIỂM|NGÀY\s*CÔNG\s*BỐ|GRADE\s*PUBLICATION\s*DATE)$/i.test(line) || u.startsWith('NGÀY CÔNG BỐ:')) {
        currentLabel = 'publishDate';
        const inlineVal = line.replace(/^(NGÀY\s*CÔNG\s*BỐ\s*ĐIỂM|NGÀY\s*CÔNG\s*BỐ|GRADE\s*PUBLICATION\s*DATE)[:\s]*/i, '').trim();
        if (inlineVal && /\d{2}\/\d{2}\/\d{4}/.test(inlineVal)) currentCard.publishDate = inlineVal;
      } else if (/^(GHI\s*CHÚ\s*ĐIỂM\s*DANH|ATTENDANCE\s*NOTE|GHI\s*CHÚ|NOTE)$/i.test(line)) {
        currentLabel = 'note';
      } else {
        if (currentLabel === 'date' && !currentCard.date) {
          const m = line.match(/\d{2}\/\d{2}\/\d{4}/);
          if (m) currentCard.date = m[0];
        } else if (currentLabel === 'time' && !currentCard.time) {
          const m = line.match(/\d{1,2}[h:]\d{2}\s*[\-–]\s*\d{1,2}[h:]\d{2}/i);
          if (m) currentCard.time = m[0].replace(/\s+/g, '');
        } else if (currentLabel === 'room' && !currentCard.room) {
          currentCard.room = line;
        } else if (currentLabel === 'subject' && !currentCard.subjectCode) {
          const { code, name } = parseSubject(line);
          currentCard.subjectCode = code;
          currentCard.subjectName = name;
        } else if (currentLabel === 'format' && !currentCard.examForm) {
          currentCard.examForm = line;
        } else if (currentLabel === 'type' && !currentCard.examType) {
          currentCard.examType = line;
        } else if (currentLabel === 'publishDate' && !currentCard.publishDate) {
          const m = line.match(/\d{2}\/\d{2}\/\d{4}/);
          if (m) currentCard.publishDate = m[0];
        }
      }
    }
  }

  if (currentCard && currentCard.date && (currentCard.subjectCode || currentCard.time)) {
    results.push(currentCard);
  }

  if (results.length > 0) {
    return results.map((item, idx) => ({
      ...item,
      id: item.id || `fap_card_${item.subjectCode || 'sub'}_${item.date.replace(/\D/g, '')}_${idx}`,
    }));
  }

  // 3. Kiểm tra định dạng khối phẳng tuần tự (Desktop copy: Ngày -> Giờ -> Phòng -> Môn -> ...)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{4})$/);
    if (dateMatch && i + 1 < lines.length) {
      const timeMatch = lines[i + 1].match(/^(\d{1,2}[h:]\d{2}\s*[\-–]\s*\d{1,2}[h:]\d{2})$/i);
      if (timeMatch) {
        const date = dateMatch[1];
        const time = timeMatch[1].replace(/\s+/g, '');
        const room = lines[i + 2] || 'BE-212';
        const subRaw = lines[i + 3] || 'Môn thi';
        const { code, name } = parseSubject(subRaw);
        const format = lines[i + 4] || 'Practical_Exam (PEA client)';
        const type = lines[i + 5] || 'PE';
        const pubDateMatch = (lines[i + 6] || '').match(/\d{2}\/\d{2}\/\d{4}/);
        const publishDate = pubDateMatch ? pubDateMatch[0] : '';

        results.push({
          id: `fap_flat_${code}_${date.replace(/\D/g, '')}_${time.replace(/\D/g, '').slice(0, 4)}_${results.length}`,
          date,
          time,
          room,
          subjectCode: code,
          subjectName: name,
          examForm: format,
          examType: type,
          publishDate,
          note: '',
          reminderEnabled: true,
          customReminderMinutes: null,
          notified: false,
        });

        i += 5;
      }
    }
  }

  return results;
}

/**
 * Bóc tách thông tin sinh viên từ văn bản copy từ trang FAP
 */
export function parseFapStudentInfo(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  let studentName = '';
  let studentId = '';
  let campus = 'Cơ sở Hà Nội (HN)';

  const campusMatch = rawInput.match(/Cơ sở\s+([^\n\r\(\)]+)\s*\(([A-Z]{2,3})\)/i);
  if (campusMatch) campus = campusMatch[0].trim();

  const userBlockMatch = rawInput.match(/\[([A-Z]{2})([^\[\]\d]+)([A-Z]{2}\d{5,7})\]/i);
  if (userBlockMatch) {
    studentName = userBlockMatch[2].trim();
    studentId = userBlockMatch[3].trim().toUpperCase();
  } else {
    const rollMatch = rawInput.match(/\b([A-Z]{2}\d{5,7})\b/i);
    if (rollMatch) studentId = rollMatch[1].toUpperCase();
    const nameMatch = rawInput.match(/THÔNG TIN SINH VIÊN[\s\n]+([^\n\r]+)/i);
    if (nameMatch) studentName = nameMatch[1].trim();
  }

  if (!studentId && !studentName) return null;

  return {
    name: studentName || 'Sinh Viên FPT',
    studentId: studentId || 'HE180000',
    program: 'BIT_SE_19C_NJ',
    campus,
    email: `${(studentId || 'he180000').toLowerCase()}@fpt.edu.vn`,
    status: 'HD',
    cohort: '19',
  };
}

/**
 * Script JS tự động chèn vào WebView trên trang fap.fpt.edu.vn/ExamSchedule để đọc bảng lịch thi
 */
export const FAP_WEBVIEW_EXTRACTOR_JS = `
(function() {
  try {
    var rows = document.querySelectorAll('table tbody tr, table tr');
    var extracted = [];
    rows.forEach(function(tr) {
      var cells = tr.querySelectorAll('td');
      if (cells && cells.length >= 4) {
        var rowText = Array.from(cells).map(function(td) { return (td.innerText || '').trim(); }).join('\\t');
        if (/\\d{2}\\/\\d{2}\\/\\d{4}/.test(rowText)) {
          extracted.push(rowText);
        }
      }
    });

    var studentNameEl = document.querySelector('.user-name, .profile-name, h4, h5');
    var payload = {
      type: 'FAP_EXAM_DATA',
      url: window.location.href,
      rawRows: extracted.join('\\n'),
      count: extracted.length,
      pageTitle: document.title
    };
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  } catch (e) {}
  true;
})();
`;

/**
 * Phát thông báo nhắc nhở lịch thi (hỗ trợ cả Mobile Push Notification, Web Notification & In-App Alert)
 */
export async function triggerExamNotification(exam, minutesBefore) {
  const title = `🔔 Nhắc lịch thi FAP: ${exam.subjectCode} (${exam.examType})`;
  const body = `Môn ${exam.subjectCode} - ${exam.subjectName} sẽ thi lúc ${exam.time} ngày ${exam.date} tại phòng ${exam.room} (nhắc trước ${minutesBefore} phút).`;

  // 1. Hiển thị Alert trong ứng dụng
  Alert.alert(title, body, [{ text: 'Đã chuẩn bị sẵn sàng!', style: 'default' }]);

  // 2. Nếu chạy trên Web và trình duyệt hỗ trợ Notification API
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted') {
          new window.Notification(title, { body });
        } else if (window.Notification.permission !== 'denied') {
          const perm = await window.Notification.requestPermission();
          if (perm === 'granted') {
            new window.Notification(title, { body });
          }
        }
      }
    } catch {}
    return;
  }

  // 3. Trên Mobile (iOS / Android): Gửi Local Push Notification qua expo-notifications
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus === 'granted') {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('fap_alerts', {
            name: 'FAP Cảnh báo & Lịch thi',
            description: 'Thông báo nhắc lịch thi, cảnh báo vắng mặt và điểm số FAP',
            importance: 5,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
            enableVibrate: true,
          });
        } catch {}
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          channelId: 'fap_alerts',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Phát ngay lập tức
      });
    }
  } catch (err) {
    console.warn('[FAP Reminder] Không thể phát Push Notification:', err?.message);
  }
}

/**
 * Hủy tất cả các thông báo nhắc thi đã lên lịch của hệ điều hành
 */
export async function cancelAllExamNativeNotifications() {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content?.data?.type === 'FAP_EXAM_REMINDER') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('[FAP Exam Reminder] Lỗi hủy thông báo cũ:', err?.message);
  }
}

/**
 * Lên lịch thông báo hệ thống Native cho TẤT CẢ các môn thi trong tương lai.
 * Chạy ở cấp OS (dù tắt app hoàn toàn / restart máy vẫn đổ chuông chuẩn từng giây).
 * 2 mốc nhắc:
 * 1. Mốc tối hôm trước: 19h00 ngày hôm trước (t-1 day at 19:00).
 * 2. Mốc trước giờ thi: trước X phút (mặc định defaultReminderMins).
 */
export async function scheduleAllExamRemindersNative(exams = [], defaultReminderMins = 60) {
  if (Platform.OS === 'web' || !Array.isArray(exams) || exams.length === 0) {
    return { scheduledCount: 0 };
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') {
      return { scheduledCount: 0, reason: 'permission_denied' };
    }

    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('fap_alerts', {
          name: 'FAP Cảnh báo & Lịch thi',
          description: 'Thông báo nhắc lịch thi, cảnh báo vắng mặt và điểm số FAP',
          importance: 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });
      } catch {}
    }

    // Xóa lịch cũ trước khi tạo lại để tránh duplicate
    await cancelAllExamNativeNotifications();

    const now = new Date();
    let scheduledCount = 0;

    for (const exam of exams) {
      if (exam.reminderEnabled === false) continue;

      const startDate = parseExamStartTime(exam.date, exam.time);
      if (!startDate || startDate.getTime() <= now.getTime()) continue;

      const reminderMins =
        exam.customReminderMinutes != null
          ? Number(exam.customReminderMinutes)
          : Number(defaultReminderMins) || 60;

      // 1. Mốc 19h00 tối hôm trước ngày thi
      const eveningBefore = new Date(startDate);
      eveningBefore.setDate(eveningBefore.getDate() - 1);
      eveningBefore.setHours(19, 0, 0, 0);

      if (eveningBefore.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 Lịch thi ngày mai: ${exam.subjectCode} (${exam.examType || 'Thi'})`,
            body: `Ngày mai (${exam.date}) bạn có lịch thi môn ${exam.subjectName || exam.subjectCode} lúc ${exam.time} tại phòng ${exam.room || '-'}. Chúc bạn làm bài thật tốt!`,
            sound: true,
            channelId: 'fap_alerts',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
            data: {
              type: 'FAP_EXAM_REMINDER',
              examId: exam.id,
              subjectCode: exam.subjectCode,
              room: exam.room,
              time: exam.time,
              date: exam.date,
              subType: 'evening_before',
            },
          },
          trigger: {
            type: 'date',
            date: eveningBefore,
          },
        });
        scheduledCount++;
      }

      // 2. Mốc trước giờ thi X phút
      const beforeExam = new Date(startDate.getTime() - reminderMins * 60 * 1000);
      if (beforeExam.getTime() > now.getTime()) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏳ Sắp đến giờ thi: ${exam.subjectCode} (${exam.room ? 'Phòng ' + exam.room : exam.time})`,
            body: `Môn ${exam.subjectCode} sẽ bắt đầu lúc ${exam.time} (còn ${reminderMins} phút). Hãy mang theo thẻ sinh viên và có mặt trước cửa phòng thi!`,
            sound: true,
            channelId: 'fap_alerts',
            priority: Notifications.AndroidNotificationPriority.MAX,
            vibrate: [0, 500, 200, 500],
            data: {
              type: 'FAP_EXAM_REMINDER',
              examId: exam.id,
              subjectCode: exam.subjectCode,
              room: exam.room,
              time: exam.time,
              date: exam.date,
              subType: 'before_exam',
            },
          },
          trigger: {
            type: 'date',
            date: beforeExam,
          },
        });
        scheduledCount++;
      }
    }

    return { scheduledCount };
  } catch (err) {
    console.warn('[FAP Exam Native Reminder] Lỗi lên lịch thi:', err?.message);
    return { scheduledCount: 0, error: err?.message };
  }
}


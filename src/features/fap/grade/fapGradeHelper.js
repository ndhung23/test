// src/features/fap/fapGradeHelper.js
// Bộ công cụ quản lý Bảng điểm FAP, phát hiện biến động điểm & cảnh báo cập nhật điểm

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';

/**
 * Trạng thái môn học
 */
export const GRADE_STATUS = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  IN_PROGRESS: 'In Progress',
};

/**
 * Dữ liệu mẫu bảng điểm sinh viên FPT để thử nghiệm ngoại tuyến hoặc demo
 */
export const SAMPLE_GRADES = [
  {
    id: 'grade_SWD392',
    subjectCode: 'SWD392',
    subjectName: 'Software Architecture and Design',
    credits: 3,
    term: 'Fall 2026',
    averageMark: 8.4,
    status: GRADE_STATUS.PASSED,
    lastUpdated: '24/10/2026 14:30',
    components: [
      { name: 'Progress Test 1', weight: '10%', value: 8.5, comment: 'Đạt yêu cầu' },
      { name: 'Progress Test 2', weight: '10%', value: 9.0, comment: 'Tốt' },
      { name: 'Assignment (Lab)', weight: '20%', value: 8.0, comment: 'Đầy đủ chức năng' },
      { name: 'Practical Exam (PE)', weight: '30%', value: 8.5, comment: 'PEA Client pass' },
      { name: 'Final Exam (FE)', weight: '30%', value: 8.2, comment: 'EOS Client pass' },
    ],
  },
  {
    id: 'grade_MMA301',
    subjectCode: 'MMA301',
    subjectName: 'Mobile Multiplatform Applications with React Native',
    credits: 3,
    term: 'Fall 2026',
    averageMark: 8.8,
    status: GRADE_STATUS.PASSED,
    lastUpdated: '24/10/2026 10:15',
    components: [
      { name: 'Progress Test 1', weight: '10%', value: 9.0, comment: 'Xuất sắc' },
      { name: 'Progress Test 2', weight: '10%', value: 8.5, comment: 'Đạt' },
      { name: 'Assignment (Project)', weight: '20%', value: 9.2, comment: 'ToolKit app hoàn thiện cao' },
      { name: 'Practical Exam (PE)', weight: '30%', value: 8.8, comment: 'PEA pass' },
      { name: 'Final Exam (FE)', weight: '30%', value: 8.5, comment: 'EOS pass' },
    ],
  },
  {
    id: 'grade_SDN302',
    subjectCode: 'SDN302',
    subjectName: 'Server-Side Development with NodeJS, Express, MongoDB',
    credits: 3,
    term: 'Fall 2026',
    averageMark: null,
    status: GRADE_STATUS.IN_PROGRESS,
    lastUpdated: '23/10/2026 16:40',
    components: [
      { name: 'Progress Test 1', weight: '10%', value: 8.0, comment: 'Đạt' },
      { name: 'Progress Test 2', weight: '10%', value: 7.5, comment: 'Đạt' },
      { name: 'Lab Assignment', weight: '20%', value: 8.5, comment: 'Pass Unit Test' },
      { name: 'Practical Exam (PE)', weight: '30%', value: null, comment: 'Chưa thi / Chưa có điểm' },
      { name: 'Final Exam (FE)', weight: '30%', value: null, comment: 'Chưa thi / Chưa có điểm' },
    ],
  },
  {
    id: 'grade_PRM392',
    subjectCode: 'PRM392',
    subjectName: 'Mobile Programming with Android',
    credits: 3,
    term: 'Fall 2026',
    averageMark: 7.9,
    status: GRADE_STATUS.PASSED,
    lastUpdated: '22/10/2026 11:20',
    components: [
      { name: 'Progress Test 1', weight: '10%', value: 7.5, comment: 'Đạt' },
      { name: 'Progress Test 2', weight: '10%', value: 8.0, comment: 'Đạt' },
      { name: 'Assignment', weight: '20%', value: 8.5, comment: 'Tốt' },
      { name: 'Practical Exam (PE)', weight: '30%', value: 7.8, comment: 'Pass' },
      { name: 'Final Exam (FE)', weight: '30%', value: 7.7, comment: 'Pass' },
    ],
  },
];

/**
 * Tính tổng quan GPA và tiến độ học kỳ
 */
export function calculateGpaSummary(grades = []) {
  if (!Array.isArray(grades) || grades.length === 0) {
    return {
      gpa: 0,
      totalCredits: 0,
      passedCredits: 0,
      passedCount: 0,
      failedCount: 0,
      inProgressCount: 0,
      totalCourses: 0,
    };
  }

  let totalWeightedScore = 0;
  let totalCreditsWithGrade = 0;
  let totalCredits = 0;
  let passedCredits = 0;
  let passedCount = 0;
  let failedCount = 0;
  let inProgressCount = 0;

  grades.forEach((g) => {
    const cred = Number(g.credits) || 3;
    totalCredits += cred;

    const avg = Number(g.averageMark);
    const hasAvg = !isNaN(avg) && avg !== null && g.averageMark !== '' && g.averageMark !== undefined;

    if (g.status === GRADE_STATUS.PASSED || (hasAvg && avg >= 5.0)) {
      passedCount += 1;
      passedCredits += cred;
    } else if (g.status === GRADE_STATUS.FAILED || (hasAvg && avg < 5.0)) {
      failedCount += 1;
    } else {
      inProgressCount += 1;
    }

    if (hasAvg) {
      totalWeightedScore += avg * cred;
      totalCreditsWithGrade += cred;
    }
  });

  const gpa = totalCreditsWithGrade > 0 ? (totalWeightedScore / totalCreditsWithGrade).toFixed(2) : '0.00';

  return {
    gpa: parseFloat(gpa),
    totalCredits,
    passedCredits,
    passedCount,
    failedCount,
    inProgressCount,
    totalCourses: grades.length,
  };
}

/**
 * So sánh bảng điểm cũ và bảng điểm mới để phát hiện các đầu điểm vừa được cập nhật
 * @param {Array} oldGrades Bảng điểm đã lưu trước đó trong SecureStore
 * @param {Array} newGrades Bảng điểm vừa bóc tách từ FAP
 * @returns {Array} Danh sách môn và các đầu điểm vừa thay đổi
 */
export function detectGradeUpdates(oldGrades = [], newGrades = []) {
  if (!Array.isArray(newGrades) || newGrades.length === 0) return [];
  if (!Array.isArray(oldGrades) || oldGrades.length === 0) {
    // Lần đầu tiên cào -> Không kích hoạt spam thông báo toàn bộ
    return [];
  }

  const oldMap = new Map();
  oldGrades.forEach((g) => {
    if (g.subjectCode) oldMap.set(g.subjectCode.toUpperCase(), g);
  });

  const updates = [];

  newGrades.forEach((newCourse) => {
    const code = (newCourse.subjectCode || '').toUpperCase();
    if (!code) return;

    const oldCourse = oldMap.get(code);
    if (!oldCourse) {
      // Môn mới xuất hiện hoàn toàn
      updates.push({
        subjectCode: code,
        subjectName: newCourse.subjectName || code,
        type: 'NEW_COURSE',
        detail: `Môn mới ${code} đã được cập nhật vào bảng điểm.`,
        newCourse,
      });
      return;
    }

    const changedComponents = [];

    // So sánh từng đầu điểm thành phần
    const oldComponents = Array.isArray(oldCourse.components) ? oldCourse.components : [];
    const newComponents = Array.isArray(newCourse.components) ? newCourse.components : [];

    const oldCompMap = new Map();
    oldComponents.forEach((c) => {
      if (c.name) oldCompMap.set(c.name.trim().toLowerCase(), c);
    });

    newComponents.forEach((nc) => {
      const key = (nc.name || '').trim().toLowerCase();
      const oc = oldCompMap.get(key);

      const oldVal = oc && oc.value !== null && oc.value !== undefined ? String(oc.value).trim() : null;
      const newVal = nc.value !== null && nc.value !== undefined ? String(nc.value).trim() : null;

      if (newVal !== null && newVal !== '' && newVal !== oldVal) {
        changedComponents.push({
          componentName: nc.name,
          oldValue: oldVal,
          newValue: newVal,
          weight: nc.weight,
        });
      }
    });

    // So sánh điểm trung bình môn (Average Mark)
    const oldAvg = oldCourse.averageMark !== null && oldCourse.averageMark !== undefined ? String(oldCourse.averageMark).trim() : null;
    const newAvg = newCourse.averageMark !== null && newCourse.averageMark !== undefined ? String(newCourse.averageMark).trim() : null;
    let avgChanged = false;
    if (newAvg !== null && newAvg !== '' && newAvg !== oldAvg) {
      avgChanged = true;
    }

    // So sánh trạng thái (Passed / Failed / In Progress)
    const statusChanged = oldCourse.status !== newCourse.status && newCourse.status;

    if (changedComponents.length > 0 || avgChanged || statusChanged) {
      updates.push({
        subjectCode: code,
        subjectName: newCourse.subjectName || code,
        type: 'UPDATED',
        changedComponents,
        oldAverage: oldAvg,
        newAverage: newAvg,
        avgChanged,
        oldStatus: oldCourse.status,
        newStatus: newCourse.status,
        statusChanged,
        newCourse,
      });
    }
  });

  return updates;
}

/**
 * Kích hoạt thông báo đẩy & popup khi có điểm môn học vừa cập nhật
 * @param {Array} updates Danh sách môn có điểm cập nhật từ detectGradeUpdates
 */
export async function triggerGradeUpdateNotification(updates = []) {
  if (!Array.isArray(updates) || updates.length === 0) return;

  for (const update of updates) {
    const code = update.subjectCode;
    let detailLines = [];

    if (Array.isArray(update.changedComponents) && update.changedComponents.length > 0) {
      update.changedComponents.forEach((c) => {
        const oldDesc = c.oldValue ? `(cũ: ${c.oldValue})` : '(mới lên)';
        detailLines.push(`• ${c.componentName}: ${c.newValue} ${oldDesc}`);
      });
    }

    if (update.avgChanged) {
      detailLines.push(`• Điểm trung bình: ${update.newAverage} ${update.oldAverage ? `(cũ: ${update.oldAverage})` : ''}`);
    }

    if (update.statusChanged) {
      detailLines.push(`• Trạng thái môn: ${update.newStatus}`);
    }

    const title = `📢 FAP CẬP NHẬT ĐIỂM: Môn ${code}`;
    const body = detailLines.length > 0
      ? `Môn ${code} vừa có cập nhật điểm số:\n${detailLines.join('\n')}`
      : `Môn ${code} vừa có dữ liệu điểm mới trên FAP.`;

    // 1. Alert trong ứng dụng
    Alert.alert(title, body, [{ text: 'Xem bảng điểm', style: 'default' }]);

    // 2. Trình duyệt Web nếu được hỗ trợ
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (window.Notification.permission === 'granted') {
            new window.Notification(title, { body });
          } else if (window.Notification.permission !== 'denied') {
            const perm = await window.Notification.requestPermission();
            if (perm === 'granted') new window.Notification(title, { body });
          }
        }
      } catch {}
      continue;
    }

    // 3. Mobile (iOS / Android) Native Notification
    try {
      const { status } = await Notifications.getPermissionsAsync();
      let finalStatus = status;
      if (status !== 'granted') {
        const req = await Notifications.requestPermissionsAsync();
        finalStatus = req.status;
      }
      if (finalStatus === 'granted') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
          },
          trigger: null,
        });
      }
    } catch (err) {
      console.warn('[FAP Grade] Không thể phát Push Notification:', err?.message);
    }
  }
}

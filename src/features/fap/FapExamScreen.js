// src/screens/tools/FapExamScreen.js
// Tiện ích: Đăng nhập cổng FAP (fap.fpt.edu.vn) -> Tự động lấy Lịch thi -> Nhắc nhở trước giờ thi

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  Image,
  AppState,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import * as SecureStore from '../../utils/storage';
import {
  getExamTimeStatus,
  triggerExamNotification,
  scheduleAllExamRemindersNative,
  FapExamListView,
  FapExamFormModal,
} from './exam';
import {
  ATTENDANCE_STATUS,
  checkSlotAbsentAlert,
  extractTodaySlotsFromCourses,
  sanitizeSlots,
  mergeSlotsWithNotifiedHistory,
  triggerAbsentNotification,
  scheduleAttendanceSlotReminders,
  findRecentlyEndedSlot,
  triggerTestSlotReminderNotification,
  FapAttendanceView,
} from './attend';
import {
  detectGradeUpdates,
  triggerGradeUpdateNotification,
  SAMPLE_GRADES,
  FapGradeView,
} from './grade';
import {
  FapAuthFlowCard,
  FapRealWebViewModal,
  FapSilentAutoChecker,
} from './auth';

const STORAGE_FAP_SESSION = 'toolkit_fap_student_session_v1';
const STORAGE_FAP_EXAMS = 'toolkit_fap_exam_list_v1';
const STORAGE_FAP_REMINDER_MINS = 'toolkit_fap_reminder_mins_v1';
const STORAGE_FAP_ATTENDANCE_SLOTS = 'toolkit_fap_attendance_slots_v1';
const STORAGE_FAP_ABSENT_ALERT_ENABLED = 'toolkit_fap_absent_alert_v1';
const STORAGE_FAP_COURSES = 'toolkit_fap_courses_v1';
const STORAGE_FAP_GRADES = 'toolkit_fap_grades_v1';

export default function FapExamScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const [fapUser, setFapUser] = useState(null);
  const [exams, setExams] = useState([]);
  const [grades, setGrades] = useState([]);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'exam' | 'grade'
  const [courses, setCourses] = useState([]); // Danh sách môn học Full kỳ (20-30 buổi từ Report/Attendance)
  const [todaySlots, setTodaySlots] = useState([]); // Không mock data - cào thật từ FAP!
  const [absentAlertEnabled, setAbsentAlertEnabled] = useState(true);
  const [realWebViewVisible, setRealWebViewVisible] = useState(false);
  const [webViewTarget, setWebViewTarget] = useState('attendance'); // 'exam' | 'timetable' | 'attendance' | 'grade'
  const [timetableRefDate, setTimetableRefDate] = useState(null);
  const [defaultReminderMins, setDefaultReminderMins] = useState(30);
  const [customMinsInput, setCustomMinsInput] = useState('30');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [now, setNow] = useState(() => new Date());

  // Trạng thái Silent Auto-Fetch kiểm tra điểm danh FAP ngầm
  const [isSilentChecking, setIsSilentChecking] = useState(false);
  const [silentCheckStatus, setSilentCheckStatus] = useState('');

  const examsRef = useRef(exams);
  const gradesRef = useRef(grades);
  const coursesRef = useRef(courses);
  const defaultMinsRef = useRef(defaultReminderMins);
  const todaySlotsRef = useRef(todaySlots);
  const absentAlertRef = useRef(absentAlertEnabled);

  useEffect(() => {
    examsRef.current = exams;
    gradesRef.current = grades;
    coursesRef.current = courses;
    defaultMinsRef.current = defaultReminderMins;
    todaySlotsRef.current = todaySlots;
    absentAlertRef.current = absentAlertEnabled;
  }, [exams, grades, courses, defaultReminderMins, todaySlots, absentAlertEnabled]);

  // 1. Khôi phục phiên đăng nhập FAP, lịch thi, điểm danh & cấu hình thời gian nhắc từ bộ nhớ
  useEffect(() => {
    (async () => {
      try {
        const [savedSession, savedExams, savedMins, savedSlots, savedAlertToggle, savedCourses, savedGrades] = await Promise.all([
          SecureStore.getItemAsync(STORAGE_FAP_SESSION),
          SecureStore.getItemAsync(STORAGE_FAP_EXAMS),
          SecureStore.getItemAsync(STORAGE_FAP_REMINDER_MINS),
          SecureStore.getItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS),
          SecureStore.getItemAsync(STORAGE_FAP_ABSENT_ALERT_ENABLED),
          SecureStore.getItemAsync(STORAGE_FAP_COURSES),
          SecureStore.getItemAsync(STORAGE_FAP_GRADES),
        ]);

        if (savedSession) {
          setFapUser(JSON.parse(savedSession));
        }
        if (savedExams) {
          const parsedExams = JSON.parse(savedExams);
          if (Array.isArray(parsedExams) && parsedExams.length > 0) {
            setExams(parsedExams);
          }
        }
        if (savedGrades) {
          const parsedGrades = JSON.parse(savedGrades);
          if (Array.isArray(parsedGrades) && parsedGrades.length > 0) {
            setGrades(parsedGrades);
          }
        }
        if (savedCourses) {
          const parsedCourses = JSON.parse(savedCourses);
          if (Array.isArray(parsedCourses) && parsedCourses.length > 0) {
            setCourses(parsedCourses);
          }
        }
        if (savedMins) {
          const minsNum = parseInt(savedMins, 10);
          if (!isNaN(minsNum) && minsNum > 0) {
            setDefaultReminderMins(minsNum);
            setCustomMinsInput(String(minsNum));
          }
        }
        if (savedSlots) {
          const parsedSlots = JSON.parse(savedSlots);
          if (Array.isArray(parsedSlots) && parsedSlots.length > 0) {
            const clean = mergeSlotsWithNotifiedHistory(parsedSlots, []);
            setTodaySlots(clean);
            if (JSON.stringify(clean) !== savedSlots) {
              await SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(clean));
            }
          }
        }
        if (savedAlertToggle !== null && savedAlertToggle !== undefined) {
          setAbsentAlertEnabled(savedAlertToggle === 'true');
        }
      } catch (e) {
        console.warn('[FAP Exam] Lỗi đọc dữ liệu lưu trữ:', e);
      }
    })();
  }, []);

  // 2. Bộ đếm thời gian thực mỗi giây để cập nhật Countdown & kích hoạt thông báo khi đến giờ nhắc
  useEffect(() => {
    const timer = setInterval(() => {
      const currentTick = new Date();
      setNow(currentTick);

      // Chỉ kiểm tra nhắc nhở khi người dùng đã đăng nhập FAP
      if (!fapUser) return;

      let hasTriggeredChange = false;
      const updatedList = examsRef.current.map((exam) => {
        if (!exam.reminderEnabled || exam.notified) return exam;

        const status = getExamTimeStatus(exam, defaultMinsRef.current, currentTick);
        if (status.valid && status.isReminderReached) {
          hasTriggeredChange = true;
          triggerExamNotification(exam, status.reminderMins);
          return { ...exam, notified: true };
        }
        return exam;
      });

      if (hasTriggeredChange) {
        setExams(updatedList);
        SecureStore.setItemAsync(STORAGE_FAP_EXAMS, JSON.stringify(updatedList));
      }

      // Kiểm tra Cảnh báo Vắng (Absent Alert): Cuối ca học + 10 phút
      if (absentAlertRef.current) {
        let hasSlotTriggered = false;
        const updatedSlots = todaySlotsRef.current.map((slot) => {
          if (slot.notified) return slot;
          const check = checkSlotAbsentAlert(slot, currentTick);
          if (check.shouldAlert) {
            hasSlotTriggered = true;
            triggerAbsentNotification(slot);
            return { ...slot, notified: true };
          }
          if (check.isExpiredPast) {
            hasSlotTriggered = true;
            return { ...slot, notified: true };
          }
          return slot;
        });

        if (hasSlotTriggered) {
          setTodaySlots(updatedSlots);
          SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(updatedSlots));
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [fapUser]);

  // 3. Lắng nghe người dùng chạm vào thông báo hệ thống (+10p sau ca học)
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let sub;
    try {
      sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        if (data?.type === 'FAP_SLOT_REMINDER') {
          setActiveTab('attendance');
          setIsSilentChecking(true);
        }
      });
    } catch (err) {
      console.warn('[FapExamScreen] Notification response listener error:', err?.message);
    }

    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, []);

  // 4. Lắng nghe khi app được mở lại từ Background (App Foregrounding)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        const finishedSlot = findRecentlyEndedSlot(todaySlotsRef.current, new Date());
        if (finishedSlot && !isSilentChecking) {
          setIsSilentChecking(true);
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      if (sub && typeof sub.remove === 'function') {
        sub.remove();
      }
    };
  }, [isSilentChecking]);

  // 5. Tự động lên lịch hẹn thông báo hệ thống (+10p sau ca) ở cấp OS
  useEffect(() => {
    if (todaySlots.length > 0) {
      scheduleAttendanceSlotReminders(todaySlots, absentAlertEnabled);
    }
  }, [todaySlots, absentAlertEnabled]);

  // 6. Tự động lên lịch hẹn thông báo lịch thi cấp OS (kể cả khi đóng app)
  useEffect(() => {
    if (Array.isArray(exams) && exams.length > 0) {
      scheduleAllExamRemindersNative(exams, defaultReminderMins);
    }
  }, [exams, defaultReminderMins]);

  // Xử lý khi Silent Auto-Checker hoàn tất cào ngầm
  const handleSilentCheckComplete = async ({ liveTodaySlots, newAbsents, newPresents, user, grades: newGrades, exams: newExams }) => {
    setIsSilentChecking(false);
    setSilentCheckStatus('');

    if (user && !fapUser) {
      setFapUser(user);
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(user));
    }

    if (Array.isArray(liveTodaySlots) && liveTodaySlots.length > 0) {
      const clean = mergeSlotsWithNotifiedHistory(liveTodaySlots, todaySlotsRef.current);
      setTodaySlots(clean);
      await SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(clean));
      await scheduleAttendanceSlotReminders(clean, absentAlertEnabled);
    }

    // 1. CẢNH BÁO ABSENT: Nếu có ca học mới bị đánh VẮNG -> Báo động đỏ ngay lập tức!
    if (newAbsents && newAbsents.length > 0) {
      for (const abs of newAbsents) {
        triggerAbsentNotification(abs);
      }
    } else if (newPresents && newPresents.length > 0) {
      // 2. Nếu tất cả các ca mới đều CÓ MẶT -> Báo tin vui màu xanh!
      const slotListStr = newPresents.map((p) => `Ca ${p.slot} (${p.subjectCode})`).join(', ');
      Alert.alert(
        'Điểm danh thành công! 🎉',
        `Hệ thống đã tự động so khớp dữ liệu FAP ngầm:\n${slotListStr} đã được giảng viên điểm danh CÓ MẶT (Present)!`,
        [{ text: 'Tuyệt vời', style: 'default' }]
      );
    }

    // 2. CẬP NHẬT ĐIỂM SỐ MỚI: Tự động so sánh bảng điểm FAP
    if (Array.isArray(newGrades) && newGrades.length > 0) {
      const gradeUpdates = detectGradeUpdates(gradesRef.current, newGrades);
      if (gradeUpdates.length > 0) {
        triggerGradeUpdateNotification(gradeUpdates);
      }
      setGrades(newGrades);
      await SecureStore.setItemAsync(STORAGE_FAP_GRADES, JSON.stringify(newGrades));
    }

    // 3. CẬP NHẬT LỊCH THI MỚI: Tự động lên lịch thông báo cấp OS
    if (Array.isArray(newExams) && newExams.length > 0) {
      setExams(newExams);
      await SecureStore.setItemAsync(STORAGE_FAP_EXAMS, JSON.stringify(newExams));
      await scheduleAllExamRemindersNative(newExams, defaultMinsRef.current);
    }
  };

  const handleSilentCheckError = (errorMsg) => {
    setIsSilentChecking(false);
    setSilentCheckStatus('');
    if (errorMsg === 'CLOUDFLARE_CHALLENGE_REQUIRED') {
      Alert.alert(
        'Xác minh bảo mật FAP 🛡️',
        'Cổng FAP đang yêu cầu xác minh Cloudflare ("Xác minh bạn là con người"). Vui lòng bấm "Mở FAP ngay" để chạm xác nhận 1 lần.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Mở FAP ngay', onPress: () => setRealWebViewVisible(true) },
        ]
      );
    } else if (errorMsg) {
      console.log('[FapSilentAutoChecker] Info/Error:', errorMsg);
    }
  };

  const handleTriggerSilentCheck = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Thông báo', 'Silent Auto-Fetch hoạt động tự động trên ứng dụng di động (iOS / Android)!');
      return;
    }
    setIsSilentChecking(true);
  };

  const handleTestSlotReminder = () => {
    triggerTestSlotReminderNotification();
  };

  const persistExams = async (nextList) => {
    setExams(nextList);
    await SecureStore.setItemAsync(STORAGE_FAP_EXAMS, JSON.stringify(nextList));
    await scheduleAllExamRemindersNative(nextList, defaultReminderMins);
  };

  // Đồng bộ thành công Lịch thi thực tế từ WebView (fap.fpt.edu.vn/ExamSchedule)
  const handleRealSyncSuccess = async (userData, examList) => {
    if (userData) {
      setFapUser((prev) => ({ ...(prev || {}), ...userData }));
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(userData));
    }
    setExams(examList);
    await SecureStore.setItemAsync(STORAGE_FAP_EXAMS, JSON.stringify(examList));
    await scheduleAllExamRemindersNative(examList, defaultReminderMins);
  };

  // Đồng bộ thành công Thời khóa biểu & Điểm danh thực tế từ WebView (fap.fpt.edu.vn/WeeklyTimetable)
  const handleTimetableSyncSuccess = async (userData, slotList) => {
    const userToSave = userData || (!fapUser ? {
      name: 'Nguyễn Duy Hưng',
      studentId: 'HE190591',
      campus: 'Cơ sở Hà Nội (HN)',
      status: 'HD',
      email: 'he190591@fpt.edu.vn',
    } : null);

    if (userToSave) {
      setFapUser((prev) => ({ ...(prev || {}), ...userToSave }));
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(userToSave));
    }

    // Ghép nối ca học giữa các tuần để người dùng chuyển tuần không bị mất tuần cũ
    const prevSlots = todaySlotsRef.current || [];
    const newKeys = new Set(slotList.map((s) => `${s.date || ''}_${s.slot}_${s.subjectCode}`));
    const retainedSlots = prevSlots.filter((s) => !newKeys.has(`${s.date || ''}_${s.slot}_${s.subjectCode}`));
    const nextSlots = mergeSlotsWithNotifiedHistory([...retainedSlots, ...slotList], prevSlots);

    setTodaySlots(nextSlots);
    await SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(nextSlots));
  };

  // Đồng bộ thành công Full Lịch học & Điểm danh cả môn (/Report/Attendance)
  const handleCourseAttendanceSyncSuccess = async (userData, courseData) => {
    if (userData) {
      setFapUser((prev) => ({ ...(prev || {}), ...userData }));
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(userData));
    }

    const prevCourses = coursesRef.current || [];
    const existingIndex = prevCourses.findIndex((c) => c.courseCode === courseData.courseCode);
    let nextCourses = [];
    if (existingIndex >= 0) {
      nextCourses = [...prevCourses];
      nextCourses[existingIndex] = courseData;
    } else {
      nextCourses = [courseData, ...prevCourses];
    }

    setCourses(nextCourses);
    await SecureStore.setItemAsync(STORAGE_FAP_COURSES, JSON.stringify(nextCourses));

    // Tự động suy ra các ca học hôm nay từ toàn bộ các môn đã cào
    const derivedToday = extractTodaySlotsFromCourses(nextCourses);
    if (derivedToday.length > 0) {
      const clean = mergeSlotsWithNotifiedHistory(derivedToday, todaySlotsRef.current);
      setTodaySlots(clean);
      await SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(clean));
    }
  };

  // Xóa 1 môn khỏi danh sách đã cào
  const handleDeleteCourse = async (courseCode) => {
    const nextCourses = (coursesRef.current || []).filter((c) => c.courseCode !== courseCode);
    setCourses(nextCourses);
    await SecureStore.setItemAsync(STORAGE_FAP_COURSES, JSON.stringify(nextCourses));

    const derivedToday = extractTodaySlotsFromCourses(nextCourses);
    setTodaySlots(derivedToday);
    await SecureStore.setItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS, JSON.stringify(derivedToday));
  };

  // Đồng bộ thành công Bảng điểm thực tế từ WebView (/Report/Grade)
  const handleGradesSyncSuccess = async (userData, gradeList) => {
    if (userData) {
      setFapUser((prev) => ({ ...(prev || {}), ...userData }));
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(userData));
    }

    const prevGrades = gradesRef.current || [];
    const updates = detectGradeUpdates(prevGrades, gradeList);

    setGrades(gradeList);
    await SecureStore.setItemAsync(STORAGE_FAP_GRADES, JSON.stringify(gradeList));

    if (updates.length > 0) {
      await triggerGradeUpdateNotification(updates);
    }
  };

  // Thử nghiệm thông báo khi điểm có cập nhật mới
  const handleSimulateGradeUpdate = () => {
    const prevGrades = gradesRef.current && gradesRef.current.length > 0 ? gradesRef.current : SAMPLE_GRADES;
    const targetSubject = prevGrades[0]?.subjectCode || 'SWD392';
    const mockUpdates = [
      {
        subjectCode: targetSubject,
        subjectName: prevGrades[0]?.subjectName || targetSubject,
        type: 'UPDATED',
        changedComponents: [
          { componentName: 'Practical Exam (PE)', oldValue: '8.0', newValue: '9.0', weight: '30%' },
        ],
        oldAverage: '7.8',
        newAverage: '8.4',
        avgChanged: true,
        oldStatus: 'In Progress',
        newStatus: 'Passed',
        statusChanged: true,
      },
    ];

    triggerGradeUpdateNotification(mockUpdates);
  };

  // Đăng xuất tài khoản FAP
  const handleLogoutFap = () => {
    const doLogout = async () => {
      setFapUser(null);
      setExams([]);
      setCourses([]);
      setTodaySlots([]);
      setGrades([]);
      await Promise.all([
        SecureStore.deleteItemAsync(STORAGE_FAP_SESSION),
        SecureStore.deleteItemAsync(STORAGE_FAP_EXAMS),
        SecureStore.deleteItemAsync(STORAGE_FAP_COURSES),
        SecureStore.deleteItemAsync(STORAGE_FAP_ATTENDANCE_SLOTS),
        SecureStore.deleteItemAsync(STORAGE_FAP_GRADES),
      ]);
    };

    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm('Đăng xuất tài khoản FAP\nBạn có muốn thoát phiên FAP hiện tại để sinh viên khác đăng nhập?')
        : true;
      if (ok) doLogout();
      return;
    }

    Alert.alert(
      'Đăng xuất tài khoản FAP',
      'Bạn có muốn thoát tài khoản FAP hiện tại để sinh viên khác đăng nhập?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: doLogout },
      ]
    );
  };

  // Chọn mốc thời gian nhắc nhở mặc định
  const handleSelectPresetMins = async (mins) => {
    setDefaultReminderMins(mins);
    setCustomMinsInput(String(mins));
    await SecureStore.setItemAsync(STORAGE_FAP_REMINDER_MINS, String(mins));

    // Reset cờ notified để áp dụng mốc giờ nhắc mới
    const resetList = exams.map((e) => ({ ...e, notified: false }));
    await persistExams(resetList);
  };

  // Lưu số phút nhắc nhở do người dùng tự nhập
  const handleApplyCustomMins = async () => {
    const parsed = parseInt(customMinsInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      Alert.alert('Số phút không hợp lệ', 'Vui lòng nhập số phút lớn hơn hoặc bằng 1.');
      return;
    }
    await handleSelectPresetMins(parsed);
    Alert.alert(
      'Đã lưu thời gian nhắc',
      `Hệ thống sẽ tự động nhắc nhở trước giờ thi ${parsed} phút cho các môn thi.`
    );
  };

  // Bật / tắt chế độ cảnh báo vắng (+10p sau slot)
  const handleToggleAbsentAlert = async (val) => {
    setAbsentAlertEnabled(val);
    await SecureStore.setItemAsync(STORAGE_FAP_ABSENT_ALERT_ENABLED, String(val));
  };

  // Thử chuông cảnh báo vắng ngay lập tức
  const handleSimulateAbsentAlert = () => {
    const target = todaySlots.find((s) => s.status === ATTENDANCE_STATUS.ABSENT) || todaySlots[0];
    triggerAbsentNotification(target);
  };

  // Bật / tắt nhắc nhở cho từng môn thi
  const toggleExamReminder = async (examId) => {
    const nextList = exams.map((e) =>
      e.id === examId ? { ...e, reminderEnabled: !e.reminderEnabled, notified: false } : e
    );
    await persistExams(nextList);
  };

  // Thêm hoặc cập nhật 1 môn thi
  const handleSaveExamItem = async (examData) => {
    const exists = exams.some((e) => e.id === examData.id);
    const nextList = exists
      ? exams.map((e) => (e.id === examData.id ? examData : e))
      : [examData, ...exams];
    await persistExams(nextList);
  };

  // Nhập hàng loạt môn thi từ dữ liệu copy bảng FAP
  const handleImportExams = async (importedList, importedUser) => {
    if (importedUser && (!fapUser || fapUser.studentId !== importedUser.studentId)) {
      setFapUser(importedUser);
      await SecureStore.setItemAsync(STORAGE_FAP_SESSION, JSON.stringify(importedUser));
    }
    const existingKeys = new Set(exams.map((e) => `${e.subjectCode}_${e.date}_${e.time}`));
    const newItems = importedList.filter((e) => !existingKeys.has(`${e.subjectCode}_${e.date}_${e.time}`));
    const nextList = [...newItems, ...exams];
    await persistExams(nextList);
    Alert.alert(
      'Nhập lịch thi thành công ✅',
      `Đã bóc tách và nạp ${importedList.length} ca thi thực tế từ cổng FAP của ${importedUser?.name || fapUser?.name || 'bạn'}:\n${importedList.map((e) => `• ${e.subjectCode} (${e.time} ngày ${e.date})`).join('\n')}`
    );
  };

  // Xóa 1 môn thi khỏi danh sách
  const handleDeleteExam = (exam) => {
    Alert.alert('Xóa lịch thi', `Bạn có chắc muốn xóa lịch thi môn ${exam.subjectCode}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          const nextList = exams.filter((e) => e.id !== exam.id);
          await persistExams(nextList);
        },
      },
    ]);
  };

  const renderTabNavigation = () => (
    <View style={[styles.tabBarWrap, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Pressable
        onPress={() => setActiveTab('attendance')}
        style={[
          styles.tabItem,
          activeTab === 'attendance' && { backgroundColor: colors.primary },
        ]}
      >
        <Ionicons
          name="school-outline"
          size={15}
          color={activeTab === 'attendance' ? '#121214' : colors.sub}
        />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'attendance' ? '#121214' : colors.sub },
          ]}
        >
          {t('fap.tabAttendance') || 'Điểm danh'}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setActiveTab('exam')}
        style={[
          styles.tabItem,
          activeTab === 'exam' && { backgroundColor: colors.primary },
        ]}
      >
        <Ionicons
          name="calendar-outline"
          size={15}
          color={activeTab === 'exam' ? '#121214' : colors.sub}
        />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'exam' ? '#121214' : colors.sub },
          ]}
        >
          {t('fap.tabExam') || 'Lịch thi'} ({exams.length})
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setActiveTab('grade')}
        style={[
          styles.tabItem,
          activeTab === 'grade' && { backgroundColor: colors.primary },
        ]}
      >
        <Ionicons
          name="ribbon-outline"
          size={15}
          color={activeTab === 'grade' ? '#121214' : colors.sub}
        />
        <Text
          style={[
            styles.tabText,
            { color: activeTab === 'grade' ? '#121214' : colors.sub },
          ]}
        >
          {t('fap.tabGrade') || 'Bảng điểm'} ({grades.length})
        </Text>
      </Pressable>
    </View>
  );

  const renderStudentHeaderAndTabs = () => {
    if (!fapUser) {
      return (
        <>
          <FapAuthFlowCard
            colors={colors}
            onOpenWebView={() => {
              setWebViewTarget(activeTab === 'grade' ? 'grade' : activeTab === 'attendance' ? 'timetable' : 'exam');
              setRealWebViewVisible(true);
            }}
            onOpenPasteModal={() => setModalVisible(true)}
          />
          {renderTabNavigation()}
        </>
      );
    }

    const displayStudentName =
      fapUser.name &&
      fapUser.name.toLowerCase() !== 'campus' &&
      !fapUser.name.toLowerCase().includes('select campus')
        ? fapUser.name
        : 'Nguyễn Duy Hưng';

    return (
      <>
        {/* 1. THẺ THÔNG TIN SINH VIÊN FAP */}
        <View style={styles.studentBanner}>
          <View style={styles.studentTopRow}>
            <View style={styles.studentAvatarContainer}>
              <Image
                source={require('../../../assets/iconfap.png')}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.studentLabelSmall}>THÔNG TIN SINH VIÊN • {fapUser.campus || 'Cơ sở Hà Nội (HN)'}</Text>
              <Text style={styles.studentFullName}>{displayStudentName}</Text>
              <Text style={styles.studentCodeSub}>{fapUser.studentId || 'HE190591'}</Text>
            </View>
            <Pressable onPress={handleLogoutFap} style={styles.logoutFapBtn} hitSlop={8}>
              <Ionicons name="log-out-outline" size={15} color="#FFFFFF" />
              <Text style={styles.logoutFapText}>Đổi TK</Text>
            </Pressable>
          </View>

          {/* <View style={styles.studentMetaBadgesRow}>
            <View style={styles.studentMetaChip}>
              <Text style={styles.studentMetaChipLabel}>Trạng thái</Text>
              <Text style={styles.studentMetaChipVal}>{fapUser.status || 'HD'}</Text>
            </View>
            <View style={styles.studentMetaChip}>
              <Text style={styles.studentMetaChipLabel}>Mã chương trình</Text>
              <Text style={styles.studentMetaChipVal} numberOfLines={1}>{fapUser.program || 'BIT_SE_19C_NJ'}</Text>
            </View>
            <View style={styles.studentMetaChip}>
              <Text style={styles.studentMetaChipLabel}>Khóa</Text>
              <Text style={styles.studentMetaChipVal}>{fapUser.cohort || '19'}</Text>
            </View>
          </View> */}

          <View style={styles.studentSyncActions}>
            <Pressable
              onPress={() => {
                setTimetableRefDate(null);
                setWebViewTarget('timetable_full');
                setRealWebViewVisible(true);
              }}
              style={[styles.syncFapBtn, { backgroundColor: '#10B981', flex: 1.4 }]}
            >
              <Ionicons name="flash" size={15} color="#FFFFFF" />
              <Text style={[styles.syncFapBtnText, { color: '#FFFFFF', fontWeight: '800' }]}>
                Lấy lịch
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setWebViewTarget(activeTab === 'grade' ? 'grade' : activeTab === 'attendance' ? 'timetable' : 'exam');
                setRealWebViewVisible(true);
              }}
              style={[styles.openWebFapBtn, { flex: 0.8 }]}
            >
              <Ionicons name="globe-outline" size={15} color="#FFFFFF" />
              <Text style={styles.openWebFapText}>Mở FAP</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. TAB ĐIỀU HƯỚNG */}
        {renderTabNavigation()}
      </>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="FPT FAP"
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
        rightAction={
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                setWebViewTarget(activeTab === 'grade' ? 'grade' : activeTab === 'attendance' ? 'timetable' : 'exam');
                setRealWebViewVisible(true);
              }}
              style={[styles.headerAddBtn, { backgroundColor: '#2563EB' }]}
              hitSlop={8}
            >
              <Ionicons name="globe-outline" size={17} color="#FFFFFF" />
            </Pressable>
            {fapUser && activeTab === 'exam' ? (
              <Pressable
                onPress={() => {
                  setEditingExam(null);
                  setModalVisible(true);
                }}
                style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
                hitSlop={8}
              >
                <Ionicons name="add" size={18} color="#121214" />
              </Pressable>
            ) : null}
          </View>
        }
      />

      {activeTab === 'attendance' ? (
        <FapAttendanceView
          colors={colors}
          courses={courses}
          weeklySlots={todaySlots}
          todaySlots={todaySlots}
          absentAlertEnabled={absentAlertEnabled}
          onToggleAbsentAlert={handleToggleAbsentAlert}
          onSyncAttendance={(refDate, isFull) => {
            setTimetableRefDate(refDate || null);
            setWebViewTarget(isFull ? 'timetable_full' : 'timetable');
            setRealWebViewVisible(true);
          }}
          onSyncCourseAttendance={() => {
            setWebViewTarget('attendance');
            setRealWebViewVisible(true);
          }}
          onDeleteCourse={handleDeleteCourse}
          onSimulateAbsentAlert={handleSimulateAbsentAlert}
          onTestSlotReminder={handleTestSlotReminder}
          onTriggerSilentCheck={handleTriggerSilentCheck}
          isSilentChecking={isSilentChecking}
          silentCheckStatus={silentCheckStatus}
          onOpenPasteModal={() => setModalVisible(true)}
          headerComponent={renderStudentHeaderAndTabs()}
        />
      ) : activeTab === 'grade' ? (
        <FapGradeView
          grades={grades}
          colors={colors}
          onSyncGrades={() => {
            setWebViewTarget('grade');
            setRealWebViewVisible(true);
          }}
          onSimulateGradeUpdate={handleSimulateGradeUpdate}
          headerComponent={renderStudentHeaderAndTabs()}
        />
      ) : (
        <FapExamListView
          exams={exams}
          colors={colors}
          fapUser={fapUser}
          now={now}
          defaultReminderMins={defaultReminderMins}
          customMinsInput={customMinsInput}
          setCustomMinsInput={setCustomMinsInput}
          onSelectPresetMins={handleSelectPresetMins}
          onApplyCustomMins={handleApplyCustomMins}
          onToggleReminder={toggleExamReminder}
          onEditExam={(ex) => {
            setEditingExam(ex);
            setModalVisible(true);
          }}
          onDeleteExam={handleDeleteExam}
          onOpenAddModal={() => {
            setEditingExam(null);
            setModalVisible(true);
          }}
          headerComponent={renderStudentHeaderAndTabs()}
        />
      )}

      {/* Modal Thêm / Chỉnh sửa / Dán lịch thi & TKB FAP */}
      <FapExamFormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        colors={colors}
        editingExam={editingExam}
        onSaveExam={handleSaveExamItem}
        onImportExams={handleImportExams}
        onImportTimetable={(slots, user) => handleTimetableSyncSuccess(user, slots)}
        onImportCourse={(course) => handleCourseAttendanceSyncSuccess(null, course)}
      />

      {/* Modal WebView kết nối Cổng FAP thật 100% */}
      <FapRealWebViewModal
        visible={realWebViewVisible}
        onClose={() => setRealWebViewVisible(false)}
        initialTarget={webViewTarget}
        initialRefDate={timetableRefDate}
        colors={colors}
        onSyncSuccess={handleRealSyncSuccess}
        onSyncTimetableSuccess={handleTimetableSyncSuccess}
        onSyncCourseAttendanceSuccess={handleCourseAttendanceSyncSuccess}
        onSyncGradesSuccess={handleGradesSyncSuccess}
        onOpenPasteModal={() => setModalVisible(true)}
      />

      {/* Silent Auto-Checker ngầm (Tự động cào khi mở app hoặc chạm thông báo +10p sau ca) */}
      <FapSilentAutoChecker
        active={isSilentChecking}
        todaySlots={todaySlots}
        onStatusChange={setSilentCheckStatus}
        onCheckComplete={handleSilentCheckComplete}
        onError={handleSilentCheckError}
        onFinish={() => setIsSilentChecking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 18, paddingTop: 8 },
  realFapBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 12, gap: 12, backgroundColor: '#1E40AF' },
  realFapIconCircle: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  realBadge: { backgroundColor: '#22C55E', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  realBadgeText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900' },
  headerAddBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  introBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 14, gap: 12 },
  introIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 208, 0, 0.14)', alignItems: 'center', justifyContent: 'center' },
  introTitle: { fontSize: 14.5, fontWeight: '800', marginBottom: 3 },
  introDesc: { fontSize: 12, lineHeight: 17 },
  studentBanner: { backgroundColor: '#1E40AF', borderRadius: 20, padding: 16, marginBottom: 16 },
  studentTopRow: { flexDirection: 'row', alignItems: 'center' },
  studentAvatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  studentCapCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  studentLabelSmall: { color: 'rgba(255,255,255,0.75)', fontSize: 10.5, fontWeight: '700' },
  studentFullName: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 2 },
  studentCodeSub: { color: '#93C5FD', fontSize: 13, fontWeight: '700' },
  logoutFapBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  logoutFapText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  studentMetaBadgesRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  studentMetaChip: { flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  studentMetaChipLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10.5 },
  studentMetaChipVal: { color: '#FFFFFF', fontSize: 12.5, fontWeight: '800', marginTop: 2 },
  studentSyncActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  syncFapBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', paddingVertical: 9, borderRadius: 10 },
  syncFapBtnText: { color: '#1E3A8A', fontSize: 12, fontWeight: '800' },
  openWebFapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  openWebFapText: { color: '#FFFFFF', fontSize: 11.5, fontWeight: '700' },
  tabBarWrap: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 6,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 9,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
});

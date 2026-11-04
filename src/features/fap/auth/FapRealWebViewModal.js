// src/features/fap/FapRealWebViewModal.js
// Modal WebView kết nối Cổng FAP thật (fap.fpt.edu.vn) cho cả Mobile Native và Web
// Hỗ trợ:
// 1. Lịch thi (/ExamSchedule)
// 2. Thời khóa biểu tuần (/WeeklyTimetable)
// 3. Báo cáo điểm danh Full cả môn (/Report/Attendance)

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
  Linking,
  BackHandler,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeTop } from '../../../components/ui';
import { FAP_SCRAPER_INJECTED_JS } from './fapScraperScript';
import { parseWeeklyTimetableRawText } from '../attend/fapAttendanceHelper';
import { parseFapExamScheduleRaw, parseFapStudentInfo } from '../exam/fapExamHelper';

// Nạp an toàn WebView từ react-native-webview trên Mobile (tránh lỗi trên Web)
let NativeWebView = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('[FapWebView] Native WebView not available:', e);
  }
}

export default function FapRealWebViewModal({
  visible,
  onClose,
  colors,
  onSyncSuccess,
  onSyncTimetableSuccess,
  onSyncCourseAttendanceSuccess,
  onSyncGradesSuccess,
  onOpenPasteModal,
  initialTarget = 'exams', // 'exams' | 'timetable' | 'attendance' | 'grade'
  initialRefDate = null,
}) {
  const safeTop = useSafeTop();
  const insets = useSafeAreaInsets();

  const getTargetUri = (target, refDate) => {
    if (target === 'grade' || target === 'grades') return 'https://fap.fpt.edu.vn/Report/Grade';
    if (target === 'timetable' || target === 'timetable_full') {
      if (refDate && target !== 'timetable_full') {
        return `https://fap.fpt.edu.vn/WeeklyTimetable?referenceDate=${refDate}`;
      }
      return 'https://fap.fpt.edu.vn/WeeklyTimetable';
    }
    if (target === 'attendance' || target === 'course') return 'https://fap.fpt.edu.vn/Report/Attendance';
    return 'https://fap.fpt.edu.vn/ExamSchedule';
  };

  const initialUri = getTargetUri(initialTarget, initialRefDate);
  const [currentUrl, setCurrentUrl] = useState(initialUri);
  const [loading, setLoading] = useState(false);
  const [scrapingProgress, setScrapingProgress] = useState(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);

  // Xử lý nút Back phần cứng của Android (Hardware Back Button)
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible) return;
    const onBackPress = () => {
      if (webViewRef.current && canGoBack) {
        webViewRef.current.goBack();
        return true;
      }
      onClose?.();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [visible, canGoBack, onClose]);

  useEffect(() => {
    if (visible) {
      const targetUri = getTargetUri(initialTarget, initialRefDate);
      setCurrentUrl(targetUri);
      setScrapingProgress(null);
    }
  }, [visible, initialTarget, initialRefDate]);

  // Xử lý message nhận được từ WebView khi bóc tách xong
  const handleNativeMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'FAP_EXAM_SCHEDULE_SYNCED') {
        if (data.exams && data.exams.length > 0) {
          onSyncSuccess?.(data.user, data.exams);
          Alert.alert(
            'Đồng bộ Lịch thi FAP thành công! 🎉',
            `Đã lấy được ${data.exams.length} môn thi từ fap.fpt.edu.vn/ExamSchedule của sinh viên ${data.user?.name || ''} (${data.user?.studentId || ''}):\n${data.exams.map((e) => `• ${e.subjectCode} (${e.date} lúc ${e.time})`).join('\n')}`,
            [{ text: 'Xem lịch thi', style: 'default' }]
          );
          onClose();
        }
      } else if (data.type === 'FAP_SCRAPING_PROGRESS') {
        setScrapingProgress({
          completed: data.completed,
          total: data.total,
          foundSlots: data.foundSlots,
        });
      } else if (data.type === 'FAP_WEEKLY_TIMETABLE_SYNCED') {
        if (data.slots && data.slots.length > 0) {
          onSyncTimetableSuccess?.(data.user, data.slots);
          if (data.isFullSemester) {
            setScrapingProgress(null);
            Alert.alert(
              'Đồng bộ Full Cả Kỳ thành công! 🎉',
              `Đã lấy trọn vẹn ${data.slots.length} ca học của tất cả ${data.totalWeeks || 17} tuần trong học kỳ từ fap.fpt.edu.vn!\nTừ bây giờ bạn có thể chuyển tuần thoải mái mà không cần tải lại mạng!`,
              [{ text: 'Xem thời khóa biểu', style: 'default' }]
            );
            onClose();
          } else {
            console.log('[FapWebView] Đã bóc tách trước 1 tuần:', data.slots.length, 'ca học');
          }
        }
      } else if (data.type === 'FAP_COURSE_ATTENDANCE_SYNCED') {
        if (data.course && data.course.sessions && data.course.sessions.length > 0) {
          onSyncCourseAttendanceSuccess?.(data.user, data.course);
          Alert.alert(
            'Đồng bộ Môn học thành công! 📚',
            `Đã cào full môn ${data.course.courseCode} (${data.course.courseName || ''}) gồm ${data.course.sessions.length} buổi học cả kỳ!\n• Tỷ lệ vắng: ${data.course.absentPercent}\n• Đã vắng: ${data.course.absentSlots}/${data.course.totalSlots} buổi.\n\nTip: Bạn có thể chọn tiếp môn khác trong mục "Lớp học" trên FAP để cào thêm môn!`,
            [{ text: 'Xem danh sách môn', style: 'default' }]
          );
          onClose();
        }
      } else if (data.type === 'FAP_GRADE_REPORT_SYNCED') {
        if (data.grades && data.grades.length > 0) {
          onSyncGradesSuccess?.(data.user, data.grades);
          Alert.alert(
            'Đồng bộ Bảng điểm FAP thành công! 🎓',
            `Đã lấy được bảng điểm của ${data.grades.length} môn học từ fap.fpt.edu.vn/Report/Grade!\nSinh viên: ${data.user?.name || ''} (${data.user?.studentId || ''})\n${data.grades.slice(0, 3).map((g) => `• ${g.subjectCode}: ${g.averageMark !== null ? `${g.averageMark} điểm` : 'Đang học'} (${g.status})`).join('\n')}${data.grades.length > 3 ? '\n...' : ''}`,
            [{ text: 'Xem bảng điểm', style: 'default' }]
          );
          onClose();
        }
      }
    } catch (e) {
      console.warn('[FapWebView] Parse message error:', e);
    }
  };

  // Điều hướng WebView sang Lịch thi (/ExamSchedule)
  const handleNavExamSchedule = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        window.location.href = 'https://fap.fpt.edu.vn/ExamSchedule';
        true;
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Điều hướng WebView sang Thời khóa biểu tuần (/WeeklyTimetable)
  const handleNavWeeklyTimetable = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        window.location.href = 'https://fap.fpt.edu.vn/WeeklyTimetable';
        true;
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Điều hướng WebView sang Báo cáo điểm danh Full cả môn (/Report/Attendance)
  const handleNavAttendanceReport = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        window.location.href = 'https://fap.fpt.edu.vn/Report/Attendance';
        true;
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Điều hướng WebView sang Bảng điểm sinh viên (/Report/Grade)
  const handleNavGradeReport = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        window.location.href = 'https://fap.fpt.edu.vn/Report/Grade';
        true;
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const handleOpenFapWeb = () => {
    Linking.openURL(currentUrl || 'https://fap.fpt.edu.vn/ExamSchedule');
  };

  // 1-Chạm: Tự động kích hoạt Đăng nhập Google FPT
  const handleAutoClickGoogle = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        (function() {
          var btns = document.querySelectorAll('button, a, input[type="submit"]');
          for (var i = 0; i < btns.length; i++) {
            var t = (btns[i].innerText || btns[i].value || '').toLowerCase();
            if (t.indexOf('google') !== -1 || t.indexOf('fpt.edu.vn') !== -1 || t.indexOf('gmail') !== -1) {
              btns[i].click();
              return true;
            }
          }
          var gBtn = document.querySelector('button[value="Google"], a[href*="Google"], a[href*="provider=Google"], .btn-google');
          if (gBtn) gBtn.click();
          true;
        })();
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // 1-Chạm: Tự động kích hoạt Đăng nhập FeID
  const handleAutoClickFeid = () => {
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        (function() {
          var btns = document.querySelectorAll('button, a, input[type="submit"]');
          for (var i = 0; i < btns.length; i++) {
            var t = (btns[i].innerText || btns[i].value || '').toLowerCase();
            if (t.indexOf('feid') !== -1) {
              btns[i].click();
              return true;
            }
          }
          var fBtn = document.querySelector('button[value="FeID"], a[href*="FeID"], .btn-feid');
          if (fBtn) fBtn.click();
          true;
        })();
      `);
      setTimeout(() => setLoading(false), 2000);
    }
  };

  // Web fallback: Dán nhanh trực tiếp từ Bộ nhớ tạm (Clipboard)
  const handleDirectWebClipboardPaste = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert(
          'Bộ nhớ tạm trống',
          'Vui lòng sang tab FAP kế bên (đã mở sẵn), bấm Ctrl+A rồi Ctrl+C để copy toàn bộ trang, sau đó bấm nút này lại!'
        );
        return;
      }

      // 1. Kiểm tra Thời khóa biểu
      const slots = parseWeeklyTimetableRawText(text);
      const studentUser = parseFapStudentInfo(text);
      if (slots && slots.length > 0) {
        onSyncTimetableSuccess?.(studentUser, slots);
        Alert.alert(
          'Đồng bộ Thời khóa biểu thành công! 🎉',
          `Đã bóc tách thành công ${slots.length} ca học trong tuần từ FAP!\nSinh viên: ${studentUser?.name || 'Nguyễn Duy Hưng'} (${studentUser?.studentId || 'HE190591'})`
        );
        onClose();
        return;
      }

      // 2. Kiểm tra Lịch thi
      const exams = parseFapExamScheduleRaw(text);
      if (exams && exams.length > 0) {
        onSyncSuccess?.(studentUser, exams);
        Alert.alert(
          'Đồng bộ Lịch thi thành công! 🎉',
          `Đã bóc tách thành công ${exams.length} ca thi từ FAP!\nSinh viên: ${studentUser?.name || 'Nguyễn Duy Hưng'} (${studentUser?.studentId || 'HE190591'})`
        );
        onClose();
        return;
      }

      Alert.alert(
        'Chưa nhận diện được lịch',
        'Hãy sang tab fap.fpt.edu.vn, bôi đen bảng lịch hoặc bấm Ctrl+A rồi Ctrl+C, sau đó quay lại đây bấm Dán!'
      );
    } catch {
      Alert.alert('Lỗi', 'Không thể đọc nội dung bộ nhớ tạm.');
    }
  };

  // Web fallback: Copy mã Console FAP 1-Dòng
  const handleCopyConsoleSnippet = async () => {
    const code = `var slots=[];document.querySelectorAll('table tbody tr, table tr').forEach(r=>{var cells=r.querySelectorAll('td');if(cells.length<8)return;var slotNum=parseInt(cells[0].innerText.replace(/\\D/g,''))||1;for(var c=1;c<=7;c++){var txt=cells[c]?.innerText?.trim();if(!txt||txt==='-')continue;var m=txt.match(/([A-Z]{3}\\d{3}[A-Z0-9]?)/i);if(m){var sub=m[1].toUpperCase();var roomM=txt.match(/at\\s+([A-Z0-9-]+)/i);var room=roomM?roomM[1]:'DE-422';var isAbsent=/vắng|absent/i.test(txt);var isPresent=/có mặt|present/i.test(txt);slots.push({id:'slot_'+slotNum+'_'+c+'_'+sub,slot:slotNum,dayIndex:c+1,dayName:'Thứ '+(c===7?'CN':(c+1)),subjectCode:sub,subjectName:sub,room:room,status:isAbsent?'Absent':isPresent?'Present':'Not yet'});}}});copy(JSON.stringify(slots));alert('Đã copy '+slots.length+' ca học! Quay lại app bấm Dán!');`;
    await Clipboard.setStringAsync(code);
    Alert.alert(
      'Đã copy mã Console! 🚀',
      'Bước 1: Sang tab fap.fpt.edu.vn kế bên -> Bấm F12 -> Chọn Console.\nBước 2: Bấm Ctrl+V và nhấn Enter.\nBước 3: Quay lại tab này bấm "Dán nhanh từ Clipboard" là xong ngay!'
    );
  };

  const isExamUrl = currentUrl.toLowerCase().includes('examschedule') || currentUrl.toLowerCase().includes('scheduleexams');
  const isTimetableUrl = currentUrl.toLowerCase().includes('weeklytimetable') || currentUrl.toLowerCase().includes('scheduleofweek');
  const isAttendanceUrl = currentUrl.toLowerCase().includes('report/attendance') || currentUrl.toLowerCase().includes('viewattendance');
  const isGradeUrl = currentUrl.toLowerCase().includes('report/grade') || currentUrl.toLowerCase().includes('studenttranscript') || currentUrl.toLowerCase().includes('/grade');

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <StatusBar barStyle="light-content" backgroundColor={colors.card} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header né tai thỏ / Dynamic Island & Android Status Bar */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.cardBorder,
              paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : safeTop + 6,
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.headerBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>

          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              Cổng Đào Tạo FAP — FPT University
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.sub }]} numberOfLines={1}>
              {currentUrl}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Pressable onPress={handleOpenFapWeb} style={styles.headerBtn} hitSlop={6} title="Trình duyệt ngoài">
              <Ionicons name="compass-outline" size={21} color="#3B82F6" />
            </Pressable>

            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web' && webViewRef.current) {
                  webViewRef.current.reload();
                } else {
                  handleOpenFapWeb();
                }
              }}
              style={styles.headerBtn}
              hitSlop={6}
            >
              <Ionicons name="reload" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>

        {loading && (
          <View style={[styles.progressBar, { backgroundColor: colors.primary }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
        )}

        {/* Banner tiến trình khi đang cào toàn bộ 17 tuần */}
        {scrapingProgress ? (
          <View style={[styles.scrapingProgressBanner, { backgroundColor: '#064E3B', borderBottomColor: '#10B981' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={styles.scrapingProgressTitle}>
                  Đang cào trọn bộ 17 tuần cả kỳ...
                </Text>
              </View>
              <Text style={styles.scrapingProgressCount}>
                {scrapingProgress.completed}/{scrapingProgress.total} tuần ({scrapingProgress.foundSlots || 0} ca)
              </Text>
            </View>
            <View style={styles.scrapingProgressBarBg}>
              <View
                style={[
                  styles.scrapingProgressBarFill,
                  { width: `${Math.min(100, Math.round(((scrapingProgress.completed || 0) / (scrapingProgress.total || 17)) * 100))}%` },
                ]}
              />
            </View>
          </View>
        ) : null}

        {/* WebView Native trên iOS / Android */}
        {Platform.OS !== 'web' && NativeWebView ? (
          <View style={{ flex: 1 }}>
            <NativeWebView
              ref={webViewRef}
              source={{ uri: initialUri }}
              originWhitelist={['*']}
              userAgent={
                Platform.OS === 'android'
                  ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
                  : undefined
              }
              androidLayerType="hardware"
              androidHardwareAccelerationDisabled={false}
              mixedContentMode="always"
              setSupportMultipleWindows={false}
              overScrollMode="never"
              javaScriptEnabled={true}
              domStorageEnabled={true}
              sharedCookiesEnabled={true}
              thirdPartyCookiesEnabled={true}
              useSharedProcessPool={true}
              saveFormData={true}
              saveFormDataDisabled={false}
              cacheEnabled={true}
              cacheMode="LOAD_DEFAULT"
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              fraudulentWebsiteWarningEnabled={false}
              incognito={false}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={(syntheticEvent) => {
                setLoading(false);
                const url = (syntheticEvent?.nativeEvent?.url || currentUrl || '').toLowerCase();
                const isAuthOrChallenge =
                  url.includes('/auth/login') ||
                  url.includes('accounts.google') ||
                  url.includes('feid.fpt.edu.vn') ||
                  url.includes('challenges.cloudflare');

                // CHỈ TỰ ĐỘNG CÀO KHI ĐÃ ĐĂNG NHẬP THÀNH CÔNG VÀ ĐANG Ở ĐÚNG TRANG
                if (url.includes('fpt.edu.vn') && !isAuthOrChallenge) {
                  const isRealExamPage = url.includes('/examschedule') || url.includes('scheduleexams');
                  const isRealTimetablePage = url.includes('/weeklytimetable') || url.includes('scheduleofweek');
                  const isRealAttendancePage = url.includes('/report/attendance') || url.includes('viewattendance');
                  const isRealGradePage = url.includes('/report/grade') || url.includes('studenttranscript') || url.includes('/grade');

                  if (isRealExamPage || isRealTimetablePage || isRealAttendancePage || isRealGradePage) {
                    setTimeout(() => {
                      webViewRef.current?.injectJavaScript(`
                        (function() {
                          ${FAP_SCRAPER_INJECTED_JS}
                          if (typeof window.doScrape === 'function') {
                            window.doScrape();
                          } else if (typeof window.doAutoOrManualScrape === 'function') {
                            window.doAutoOrManualScrape(false);
                          }
                          true;
                        })();
                      `);
                    }, 600);
                  }
                }
              }}
              onNavigationStateChange={(navState) => {
                setCurrentUrl(navState.url);
                setCanGoBack(navState.canGoBack);
              }}
              onMessage={handleNativeMessage}
              style={styles.webview}
            />

            {/* Thanh điều khiển chọn cào Lịch thi, TKB tuần, hoặc Báo cáo điểm danh Full cả môn */}
            <View
              style={[
                styles.bottomBar,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.cardBorder,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              {currentUrl.toLowerCase().includes('/auth/login') ? (
                <>
                  <Pressable
                    onPress={handleAutoClickGoogle}
                    style={[styles.tabNavBtn, { backgroundColor: '#EA4335' }]}
                  >
                    <Ionicons name="logo-google" size={15} color="#FFFFFF" />
                    <Text style={[styles.tabNavBtnText, { color: '#FFFFFF' }]}>
                      1-Chạm Google
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleAutoClickFeid}
                    style={[styles.tabNavBtn, { backgroundColor: '#4F46E5' }]}
                  >
                    <Ionicons name="key" size={15} color="#FFFFFF" />
                    <Text style={[styles.tabNavBtnText, { color: '#FFFFFF' }]}>
                      1-Chạm FeID
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    onPress={handleNavAttendanceReport}
                    style={[
                      styles.tabNavBtn,
                      isAttendanceUrl
                        ? { backgroundColor: '#3B82F6' }
                        : { borderColor: '#3B82F6', borderWidth: 1 },
                    ]}
                  >
                    <Ionicons
                      name="school"
                      size={14}
                      color={isAttendanceUrl ? '#FFFFFF' : '#3B82F6'}
                    />
                    <Text
                      style={[
                        styles.tabNavBtnText,
                        { color: isAttendanceUrl ? '#FFFFFF' : '#3B82F6' },
                      ]}
                    >
                      📚 Lịch Cả Môn
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      if (webViewRef.current) {
                        setLoading(true);
                        webViewRef.current.injectJavaScript(`
                          if (typeof window.scrapeFullSemesterTimetable === 'function') {
                            window.scrapeFullSemesterTimetable();
                          } else {
                            window.location.href = 'https://fap.fpt.edu.vn/WeeklyTimetable';
                          }
                          true;
                        `);
                        setTimeout(() => setLoading(false), 2000);
                      }
                    }}
                    style={[
                      styles.tabNavBtn,
                      { backgroundColor: '#059669', borderColor: '#10B981', borderWidth: 1 },
                    ]}
                  >
                    <Ionicons name="flash" size={13} color="#FFFFFF" />
                    <Text style={[styles.tabNavBtnText, { color: '#FFFFFF', fontWeight: '900' }]}>
                      🚀 Cào 17 Tuần
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleNavWeeklyTimetable}
                    style={[
                      styles.tabNavBtn,
                      isTimetableUrl
                        ? { backgroundColor: '#10B981' }
                        : { borderColor: '#10B981', borderWidth: 1 },
                    ]}
                  >
                    <Ionicons
                      name="time"
                      size={14}
                      color={isTimetableUrl ? '#FFFFFF' : '#10B981'}
                    />
                    <Text
                      style={[
                        styles.tabNavBtnText,
                        { color: isTimetableUrl ? '#FFFFFF' : '#10B981' },
                      ]}
                    >
                      ⏰ Tuần Này
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleNavExamSchedule}
                    style={[
                      styles.tabNavBtn,
                      isExamUrl
                        ? { backgroundColor: colors.primary }
                        : { borderColor: colors.primary, borderWidth: 1 },
                    ]}
                  >
                    <Ionicons
                      name="calendar"
                      size={14}
                      color={isExamUrl ? '#121214' : colors.primary}
                    />
                    <Text
                      style={[
                        styles.tabNavBtnText,
                        { color: isExamUrl ? '#121214' : colors.primary },
                      ]}
                    >
                      📅 Lịch Thi
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleNavGradeReport}
                    style={[
                      styles.tabNavBtn,
                      isGradeUrl
                        ? { backgroundColor: '#8B5CF6' }
                        : { borderColor: '#8B5CF6', borderWidth: 1 },
                    ]}
                  >
                    <Ionicons
                      name="ribbon"
                      size={14}
                      color={isGradeUrl ? '#FFFFFF' : '#8B5CF6'}
                    />
                    <Text
                      style={[
                        styles.tabNavBtnText,
                        { color: isGradeUrl ? '#FFFFFF' : '#8B5CF6' },
                      ]}
                    >
                      🎓 Điểm Số
                    </Text>
                  </Pressable>
                </>
              )}

              <Pressable
                onPress={() => {
                  onClose();
                  onOpenPasteModal?.();
                }}
                style={[styles.pasteFallbackBtn, { borderColor: colors.cardBorder }]}
              >
                <Ionicons name="clipboard-outline" size={14} color={colors.sub} />
                <Text style={[styles.pasteFallbackText, { color: colors.sub }]}>Dán tay</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.webSyncContainer}>
            <View style={[styles.webSyncCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.badgeRow}>
                <Ionicons name="desktop-outline" size={20} color="#3B82F6" />
                <Text style={{ color: colors.text, fontSize: 14, fontWeight: '800' }}>
                  Đồng bộ FAP trên Web Trình Duyệt
                </Text>
              </View>

              <Text style={[styles.webSyncTitle, { color: colors.text }]}>
                Cổng Đào Tạo FAP (fap.fpt.edu.vn)
              </Text>

              <View style={[styles.infoBannerBox, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: '#3B82F6' }]}>
                <Text style={{ color: colors.text, fontSize: 12.5, lineHeight: 18 }}>
                  💡 <Text style={{ fontWeight: '800' }}>Lưu ý bảo mật Web:</Text> Trình duyệt Chrome ngăn cách 2 tab khác nhau (CORS). Sau khi bạn mở tab FAP và đăng nhập, tab bên này cần dữ liệu từ bộ nhớ tạm (Clipboard) để nạp vào app.
                </Text>
              </View>

              <View style={{ gap: 10, marginTop: 4 }}>
                <Pressable
                  onPress={handleDirectWebClipboardPaste}
                  style={[styles.actionButton, { backgroundColor: '#10B981' }]}
                >
                  <Ionicons name="clipboard-outline" size={18} color="#FFFFFF" />
                  <Text style={[styles.actionButtonText, { fontWeight: '900' }]}>
                    📋 Dán nhanh từ Clipboard (1-Chạm)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleOpenFapWeb}
                  style={[styles.actionButton, { backgroundColor: '#1E40AF' }]}
                >
                  <Ionicons name="open-outline" size={17} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Mở fap.fpt.edu.vn trong tab mới</Text>
                </Pressable>

                <Pressable
                  onPress={handleCopyConsoleSnippet}
                  style={[styles.actionButton, { backgroundColor: '#4F46E5' }]}
                >
                  <Ionicons name="code-slash-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>⚡ Copy mã FAP Console (1-Click)</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenPasteModal?.();
                  }}
                  style={[styles.actionButton, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}
                >
                  <Ionicons name="create-outline" size={16} color={colors.text} />
                  <Text style={[styles.actionButtonText, { color: colors.text }]}>
                    Mở hộp thoại Dán tay / Tùy chỉnh
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  headerBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1 },
  headerTitle: { fontSize: 13.5, fontWeight: '800' },
  headerSubtitle: { fontSize: 11, marginTop: 1 },
  progressBar: { height: 2, alignItems: 'center', justifyContent: 'center' },
  webview: { flex: 1 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 6,
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  tabNavBtnText: {
    fontWeight: '900',
    fontSize: 11.5,
  },
  pasteFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pasteFallbackText: {
    fontWeight: '800',
    fontSize: 11.5,
  },
  webSyncContainer: { flex: 1, padding: 18, justifyContent: 'center', alignItems: 'center' },
  webSyncCard: { maxWidth: 520, width: '100%', borderRadius: 20, borderWidth: 1, padding: 22, gap: 14 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  webSyncTitle: { fontSize: 17, fontWeight: '900', lineHeight: 22 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  actionButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 },
  infoBannerBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  scrapingProgressBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 6,
  },
  scrapingProgressTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  scrapingProgressCount: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: '800',
  },
  scrapingProgressBarBg: {
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scrapingProgressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
});

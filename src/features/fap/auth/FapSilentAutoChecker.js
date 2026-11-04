// src/features/fap/FapSilentAutoChecker.js
// Module cào dữ liệu ngầm (Silent Auto-Fetch) từ fap.fpt.edu.vn/WeeklyTimetable
// Tự động kiểm tra điểm danh khi mở app hoặc khi chạm thông báo hệ thống (+10p sau ca học)

import React, { useEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { FAP_SCRAPER_INJECTED_JS } from './fapScraperScript';
import { filterSlotsForToday } from '../attend/fapAttendanceHelper';

let NativeWebView = null;
if (Platform.OS !== 'web') {
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch (e) {
    console.warn('[FapSilentAutoChecker] Native WebView not available:', e);
  }
}

export default function FapSilentAutoChecker({
  active = false,
  todaySlots = [],
  onCheckComplete,
  onStatusChange,
  onError,
  onFinish,
}) {
  const webViewRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const additionalSyncTimerRef = useRef(null);
  const hasFinishedCurrentRunRef = useRef(false);
  const cachedSlotDataRef = useRef(null);

  useEffect(() => {
    if (!active) {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (additionalSyncTimerRef.current) clearTimeout(additionalSyncTimerRef.current);
      hasFinishedCurrentRunRef.current = false;
      cachedSlotDataRef.current = null;
      return;
    }

    if (Platform.OS === 'web' || !NativeWebView) {
      onError?.('Silent Auto-Fetch hoạt động tự động trên điện thoại (Android / iOS)');
      onFinish?.();
      return;
    }

    onStatusChange?.('Đang kết nối FAP ngầm...');
    hasFinishedCurrentRunRef.current = false;
    cachedSlotDataRef.current = null;

    // Giới hạn thời gian cào tối đa 35s cho toàn bộ chuỗi xác thực tự động
    timeoutTimerRef.current = setTimeout(() => {
      onStatusChange?.('');
      if (!hasFinishedCurrentRunRef.current) {
        onError?.('Hết thời gian kết nối FAP ngầm');
        onFinish?.();
      }
    }, 35000);

    return () => {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      if (additionalSyncTimerRef.current) clearTimeout(additionalSyncTimerRef.current);
    };
  }, [active, onError, onFinish, onStatusChange]);

  if (!active || Platform.OS === 'web' || !NativeWebView) {
    return null;
  }

  const completeCheck = (slotsPayload, additionalPayload = {}) => {
    if (hasFinishedCurrentRunRef.current) return;
    hasFinishedCurrentRunRef.current = true;
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    if (additionalSyncTimerRef.current) clearTimeout(additionalSyncTimerRef.current);

    onStatusChange?.('Đang so khớp kết quả...');

    const allSlots = slotsPayload.slots || [];
    const liveTodaySlots = filterSlotsForToday(allSlots, new Date());
    const newAbsents = [];
    const newPresents = [];

    liveTodaySlots.forEach((newSlot) => {
      const oldSlot = todaySlots.find(
        (s) =>
          Number(s.slot) === Number(newSlot.slot) &&
          (!s.date || !newSlot.date || s.date === newSlot.date)
      );

      const isNowAbsent =
        newSlot.status === 'Absent' ||
        newSlot.status?.toLowerCase() === 'absent' ||
        newSlot.status?.toLowerCase() === 'vắng';

      const isNowPresent =
        newSlot.status === 'Present' ||
        newSlot.status?.toLowerCase() === 'present' ||
        newSlot.status?.toLowerCase() === 'có mặt';

      // CHỈ coi là "Mới phát hiện vắng" khi:
      // 1. Phải có oldSlot từ trước (không phải lần đầu nạp/cào từ đầu)
      // 2. Trạng thái cũ đang là 'Not yet' (chưa điểm danh)
      // 3. Trạng thái mới đổi thành 'Absent'
      // 4. Cả oldSlot lẫn newSlot đều chưa từng được notified
      const wasAwaitingAttendance =
        Boolean(oldSlot) &&
        (oldSlot.status === 'Not yet' ||
          oldSlot.status?.toLowerCase() === 'chưa điểm danh' ||
          !oldSlot.status);

      const alreadyNotified = Boolean(oldSlot?.notified || newSlot.notified);

      if (isNowAbsent && wasAwaitingAttendance && !alreadyNotified) {
        newAbsents.push(newSlot);
      } else if (isNowPresent && wasAwaitingAttendance && !alreadyNotified) {
        newPresents.push(newSlot);
      }
    });

    onCheckComplete?.({
      allSlots,
      liveTodaySlots,
      newAbsents,
      newPresents,
      user: slotsPayload.user,
      grades: additionalPayload.grades || null,
      exams: additionalPayload.exams || null,
    });

    onFinish?.();
  };

  const handleMessage = (event) => {
    if (hasFinishedCurrentRunRef.current) return;

    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'FAP_WEEKLY_TIMETABLE_SYNCED' && Array.isArray(data.slots) && data.slots.length > 0) {
        cachedSlotDataRef.current = data;
        onStatusChange?.('Đã lấy thời khóa biểu, đang nạp điểm & lịch thi...');

        // Kích hoạt cào ngầm thêm Bảng điểm (/Report/Grade) và Lịch thi (/ExamSchedule)
        webViewRef.current?.injectJavaScript(`
          (function() {
            try {
              Promise.all([
                fetch('/Report/Grade', { credentials: 'same-origin' }).then(function(r) { return r.text(); }).catch(function() { return ''; }),
                fetch('/ExamSchedule', { credentials: 'same-origin' }).then(function(r) { return r.text(); }).catch(function() { return ''; })
              ]).then(function(resArr) {
                var gradeHtml = resArr[0] || '';
                var examHtml = resArr[1] || '';
                var grades = [];
                var exams = [];
                if (gradeHtml && window.parseGradeReportFromDOM) {
                  var gDiv = document.createElement('div');
                  gDiv.innerHTML = gradeHtml;
                  grades = window.parseGradeReportFromDOM(gDiv);
                }
                if (examHtml && window.parseExamsFromHtmlOrDOM) {
                  var eDiv = document.createElement('div');
                  eDiv.innerHTML = examHtml;
                  exams = window.parseExamsFromHtmlOrDOM(eDiv);
                }
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'FAP_SILENT_ADDITIONAL_SYNC',
                    grades: grades,
                    exams: exams
                  }));
                }
              }).catch(function() {
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'FAP_SILENT_ADDITIONAL_SYNC',
                    grades: [],
                    exams: []
                  }));
                }
              });
            } catch(e) {}
            true;
          })();
        `);

        // Timeout dự phòng 3 giây: nếu fetch điểm/thi không xong thì hoàn tất với lịch học
        additionalSyncTimerRef.current = setTimeout(() => {
          if (!hasFinishedCurrentRunRef.current && cachedSlotDataRef.current) {
            completeCheck(cachedSlotDataRef.current);
          }
        }, 3200);
      } else if (data.type === 'FAP_SILENT_ADDITIONAL_SYNC') {
        if (cachedSlotDataRef.current) {
          completeCheck(cachedSlotDataRef.current, {
            grades: data.grades,
            exams: data.exams,
          });
        }
      }
    } catch (e) {
      console.warn('[FapSilentAutoChecker] Parse error:', e);
    }
  };

  const handleNavigationStateChange = (navState) => {
    const url = (navState.url || '').toLowerCase();

    // Nếu gặp Cloudflare Challenge -> Báo ra ngoài mở WebView để người dùng xác nhận 1-chạm
    if (url.includes('challenges.cloudflare') || url.includes('cf-chl')) {
      if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
      hasFinishedCurrentRunRef.current = true;
      onError?.('CLOUDFLARE_CHALLENGE_REQUIRED');
      onFinish?.();
      return;
    }

    // BƯỚC 1: Tại fap.fpt.edu.vn/Auth/Login -> Tự động click "Đăng nhập với FeID"
    if (url.includes('/auth/login')) {
      onStatusChange?.('Đang tự động chuyển sang FeID...');
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
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
      }, 500);
      return;
    }

    // BƯỚC 2: Tại feid.fpt.edu.vn -> Tự động click "Email fpt.edu.vn hoặc Gmail" (Google SSO)
    if (url.includes('feid.fpt.edu.vn')) {
      onStatusChange?.('Đang tự động xác thực Google SSO...');
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            var btns = document.querySelectorAll('button, a, input[type="submit"]');
            for (var i = 0; i < btns.length; i++) {
              var t = (btns[i].innerText || btns[i].value || '').toLowerCase();
              if (t.indexOf('google') !== -1 || t.indexOf('fpt.edu.vn') !== -1 || t.indexOf('gmail') !== -1) {
                btns[i].click();
                return true;
              }
            }
            var gBtn = document.querySelector('button[value="Google"], a[href*="Google"], a[href*="provider=Google"]');
            if (gBtn) gBtn.click();
            true;
          })();
        `);
      }, 600);
      return;
    }

    // BƯỚC 3: Tại accounts.google.com -> Tự chọn tài khoản Google đầu tiên nếu có list
    if (url.includes('accounts.google.com')) {
      onStatusChange?.('Đang xác nhận tài khoản Google...');
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(`
          (function() {
            var accItem = document.querySelector('div[data-identifier], li[data-identifier], div[role="link"]');
            if (accItem) accItem.click();
            true;
          })();
        `);
      }, 700);
      return;
    }

    // BƯỚC 4: Khi đã về trang FAP hợp lệ (WeeklyTimetable hoặc ExamSchedule)
    if (url.includes('fpt.edu.vn') && !url.includes('/auth/login')) {
      onStatusChange?.('Đang kết nối FAP thành công...');
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
      }, 800);
    }
  };

  return (
    <View style={styles.hiddenContainer} pointerEvents="none">
      <NativeWebView
        ref={webViewRef}
        source={{ uri: 'https://fap.fpt.edu.vn/WeeklyTimetable' }}
        userAgent={
          Platform.OS === 'android'
            ? 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36'
            : undefined
        }
        androidLayerType="hardware"
        androidHardwareAccelerationDisabled={false}
        mixedContentMode="always"
        injectedJavaScript={FAP_SCRAPER_INJECTED_JS}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        style={styles.hiddenWebView}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    width: 1,
    height: 1,
    bottom: -500,
    left: -500,
    zIndex: -9999,
    opacity: 0,
  },
  hiddenWebView: {
    width: 1,
    height: 1,
  },
});

// src/features/screentime/ScreenTimeContext.js
// Quản lý theo dõi thời gian sử dụng thiết bị toàn cục, Local Push Notifications & Alert

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert, AppState, Platform } from 'react-native';
import * as SecureStore from '../../utils/storage';
import * as Notifications from 'expo-notifications';
import { useLanguage } from '../../context/LanguageContext';

const STORAGE_LIMIT_MINUTES = 'toolkit_screentime_limit_minutes';
const STORAGE_ALERT_ENABLED = 'toolkit_screentime_alert_enabled';
const STORAGE_TODAY_MINUTES = 'toolkit_screentime_today_minutes';
const STORAGE_DATE_KEY = 'toolkit_screentime_last_date';
const SCREEN_TIME_NOTIFICATION = 'screen-time';

// Hủy mọi lịch thông báo Screen Time đang chờ trên thiết bị
export async function cancelScreenTimeReminders() {
  try {
    if (Platform.OS === 'web') return;
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const toCancel = (scheduled || []).filter(
      (item) => item.content?.data?.managedBy === SCREEN_TIME_NOTIFICATION
    );
    if (toCancel.length > 0) {
      await Promise.all(
        toCancel.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
      );
    }
  } catch (err) {
    console.warn('[ScreenTime] Lỗi cancelScreenTimeReminders:', err);
  }
}

// Cấu hình hiển thị thông báo đẩy ngay cả khi app đang mở
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

const ScreenTimeContext = createContext(null);

export function ScreenTimeProvider({ children }) {
  const { isVietnamese } = useLanguage();

  // Số phút cảnh báo (mặc định 180 phút)
  const [alertLimitMinutes, setAlertLimitMinutes] = useState(180);
  const [alertEnabled, setAlertEnabled] = useState(true);

  // Số giây sử dụng liên tục trong phiên hiện tại (chỉ đếm khi app đang active)
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Tổng số phút sử dụng trong ngày hôm nay
  const [totalTodayMinutes, setTotalTodayMinutes] = useState(0);

  // Cờ đánh dấu đã bắn cảnh báo trong ngưỡng hiện tại chưa (tránh spam Alert liên tục)
  const [isAlertTriggered, setIsAlertTriggered] = useState(false);

  const appStateRef = useRef(AppState.currentState);
  const lastBackgroundTimeRef = useRef(null);
  const alertTriggeredRef = useRef(false);
  const limitMinutesRef = useRef(180);
  const alertEnabledRef = useRef(true);
  const isVietnameseRef = useRef(isVietnamese);

  // Đồng bộ refs để truy cập an toàn trong setInterval & callback
  useEffect(() => {
    isVietnameseRef.current = isVietnamese;
  }, [isVietnamese]);

  useEffect(() => {
    alertTriggeredRef.current = isAlertTriggered;
  }, [isAlertTriggered]);

  useEffect(() => {
    limitMinutesRef.current = alertLimitMinutes;
  }, [alertLimitMinutes]);

  useEffect(() => {
    alertEnabledRef.current = alertEnabled;
  }, [alertEnabled]);

  // Nạp cấu hình từ SecureStore, xin quyền thông báo và dọn dẹp các thông báo ma cũ
  useEffect(() => {
    loadSettings();
    requestNotificationPermissions();
    // Dọn sạch mọi thông báo Screen Time còn lưu trên OS từ các phiên trước
    cancelScreenTimeReminders().catch(() => {});
  }, []);

  // Xin quyền thông báo từ hệ điều hành iOS / Android
  const requestNotificationPermissions = async () => {
    try {
      if (Platform.OS === 'web') return false;
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      return finalStatus === 'granted';
    } catch (err) {
      console.warn('[ScreenTime] Lỗi xin quyền Notifications:', err);
      return false;
    }
  };

  const loadSettings = async () => {
    try {
      const savedLimit = await SecureStore.getItemAsync(STORAGE_LIMIT_MINUTES);
      if (savedLimit) {
        const parsedLimit = parseInt(savedLimit, 10);
        if (!isNaN(parsedLimit) && parsedLimit > 0) {
          setAlertLimitMinutes(parsedLimit);
          limitMinutesRef.current = parsedLimit;
        }
      }

      const savedEnabled = await SecureStore.getItemAsync(STORAGE_ALERT_ENABLED);
      if (savedEnabled !== null) {
        const parsedEnabled = savedEnabled === 'true';
        setAlertEnabled(parsedEnabled);
        alertEnabledRef.current = parsedEnabled;
      }

      // Kiểm tra ngày hôm nay để nạp hoặc reset tổng thời gian ngày
      const todayStr = new Date().toISOString().slice(0, 10);
      const lastDate = await SecureStore.getItemAsync(STORAGE_DATE_KEY);
      if (lastDate === todayStr) {
        const savedToday = await SecureStore.getItemAsync(STORAGE_TODAY_MINUTES);
        if (savedToday) {
          const parsed = parseInt(savedToday, 10);
          setTotalTodayMinutes(isNaN(parsed) ? 0 : parsed);
        }
      } else {
        await SecureStore.setItemAsync(STORAGE_DATE_KEY, todayStr);
        await SecureStore.setItemAsync(STORAGE_TODAY_MINUTES, '0');
        setTotalTodayMinutes(0);
      }
    } catch (e) {
      console.warn('[ScreenTime] Không thể nạp cấu hình từ SecureStore:', e);
    }
  };

  // Cập nhật số phút cảnh báo
  const updateLimitMinutes = async (newMinutes) => {
    const mins = parseInt(String(newMinutes), 10);
    if (isNaN(mins) || mins <= 0) return false;

    setAlertLimitMinutes(mins);
    limitMinutesRef.current = mins;
    setIsAlertTriggered(false);
    alertTriggeredRef.current = false;

    // Hủy bỏ mọi lịch hẹn giờ cũ
    await cancelScreenTimeReminders().catch(() => {});

    try {
      await SecureStore.setItemAsync(STORAGE_LIMIT_MINUTES, String(mins));
    } catch {}
    return true;
  };

  // Bật/tắt cảnh báo
  const toggleAlertEnabled = async (enabled) => {
    setAlertEnabled(enabled);
    alertEnabledRef.current = enabled;
    await cancelScreenTimeReminders().catch(() => {});

    try {
      await SecureStore.setItemAsync(STORAGE_ALERT_ENABLED, String(enabled));
    } catch {}
  };

  // Đặt lại bộ đếm phiên sử dụng
  const resetSession = async () => {
    setSessionSeconds(0);
    setIsAlertTriggered(false);
    alertTriggeredRef.current = false;
    await cancelScreenTimeReminders().catch(() => {});
  };

  // Tạm hoãn cảnh báo thêm X phút (Snooze)
  const snooze = (minutes = 10) => {
    setIsAlertTriggered(false);
    alertTriggeredRef.current = false;
    limitMinutesRef.current = limitMinutesRef.current + minutes;
    const isVi = isVietnameseRef.current;
    Alert.alert(
      isVi ? 'Đã tạm hoãn' : 'Snoozed',
      isVi
        ? `ToolKit sẽ nhắc nhở lại sau ${minutes} phút phiên dùng nữa.`
        : `ToolKit will remind you after another ${minutes} minutes of usage.`
    );
  };

  // Phát cảnh báo in-app Alert
  const triggerUsageAlert = (minutesUsed) => {
    const hours = (minutesUsed / 60).toFixed(1);
    const isVi = isVietnameseRef.current;
    Alert.alert(
      isVi ? '⚠️ CẢNH BÁO THỜI GIAN SỬ DỤNG' : '⚠️ SCREEN TIME WARNING',
      isVi
        ? `Bạn đã sử dụng thiết bị liên tục ${minutesUsed} phút (${hours} giờ).\n\nHãy tạm dừng hoạt động, rời mắt khỏi màn hình và vận động nhẹ để bảo vệ sức khỏe và thị giác!`
        : `You have been using the device continuously for ${minutesUsed} minutes (${hours} hours).\n\nPlease take a break and rest your eyes!`,
      [
        {
          text: isVi ? 'Nghỉ ngơi ngay (Đặt lại)' : 'Rest Now (Reset)',
          style: 'default',
          onPress: () => resetSession(),
        },
        {
          text: isVi ? 'Nhắc lại sau 10 phút' : 'Remind in 10 mins',
          style: 'cancel',
          onPress: () => snooze(10),
        },
      ],
      { cancelable: false }
    );
  };

  // Nút thử nghiệm cảnh báo in-app Alert ngay lập tức
  const triggerTestAlert = () => {
    triggerUsageAlert(alertLimitMinutes);
  };

  // Nút thử nghiệm thông báo đẩy hệ thống (Sau X giây để người dùng kiểm tra thông báo)
  const triggerTestNotification = async (seconds = 3) => {
    try {
      const granted = await requestNotificationPermissions();
      const isVi = isVietnameseRef.current;
      if (!granted) {
        Alert.alert(
          isVi ? 'Cần cấp quyền Thông báo' : 'Notification Permission Needed',
          isVi
            ? 'Vui lòng bật quyền Thông báo cho ToolKit trong phần Cài đặt máy để nhận được lời nhắc.'
            : 'Please enable Notification permissions in Settings to receive screen time reminders.'
        );
        return;
      }

      await cancelScreenTimeReminders();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: isVi ? '🦉 Cú ToolKit: Đã hết giờ dùng máy!' : '🦉 ToolKit Owl: Screen Time Limit Reached!',
          body: isVi
            ? `Bạn đã dùng thiết bị liên tục ${alertLimitMinutes} phút. Hãy tạm rời điện thoại và cho mắt thư giãn nhé!`
            : `You have used the device continuously for ${alertLimitMinutes} minutes. Time to rest your eyes!`,
          sound: true,
          data: { managedBy: SCREEN_TIME_NOTIFICATION },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });

      Alert.alert(
        isVi ? '🔔 Đã hẹn giờ thông báo!' : '🔔 Notification Scheduled!',
        isVi
          ? `Hệ thống sẽ gửi thông báo đẩy đến màn hình khóa sau ${seconds} giây. Bạn có thể khóa máy hoặc vuốt về màn hình Home ngay để kiểm tra thử!`
          : `The system will send a push notification in ${seconds} seconds. You can lock or minimize the app to verify!`
      );
    } catch (err) {
      Alert.alert('Lỗi gửi thông báo', err?.message);
    }
  };

  // Lắng nghe thay đổi trạng thái AppState
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (lastBackgroundTimeRef.current) {
          const diffMinutes = (Date.now() - lastBackgroundTimeRef.current) / 60000;
          if (diffMinutes >= 5) {
            // Đã khóa máy nghỉ ngơi trên 5 phút -> Reset phiên dùng máy
            resetSession();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        lastBackgroundTimeRef.current = Date.now();
        // Thoát app hoặc khóa máy: Người dùng KHÔNG còn dùng app -> HỦY BỎ ngay các thông báo hẹn giờ màn hình
        // Tuyệt đối không lên lịch thông báo ma khi người dùng không dùng máy!
        cancelScreenTimeReminders().catch(() => {});
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Bộ đếm thời gian thực tế mỗi giây CHỈ KHI app đang active trên màn hình
  useEffect(() => {
    const timer = setInterval(() => {
      if (appStateRef.current === 'active') {
        setSessionSeconds((prev) => {
          const nextSec = prev + 1;
          const currentMins = Math.floor(nextSec / 60);

          // Cập nhật tổng thời gian sử dụng hôm nay mỗi khi trôi qua 60 giây
          if (nextSec % 60 === 0) {
            setTotalTodayMinutes((today) => {
              const updated = today + 1;
              SecureStore.setItemAsync(STORAGE_TODAY_MINUTES, String(updated)).catch(() => {});
              return updated;
            });
          }

          // Kiểm tra xem đã đạt ngưỡng cảnh báo chưa
          if (
            alertEnabledRef.current &&
            !alertTriggeredRef.current &&
            currentMins >= limitMinutesRef.current &&
            limitMinutesRef.current > 0
          ) {
            setIsAlertTriggered(true);
            alertTriggeredRef.current = true;
            triggerUsageAlert(limitMinutesRef.current);

            // Gửi thông báo đẩy tức thì nếu người dùng đang dùng máy
            if (Platform.OS !== 'web') {
              const hours = (limitMinutesRef.current / 60).toFixed(1);
              const isVi = isVietnameseRef.current;
              Notifications.scheduleNotificationAsync({
                content: {
                  title: isVi ? '🦉 Cú ToolKit: Đã hết giờ dùng máy!' : '🦉 ToolKit Owl: Screen Time Limit Reached!',
                  body: isVi
                    ? `Bạn đã dùng thiết bị liên tục ${limitMinutesRef.current} phút (${hours} giờ). Cho mắt nghỉ ngơi 5-10 phút thôi nào!`
                    : `You have used the device continuously for ${limitMinutesRef.current} minutes (${hours} hours). Rest your eyes!`,
                  sound: true,
                  priority: Notifications.AndroidNotificationPriority.HIGH,
                  data: { managedBy: SCREEN_TIME_NOTIFICATION },
                },
                trigger: null, // Bắn ngay lập tức
              }).catch(() => {});
            }
          }

          return nextSec;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const sessionMinutes = Math.floor(sessionSeconds / 60);

  return (
    <ScreenTimeContext.Provider
      value={{
        alertLimitMinutes,
        alertEnabled,
        sessionSeconds,
        sessionMinutes,
        totalTodayMinutes,
        isAlertTriggered,
        updateLimitMinutes,
        toggleAlertEnabled,
        resetSession,
        snooze,
        triggerTestAlert,
        triggerTestNotification,
      }}
    >
      {children}
    </ScreenTimeContext.Provider>
  );
}

export function useScreenTime() {
  const context = useContext(ScreenTimeContext);
  if (!context) {
    throw new Error('useScreenTime must be used within a ScreenTimeProvider');
  }
  return context;
}

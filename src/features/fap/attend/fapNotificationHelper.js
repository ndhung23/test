// src/features/fap/fapNotificationHelper.js
// Quản lý hệ thống thông báo Push Notification, Lên lịch chuông báo cuối ca (+10p) và Silent Auto-Fetch

import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { FAP_TIMESLOTS, ATTENDANCE_STATUS, detectSlotFromTimeStr } from './fapAttendanceHelper';

// Cấu hình Notification Handler để hiển thị thông báo ngay cả khi ứng dụng đang chạy ở foreground
if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn('[FapNotification] Failed to set notification handler:', e?.message);
  }
}

/**
 * Tạo kênh thông báo chuẩn Android 8.0+ (Notification Channel) để hỗ trợ banner, rung và chuông
 */
export async function setupAndroidNotificationChannel() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('fap_alerts', {
        name: 'FAP Cảnh báo & Lịch thi',
        description: 'Thông báo nhắc lịch thi, cảnh báo vắng mặt và điểm số FAP',
        importance: 5, // Android Importance MAX
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
      });
    } catch (e) {
      console.warn('[FapNotification] Android channel setup error:', e?.message);
    }
  }
}

/**
 * Hủy tất cả các thông báo hệ thống nhắc nhở điểm danh cuối ca (+10p) đã lên lịch
 */
export async function cancelAttendanceSlotReminders() {
  if (Platform.OS === 'web') return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const item of scheduled) {
      if (item.content?.data?.type === 'FAP_SLOT_REMINDER') {
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  } catch (err) {
    console.warn('[FapNotification] Lỗi hủy lịch thông báo ca học cũ:', err?.message);
  }
}

/**
 * Tự động lên lịch hẹn giờ thông báo hệ thống đúng +10p sau mỗi ca học trong ngày
 * Chạy ở cấp OS (kể cả khi app bị tắt hoàn toàn/killed app điện thoại vẫn đổ chuông).
 */
export async function scheduleAttendanceSlotReminders(slots = [], absentAlertEnabled = true) {
  if (Platform.OS === 'web') return { scheduledCount: 0 };
  if (!absentAlertEnabled || !Array.isArray(slots) || slots.length === 0) {
    await cancelAttendanceSlotReminders();
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

    // Xóa lịch cũ trước khi tạo mới để tránh trùng lặp
    await cancelAttendanceSlotReminders();
    await setupAndroidNotificationChannel();

    const now = new Date();
    const currentYear = now.getFullYear();
    let scheduledCount = 0;

    for (const slot of slots) {
      // Nếu ca học đã có kết quả Có mặt (Present) từ trước thì không cần nhắc
      const isPresent =
        slot.status === ATTENDANCE_STATUS.PRESENT ||
        slot.status?.toLowerCase() === 'present' ||
        slot.status?.toLowerCase() === 'có mặt';
      if (isPresent) continue;

      const validSlotNum = Number(slot.slot) || detectSlotFromTimeStr(slot.time) || 1;
      const cfg = FAP_TIMESLOTS.find((s) => s.slot === validSlotNum) || FAP_TIMESLOTS[0];

      let slotDate = new Date(now);
      if (slot.date) {
        const m = String(slot.date).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
        if (m) {
          const d = parseInt(m[1], 10);
          const mo = parseInt(m[2], 10) - 1;
          const y = m[3] ? parseInt(m[3], 10) : currentYear;
          slotDate = new Date(y, mo, d);
        }
      }

      // Giờ hẹn báo = alertHour : alertMinute (+10p sau khi kết thúc ca học)
      const targetTime = new Date(slotDate);
      targetTime.setHours(cfg.alertHour, cfg.alertMinute, 0, 0);

      const diffMs = targetTime.getTime() - now.getTime();
      const diffSecs = Math.round(diffMs / 1000);

      // Chỉ lên lịch cho các ca học có mốc +10p vẫn ở tương lai
      if (diffSecs > 5) {
        const title = `🔔 Hết ca ${validSlotNum}: Kiểm tra điểm danh ${slot.subjectCode || 'môn học'}`;
        const body = `Ca ${validSlotNum} (${cfg.time}) kết thúc lúc ${cfg.endTime}. Chạm để tự động so khớp điểm danh FAP xem có bị Vắng (Absent) không!`;

        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            channelId: 'fap_alerts',
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
            data: {
              type: 'FAP_SLOT_REMINDER',
              slot: validSlotNum,
              subjectCode: slot.subjectCode || '',
              room: slot.room || '',
              date: slot.date || '',
              time: cfg.time,
            },
          },
          trigger: {
            type: 'timeInterval',
            seconds: diffSecs,
            repeats: false,
          },
        });
        scheduledCount++;
      }
    }

    return { scheduledCount };
  } catch (err) {
    console.warn('[FapNotification] Lỗi lên lịch thông báo slot:', err?.message);
    return { scheduledCount: 0, error: err?.message };
  }
}

// Tập hợp lưu các ca học đã bắn cảnh báo vắng trong phiên hiện tại để tránh trùng lặp
const recentlyTriggeredAbsentSet = new Set();

/**
 * Kích hoạt cảnh báo chuông và Push Notification khi sinh viên bị đánh Absent
 */
export async function triggerAbsentNotification(slotItem) {
  if (!slotItem) return;

  const slotKey = `${slotItem.date || ''}_${slotItem.slot || ''}_${slotItem.subjectCode || ''}`;
  if (slotKey && recentlyTriggeredAbsentSet.has(slotKey)) {
    return; // Đã bắn thông báo cho ca học này rồi, không báo lại!
  }
  if (slotKey) {
    recentlyTriggeredAbsentSet.add(slotKey);
  }

  const cfg = FAP_TIMESLOTS.find((s) => s.slot === Number(slotItem.slot));
  const timeDesc = cfg ? cfg.time : slotItem.time || 'Ca học';
  const alertTimeStr = cfg ? cfg.alertTime : 'Cuối ca + 10 phút';

  const title = `🚨 CẢNH BÁO ĐIỂM DANH: Bạn bị vắng mặt (Absent)!`;
  const body = `Môn ${slotItem.subjectCode} (${timeDesc}) tại phòng ${slotItem.room || 'học'} bị đánh VẮNG MẶT lúc ${alertTimeStr}. Vui lòng liên hệ giảng viên nếu có nhầm lẫn!`;

  Alert.alert(
    title,
    body,
    [
      { text: 'Kiểm tra FAP ngay', style: 'destructive' },
      { text: 'Đã rõ', style: 'default' },
    ]
  );

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
    return;
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus === 'granted') {
      await setupAndroidNotificationChannel();
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          channelId: 'fap_alerts',
          priority: Notifications.AndroidNotificationPriority.MAX,
          vibrate: [0, 250, 250, 250],
        },
        trigger: null,
      });
    }
  } catch (err) {
    console.warn('[FapNotification] Không thể gửi Push Notification:', err?.message);
  }
}

/**
 * Tìm ca học vừa kết thúc gần đây (trong vòng 3 tiếng vừa qua)
 * mà trạng thái vẫn chưa có kết quả ('Not yet')
 * Dùng để tự động kích hoạt Silent Auto-Fetch khi mở app!
 */
export function findRecentlyEndedSlot(slots = [], now = new Date()) {
  if (!Array.isArray(slots) || slots.length === 0) return null;
  const currentYear = now.getFullYear();

  for (const slot of slots) {
    const isPresent =
      slot.status === ATTENDANCE_STATUS.PRESENT ||
      slot.status?.toLowerCase() === 'present' ||
      slot.status?.toLowerCase() === 'có mặt';
    const isAbsent =
      slot.status === ATTENDANCE_STATUS.ABSENT ||
      slot.status?.toLowerCase() === 'absent' ||
      slot.status?.toLowerCase() === 'vắng';

    // Đã có kết quả rõ ràng rồi thì bỏ qua
    if (isPresent || isAbsent) continue;

    const validSlotNum = Number(slot.slot) || detectSlotFromTimeStr(slot.time) || 1;
    const cfg = FAP_TIMESLOTS.find((s) => s.slot === validSlotNum) || FAP_TIMESLOTS[0];

    let slotDate = new Date(now);
    if (slot.date) {
      const m = String(slot.date).match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
      if (m) {
        const d = parseInt(m[1], 10);
        const mo = parseInt(m[2], 10) - 1;
        const y = m[3] ? parseInt(m[3], 10) : currentYear;
        slotDate = new Date(y, mo, d);
      }
    }

    const endTime = new Date(slotDate);
    endTime.setHours(cfg.endHour, cfg.endMinute, 0, 0);

    const diffMinutes = (now.getTime() - endTime.getTime()) / (1000 * 60);

    // Ca học đã kết thúc từ 0 đến 180 phút trước
    if (diffMinutes >= 0 && diffMinutes <= 180) {
      return {
        ...slot,
        slot: validSlotNum,
        diffMinutes: Math.round(diffMinutes),
      };
    }
  }

  return null;
}

/**
 * Bắn thử 1 thông báo hệ thống test sau 3 giây để người dùng kiểm chứng
 */
export async function triggerTestSlotReminderNotification() {
  if (Platform.OS === 'web') {
    Alert.alert('Thông báo', 'Tính năng Push Notification hoạt động trên ứng dụng di động (iOS / Android)!');
    return;
  }
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') {
      Alert.alert('Quyền thông báo', 'Vui lòng cấp quyền thông báo trong cài đặt để nhận chuông nhắc!');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 [Thử nghiệm] Hết ca 2: Kiểm tra điểm danh MMA301',
        body: 'Ca 2 (10h00 - 12h20) đã kết thúc lúc 12:20. Chạm vào đây để Silent Auto-Fetch kiểm tra điểm danh!',
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        vibrate: [0, 250, 250, 250],
        data: {
          type: 'FAP_SLOT_REMINDER',
          slot: 2,
          subjectCode: 'MMA301',
          room: 'DE-422',
          date: 'Hôm nay',
          time: '10h00 - 12h20',
        },
      },
      trigger: {
        type: 'timeInterval',
        seconds: 3,
        repeats: false,
      },
    });

    Alert.alert(
      'Đã lên lịch thử nghiệm! ⏱️',
      'Chuông thông báo hệ thống sẽ reo sau đúng 3 giây. Bạn có thể khóa màn hình hoặc thu nhỏ app để thấy thông báo xuất hiện!',
      [{ text: 'Đã hiểu' }]
    );
  } catch (err) {
    Alert.alert('Lỗi', err?.message || 'Không thể tạo thông báo');
  }
}

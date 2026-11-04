// src/features/micro-habit/microHabitService.js
// Logic tính toán chu kỳ, kiểm tra hạn chót, màu sắc cảnh báo, thông báo hẹn giờ và lưu trữ dữ liệu việc vặt

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

export const HABIT_REMINDER_CHANNEL = 'habit-reminders';

export async function ensureHabitReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(HABIT_REMINDER_CHANNEL, {
    name: 'Nhắc nhở việc vặt',
    // Android notification importance MAX. Numeric value avoids a stale SDK type export.
    importance: 5,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
  });
}

export async function requestAndroidExactAlarmPermission() {
  if (Platform.OS !== 'android' || !Notifications.getExactAlarmPermissionsAsync) return true;
  let permission = await Notifications.getExactAlarmPermissionsAsync();
  if (permission.status !== 'granted' && Notifications.requestExactAlarmPermissionsAsync) {
    permission = await Notifications.requestExactAlarmPermissionsAsync();
  }
  return permission.status === 'granted';
}

// Cấu hình hiển thị thông báo an toàn trong Expo Go
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    ensureHabitReminderChannel().catch(() => {});
  }
} catch {
  // Safe fallback
}

export const STORAGE_KEY_HABITS = '@toolkit_micro_habits_v1';
export const STORAGE_KEY_CUSTOM_CATEGORIES = '@toolkit_micro_habit_categories_v1';

export const HABIT_TYPES = {
  INTERVAL: 'interval', // Đếm ngược theo số ngày (mỗi X ngày)
  MONTHLY: 'monthly',   // Cố định ngày X hàng tháng
  DAILY: 'daily',       // Lặp lại số lần trong ngày
};
export const DEFAULT_CATEGORIES = ['Sinh hoạt', 'Nhà cửa', 'Sức khỏe', 'Xe cộ', 'Chi phí'];

export function normalizeCategoryName(value = '') {
  return String(value).trim().replace(/\s+/g, ' ');
}

export function validateCategoryName(value, existing = DEFAULT_CATEGORIES) {
  const name = normalizeCategoryName(value);
  if (!name) return 'Vui lòng nhập tên danh mục.';
  if (name.length > 20) return 'Tên danh mục tối đa 20 ký tự.';
  if (existing.some((item) => normalizeHabitSearch(item) === normalizeHabitSearch(name))) return 'Tên danh mục đã có.';
  return null;
}

export function validateHabitTitle(value) {
  const title = String(value || '').trim();
  if (!title) return 'Vui lòng nhập tên công việc.';
  if (title.length > 60) return 'Tên không được vượt quá 60 ký tự.';
  return null;
}

export async function loadCustomCategories() {
  try {
    const saved = JSON.parse(await AsyncStorage.getItem(STORAGE_KEY_CUSTOM_CATEGORIES) || '[]');
    return Array.isArray(saved) ? saved.slice(0, 10) : [];
  } catch { return []; }
}

export async function saveCustomCategories(categories = []) {
  await AsyncStorage.setItem(STORAGE_KEY_CUSTOM_CATEGORIES, JSON.stringify(categories.slice(0, 10)));
}

export const HABIT_ATTRIBUTE_COLORS = {
  cycle: { background: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.55)', text: '#60A5FA' },
  reminder: { background: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.55)', text: '#22D3EE' },
  count: { background: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.55)', text: '#A5B4FC' },
};

export function formatTaskNameForNotification(name, max = 60) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (clean.length <= max) return clean;
  const clipped = clean.slice(0, max - 1);
  const boundary = clipped.lastIndexOf(' ');
  return `${(boundary > Math.floor(max / 2) ? clipped.slice(0, boundary) : clipped).trim()}…`;
}

export function createHabitClone(habit, startDate = new Date()) {
  const start = new Date(startDate).toISOString();
  return {
    ...habit,
    id: `habit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    seriesId: habit.seriesId || habit.id,
    lastCompletedDate: habit.type === HABIT_TYPES.DAILY ? habit.lastCompletedDate : start,
    currentCount: habit.type === HABIT_TYPES.DAILY ? 0 : habit.currentCount,
    lastDailyDate: habit.type === HABIT_TYPES.DAILY ? getTodayDateString(startDate) : habit.lastDailyDate,
    notificationId: null,
    history: [],
  };
}

export function getSeriesCompletionCount(habit, allHabits = []) {
  const seriesId = habit.seriesId || habit.id;
  return allHabits.filter((item) => (item.seriesId || item.id) === seriesId)
    .reduce((total, item) => total + (Array.isArray(item.history) ? item.history.length : 0), 0);
}

export function getHabitStatusGroup(status) {
  if (status?.urgency === 'completed') return 'completed';
  if (status?.urgency === 'overdue') return 'overdue';
  if (status?.urgency === 'warning') return 'warning';
  return 'safe';
}

export function normalizeHabitSearch(value = '') {
  return String(value)
    .trim()
    .toLocaleLowerCase('vi-VN')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getHabitStats(habitsWithStatus = []) {
  const stats = { total: habitsWithStatus.length, overdue: 0, warning: 0, safe: 0, completed: 0 };
  habitsWithStatus.forEach((habit) => { stats[getHabitStatusGroup(habit.status)] += 1; });
  return stats;
}

export function filterHabits(habitsWithStatus = [], { typeFilter = 'all', statusFilter = null, search = '' } = {}) {
  const query = normalizeHabitSearch(search);
  return habitsWithStatus.filter((habit) => {
    const typeMatches = typeFilter === 'all'
      || (typeFilter === 'urgent' && ['overdue', 'warning'].includes(getHabitStatusGroup(habit.status)))
      || habit.type === typeFilter;
    const statusMatches = !statusFilter || getHabitStatusGroup(habit.status) === statusFilter;
    const searchMatches = !query || normalizeHabitSearch(`${habit.title || ''} ${habit.category || ''}`).includes(query);
    return typeMatches && statusMatches && searchMatches;
  }).sort((a, b) => ['overdue', 'warning', 'safe', 'completed'].indexOf(getHabitStatusGroup(a.status)) - ['overdue', 'warning', 'safe', 'completed'].indexOf(getHabitStatusGroup(b.status)));
}

// Chuẩn hóa ngày về 00:00:00 để so sánh số ngày chính xác
export function getMidnight(dateInput = new Date()) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Lấy chuỗi YYYY-MM-DD theo giờ địa phương
export function getTodayDateString(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyEventsForDate(item, now = new Date()) {
  const day = getTodayDateString(now);
  const events = Array.isArray(item.dailyCompletionEvents) ? item.dailyCompletionEvents : [];
  return events.filter((event) => event.date === day && event.kind === 'daily-completion');
}

export function getDailyCompletionCount(item, now = new Date()) {
  const events = getDailyEventsForDate(item, now);
  // Legacy records did not retain timestamps; preserve their displayed count until first new event migrates it.
  if (!events.length && !Array.isArray(item.dailyCompletionEvents)) {
    return item.lastDailyDate === getTodayDateString(now) ? Math.max(0, item.currentCount || 0) : 0;
  }
  return events.length;
}

export function recordCompletion(item, now = new Date()) {
  const timestamp = new Date(now).toISOString();
  const historyItem = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, timestamp, note: item.type === HABIT_TYPES.DAILY ? 'Ghi nhận 1 lần' : 'Hoàn thành chu kỳ' };
  if (item.type !== HABIT_TYPES.DAILY) {
    return { ...item, lastCompletedDate: timestamp, completedCycleAt: item.type === HABIT_TYPES.INTERVAL ? timestamp : item.completedCycleAt, history: [historyItem, ...(item.history || [])].slice(0, 100) };
  }
  const day = getTodayDateString(now);
  const previousEvents = Array.isArray(item.dailyCompletionEvents) ? item.dailyCompletionEvents : [];
  const legacyCount = !Array.isArray(item.dailyCompletionEvents) && item.lastDailyDate === day ? Math.max(0, item.currentCount || 0) : 0;
  const migrated = legacyCount ? Array.from({ length: legacyCount }, (_, index) => ({ id: `legacy-${item.id}-${day}-${index}`, date: day, timestamp, kind: 'daily-completion' })) : [];
  const event = { id: historyItem.id, date: day, timestamp, kind: 'daily-completion' };
  const events = [...previousEvents, ...migrated, event].slice(-500);
  const count = getDailyEventsForDate({ dailyCompletionEvents: events }, now).length;
  return { ...item, dailyCompletionEvents: events, currentCount: count, lastDailyDate: day, history: [historyItem, ...(item.history || [])].slice(0, 100) };
}

export function undoCompletion(item, now = new Date()) {
  if (item.type !== HABIT_TYPES.DAILY) return item;
  const day = getTodayDateString(now);
  const events = Array.isArray(item.dailyCompletionEvents) ? item.dailyCompletionEvents : [];
  const lastIndex = events.map((event, index) => ({ event, index })).filter(({ event }) => event.date === day && event.kind === 'daily-completion').at(-1)?.index;
  if (lastIndex === undefined) {
    const current = getDailyCompletionCount(item, now);
    return { ...item, currentCount: Math.max(0, current - 1), lastDailyDate: day };
  }
  const nextEvents = events.filter((_, index) => index !== lastIndex);
  const count = getDailyEventsForDate({ dailyCompletionEvents: nextEvents }, now).length;
  return { ...item, dailyCompletionEvents: nextEvents, currentCount: count, lastDailyDate: day, history: (item.history || []).filter((event) => event.id !== events[lastIndex].id) };
}

// Tính khoảng cách ngày: (targetDate - baseDate)
export function getDaysDiff(targetDate, baseDate = new Date()) {
  const t = getMidnight(targetDate).getTime();
  const b = getMidnight(baseDate).getTime();
  return Math.round((t - b) / (1000 * 60 * 60 * 24));
}

/**
 * Lấy ngày hợp lệ của một tháng (tự động co về ngày cuối tháng nếu tháng ngắn hơn targetDay)
 * Ví dụ: ngày 31 tháng 2 -> 28 hoặc 29; ngày 31 tháng 11 -> 30
 */
export function getValidMonthlyDate(year, monthIndex, targetDay) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const validDay = Math.min(Math.max(1, targetDay), daysInMonth);
  return new Date(year, monthIndex, validDay, 0, 0, 0, 0);
}

/**
 * Lấy danh sách toàn bộ thông báo đã lên lịch trong hệ điều hành (dùng cho debug & quản lý)
 */
export async function getAllScheduledHabitReminders() {
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    return list.map((item) => {
      let triggerSummary = 'Không xác định';
      if (item.trigger) {
        if (item.trigger.type === 'calendar' || item.trigger.date) {
          triggerSummary = `Ngày ${new Date(item.trigger.date || item.trigger.value).toLocaleString('vi-VN')}`;
        } else if (item.trigger.hour !== undefined) {
          const h = String(item.trigger.hour).padStart(2, '0');
          const m = String(item.trigger.minute || 0).padStart(2, '0');
          triggerSummary = `Hàng ngày lúc ${h}:${m}`;
        } else if (item.trigger.seconds) {
          triggerSummary = `Sau ${item.trigger.seconds} giây`;
        }
      }
      return {
        id: item.identifier,
        title: item.content?.title || '(Không có tiêu đề)',
        body: item.content?.body || '',
        habitId: item.content?.data?.habitId || null,
        triggerSummary,
      };
    });
  } catch (err) {
    console.warn('Lỗi lấy danh sách thông báo OS:', err);
    return [];
  }
}

/**
 * Lên lịch hoặc hủy thông báo hẹn giờ nhắc nhở cho từng việc vặt
 * @param {object} habit 
 * @returns {Promise<string|null>} notificationId mới hoặc null
 */
export async function scheduleHabitReminder(habit) {
  if (!habit) return null;

  // Hủy thông báo cũ nếu có
  if (habit.notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(habit.notificationId);
    } catch {
      // ignore
    }
  }

  // Nếu không bật nhắc nhở hoặc không có giờ
  if (!habit.reminderEnabled || !habit.reminderTime) {
    return null;
  }

  try {
    await ensureHabitReminderChannel();
    const exactAlarmGranted = await requestAndroidExactAlarmPermission();
    if (!exactAlarmGranted) console.warn('Android exact-alarm permission denied; reminder uses best-effort delivery.');
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }

    const parts = habit.reminderTime.split(':');
    const hour = parseInt(parts[0], 10);
    const minute = parseInt(parts[1] || '0', 10);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    // 1. Cho việc hàng ngày (DAILY): Lặp lại hàng ngày vào đúng khung giờ
    if (habit.type === HABIT_TYPES.DAILY) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔔 Nhắc việc',
          body: `${formatTaskNameForNotification(habit.title)}\n${habit.note || 'Đã đến giờ hoàn thành mục tiêu.'}`,
          sound: true,
          data: { habitId: habit.id, taskId: habit.id },
          ...(Platform.OS === 'android' ? { channelId: HABIT_REMINDER_CHANNEL } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          repeats: true,
        },
      });
      return id;
    }

    // 2. Cho việc theo chu kỳ ngày (INTERVAL) hoặc theo tháng (MONTHLY):
    // Phải lên lịch vào đúng NGÀY ĐẾN HẠN tiếp theo lúc hour:minute (không được rung chuông mỗi ngày!)
    const status = calculateHabitStatus(habit);
    const targetDueDate = status.dueDate || new Date();
    const triggerDate = new Date(
      targetDueDate.getFullYear(),
      targetDueDate.getMonth(),
      targetDueDate.getDate(),
      hour,
      minute,
      0,
      0
    );

    // iOS chỉ nhận trigger tương lai; việc quá hạn sẽ được thể hiện rõ trên thẻ thay vì tạo chuông giả.
    const now = new Date();
    if (triggerDate.getTime() <= now.getTime()) {
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Nhắc việc',
        body: `${formatTaskNameForNotification(habit.title)}\n${habit.note || 'Hôm nay là ngày đến hạn chu kỳ.'}`,
        sound: true,
        data: { habitId: habit.id, taskId: habit.id },
        ...(Platform.OS === 'android' ? { channelId: HABIT_REMINDER_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return id;
  } catch (err) {
    console.warn('Lỗi lên lịch thông báo việc vặt:', err);
    return null;
  }
}

/** Rebuild native schedules on app open; iOS accepts at most 64 pending notifications. */
export async function reconcileHabitReminders(habits = []) {
  const candidates = habits
    .filter((habit) => habit?.reminderEnabled && habit?.reminderTime)
    .map((habit) => ({ habit, dueDate: calculateHabitStatus(habit).dueDate || new Date(8640000000000000) }))
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 64);

  const permittedIds = new Set(candidates.map(({ habit }) => habit.id));
  const updated = [];
  for (const habit of habits) {
    if (!permittedIds.has(habit.id)) {
      if (habit.notificationId) await cancelHabitReminder(habit.notificationId);
      updated.push({ ...habit, notificationId: null });
      continue;
    }
    const notificationId = await scheduleHabitReminder(habit);
    updated.push({ ...habit, notificationId });
  }
  return updated;
}

/**
 * Hủy thông báo của việc vặt
 * @param {string} notificationId 
 */
export async function cancelHabitReminder(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

/**
 * Bắn thông báo thử nghiệm ngay lập tức sau 2 giây để người dùng kiểm tra âm thanh & banner trên iOS / Android
 */
export async function testInstantNotification(title = '🔔 Thử nghiệm thông báo', body = 'Thông báo việc vặt hoạt động chuẩn xác!') {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      throw new Error('Chưa cấp quyền thông báo trên thiết bị. Vui lòng cho phép quyền thông báo trong Cài đặt máy.');
    }

    await ensureHabitReminderChannel();

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        ...(Platform.OS === 'android' ? { channelId: HABIT_REMINDER_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 2,
      },
    });
    return true;
  } catch (err) {
    throw err;
  }
}

/**
 * Tính toán trạng thái hạn chót & màu sắc cảnh báo cho từng mục.
 * Gọi trực tiếp hàm duy nhất computeNextOccurrence để đảm bảo 100% tính nhất quán.
 */
export function calculateHabitStatus(item, now = new Date()) {
  const result = computeNextOccurrence(item, now);
  if (result) return result;

  return {
    daysRemaining: 0,
    urgency: 'safe',
    statusText: '',
    progress: 0,
    cycleInfo: 'Chu kỳ',
    dueDate: new Date(now),
  };
}

/**
 * Hàm duy nhất tính toán lần xuất hiện / nhắc nhở kế tiếp và trạng thái (VIỆC AE)
 * Dùng thống nhất cho:
 * 1. Bản xem trước trong form thêm / sửa
 * 2. Lên lịch thông báo OS
 * 3. Tính toán trạng thái hiển thị trên thẻ và 4 thẻ thống kê
 */
export function computeNextOccurrence(task, now = new Date(), startFrom = null) {
  if (!task) return null;
  const currentNow = new Date(now);
  const todayStr = getTodayDateString(currentNow);
  const tomorrowDate = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate() + 1);
  const tomorrowStr = getTodayDateString(tomorrowDate);

  const [hour, minute] = String(task.reminderTime || '08:00').split(':').map(Number);
  const validHour = Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 8;
  const validMinute = Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0;
  const timeFormatted = `${String(validHour).padStart(2, '0')}:${String(validMinute).padStart(2, '0')}`;

  const todayAtTime = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate(), validHour, validMinute, 0, 0);
  const passedToday = todayAtTime.getTime() <= currentNow.getTime();

  // Determine effective startDate
  let effectiveStartDate = startFrom !== null && startFrom !== undefined ? startFrom : task.startDate;
  if (effectiveStartDate instanceof Date) {
    effectiveStartDate = getTodayDateString(effectiveStartDate);
  } else if (typeof effectiveStartDate === 'string') {
    effectiveStartDate = effectiveStartDate.slice(0, 10);
  } else {
    effectiveStartDate = null;
  }

  // 1. ĐẾM LẦN TRONG NGÀY (DAILY COUNTER)
  if (task.type === HABIT_TYPES.DAILY) {
    const target = Math.max(1, parseInt(task.targetCount || 1, 10));
    const current = getDailyCompletionCount(task, currentNow);
    const isCompleted = current >= target;

    // Người dùng chọn bắt đầu từ ngày mai: hôm nay việc ở trạng thái Chưa đến hạn (not_due -> safe)
    if (effectiveStartDate === tomorrowStr || (effectiveStartDate && effectiveStartDate > todayStr)) {
      const nextDate = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate() + 1, validHour, validMinute, 0, 0);
      return {
        date: nextDate,
        isToday: false,
        isTomorrow: true,
        passedToday,
        diffMinutes: Math.max(0, Math.round((nextDate.getTime() - currentNow.getTime()) / 60000)),
        diffDays: 1,
        previewText: `${timeFormatted} hôm nay đã qua, nhắc đầu tiên: ngày mai ${timeFormatted}`,
        explanation: 'Bắt đầu từ ngày mai (hôm nay không tính).',
        urgency: 'safe', // Chưa đến hạn, không tính vào Sắp đến hạn hay Quá hạn của hôm nay
        statusGroup: 'safe',
        statusText: 'Chưa đến hạn (bắt đầu từ ngày mai)',
        progress: 0,
        isCompleted: false,
        currentCount: 0,
        targetCount: target,
        cycleInfo: `Mục tiêu ${target} ${task.unit || 'lần'}/ngày`,
        dueDate: nextDate,
      };
    }

    // Tính từ hôm nay
    if (passedToday) {
      const nextDate = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate() + 1, validHour, validMinute, 0, 0);
      const urgency = isCompleted ? 'completed' : 'warning';
      const statusText = isCompleted
        ? `Đã xong hôm nay (${current}/${target} ${task.unit || 'lần'})`
        : (current === 0 ? `Chưa đạt mục tiêu hôm nay (0/${target} ${task.unit || 'lần'})` : `Sắp đến hạn (${current}/${target} ${task.unit || 'lần'})`);

      return {
        date: nextDate,
        isToday: false,
        isTomorrow: true,
        passedToday: true,
        diffMinutes: Math.max(0, Math.round((nextDate.getTime() - currentNow.getTime()) / 60000)),
        diffDays: 1,
        previewText: `${timeFormatted} hôm nay đã qua, nhắc đầu tiên: ngày mai ${timeFormatted}`,
        explanation: 'Tính từ hôm nay (hôm nay vẫn theo dõi tiến độ, nhắc từ ngày mai).',
        urgency,
        statusGroup: urgency,
        statusText,
        progress: Math.min(1, current / target),
        isCompleted,
        currentCount: current,
        targetCount: target,
        cycleInfo: `Mục tiêu ${target} ${task.unit || 'lần'}/ngày`,
        dueDate: todayAtTime,
      };
    } else {
      // Giờ nhắc còn ở phía trước hôm nay
      const diffMinutes = Math.max(0, Math.round((todayAtTime.getTime() - currentNow.getTime()) / 60000));
      const urgency = isCompleted ? 'completed' : 'warning';
      const statusText = isCompleted
        ? `Đã xong hôm nay (${current}/${target} ${task.unit || 'lần'})`
        : (current === 0 ? `Chưa làm (0/${target} ${task.unit || 'lần'})` : `Sắp đến hạn (${current}/${target} ${task.unit || 'lần'})`);

      return {
        date: todayAtTime,
        isToday: true,
        isTomorrow: false,
        passedToday: false,
        diffMinutes,
        diffDays: 0,
        previewText: `Nhắc kế tiếp: hôm nay ${timeFormatted} (còn ${diffMinutes} phút)`,
        explanation: null,
        urgency,
        statusGroup: urgency,
        statusText,
        progress: Math.min(1, current / target),
        isCompleted,
        currentCount: current,
        targetCount: target,
        cycleInfo: `Mục tiêu ${target} ${task.unit || 'lần'}/ngày`,
        dueDate: todayAtTime,
      };
    }
  }

  // 2. CHU KỲ THEO SỐ NGÀY (INTERVAL)
  if (task.type === HABIT_TYPES.INTERVAL) {
    const intervalDays = Math.max(1, parseInt(task.intervalDays || 1, 10));
    let explanation = null;
    let baseDate;

    if (effectiveStartDate) {
      const parts = effectiveStartDate.split('-').map(Number);
      baseDate = new Date(parts[0], parts[1] - 1, parts[2], validHour, validMinute, 0, 0);
    } else if (task.lastCompletedDate) {
      const last = new Date(task.lastCompletedDate);
      baseDate = new Date(last.getFullYear(), last.getMonth(), last.getDate() + intervalDays, validHour, validMinute, 0, 0);
    } else {
      baseDate = new Date(currentNow.getFullYear(), currentNow.getMonth(), currentNow.getDate() + intervalDays, validHour, validMinute, 0, 0);
    }

    let targetDate = new Date(baseDate);

    // Nếu người dùng chọn ngày trong quá khứ -> tự đẩy tới lần đến hạn kế tiếp theo đúng chu kỳ (chặn an toàn tối đa 1000 bước)
    if (targetDate.getTime() < currentNow.getTime() && effectiveStartDate) {
      const diffMs = currentNow.getTime() - targetDate.getTime();
      const safeInterval = Number.isFinite(intervalDays) && intervalDays >= 1 ? intervalDays : 1;
      const rawCycles = Math.floor(diffMs / (safeInterval * 86400000)) + 1;
      const cycles = Math.min(1000, Math.max(1, Number.isFinite(rawCycles) ? rawCycles : 1));
      targetDate = new Date(targetDate.getTime() + cycles * safeInterval * 86400000);
      explanation = `Ngày chọn trong quá khứ đã được tự đẩy sang lần đến hạn kế tiếp (+${cycles * safeInterval} ngày) theo chu kỳ.`;
    }

    const daysRemaining = getDaysDiff(targetDate, currentNow);
    const isTargetToday = getTodayDateString(targetDate) === todayStr;
    const isTargetTomorrow = getTodayDateString(targetDate) === tomorrowStr;

    let previewText;
    if (isTargetToday) {
      if (passedToday) {
        previewText = `${timeFormatted} hôm nay đã qua, nhắc đầu tiên: ngày mai ${timeFormatted}`;
      } else {
        const diffMin = Math.max(0, Math.round((todayAtTime.getTime() - currentNow.getTime()) / 60000));
        previewText = `Nhắc kế tiếp: hôm nay ${timeFormatted} (còn ${diffMin} phút)`;
      }
    } else if (isTargetTomorrow) {
      previewText = `Nhắc kế tiếp: ngày mai ${timeFormatted}`;
    } else {
      previewText = `Lần đến hạn kế tiếp: ${targetDate.toLocaleDateString('vi-VN')} lúc ${timeFormatted} (còn ${daysRemaining} ngày)`;
    }

    let urgency = 'safe';
    let statusText = `Còn ${daysRemaining} ngày`;
    if (task.completedCycleAt) {
      urgency = 'completed';
      statusText = `Đã xong chu kỳ này (còn ${daysRemaining} ngày)`;
    } else if (daysRemaining < 0) {
      urgency = 'overdue';
      statusText = `Quá hạn ${Math.abs(daysRemaining)} ngày!`;
    } else if (daysRemaining === 0) {
      urgency = passedToday ? 'overdue' : 'warning';
      statusText = passedToday ? 'Hôm nay đến hạn (đã qua giờ nhắc)!' : 'Hôm nay đến hạn!';
    } else if (daysRemaining <= 3) {
      urgency = 'warning';
      statusText = `Sắp đến hạn (còn ${daysRemaining} ngày)`;
    }

    return {
      date: targetDate,
      isToday: isTargetToday,
      isTomorrow: isTargetTomorrow,
      passedToday: isTargetToday && passedToday,
      diffMinutes: Math.max(0, Math.round((targetDate.getTime() - currentNow.getTime()) / 60000)),
      diffDays: daysRemaining,
      daysRemaining,
      previewText,
      explanation,
      urgency,
      statusGroup: urgency,
      statusText,
      cycleInfo: `Mỗi ${intervalDays} ngày`,
      progress: Math.max(0, Math.min(1, 1 - daysRemaining / intervalDays)),
      dueDate: targetDate,
    };
  }

  // 3. CỐ ĐỊNH NGÀY HÀNG THÁNG (MONTHLY)
  if (task.type === HABIT_TYPES.MONTHLY) {
    const targetDay = Math.min(31, Math.max(1, parseInt(task.dayOfMonth || 1, 10)));
    let explanation = null;

    let targetDateThisMonth = getValidMonthlyDate(currentNow.getFullYear(), currentNow.getMonth(), targetDay);
    targetDateThisMonth.setHours(validHour, validMinute, 0, 0);

    let isCompletedForThisMonth = false;
    if (task.lastCompletedDate) {
      const lastDone = getMidnight(new Date(task.lastCompletedDate));
      if (lastDone.getFullYear() === currentNow.getFullYear() && lastDone.getMonth() === currentNow.getMonth()) {
        isCompletedForThisMonth = true;
      } else if (lastDone >= targetDateThisMonth) {
        isCompletedForThisMonth = true;
      }
    }

    let targetDate;
    if (isCompletedForThisMonth) {
      targetDate = getValidMonthlyDate(currentNow.getFullYear(), currentNow.getMonth() + 1, targetDay);
      targetDate.setHours(validHour, validMinute, 0, 0);
    } else if (targetDateThisMonth.getTime() <= currentNow.getTime()) {
      if (effectiveStartDate && new Date(effectiveStartDate) < targetDateThisMonth) {
        explanation = `Ngày chọn trong quá khứ đã được tự chuyển sang chu kỳ tháng kế tiếp.`;
      }
      targetDate = getValidMonthlyDate(currentNow.getFullYear(), currentNow.getMonth() + 1, targetDay);
      targetDate.setHours(validHour, validMinute, 0, 0);
    } else {
      targetDate = targetDateThisMonth;
    }

    const daysRemaining = getDaysDiff(targetDate, currentNow);
    const isTargetToday = getTodayDateString(targetDate) === todayStr;
    const isTargetTomorrow = getTodayDateString(targetDate) === tomorrowStr;

    let previewText;
    if (isTargetToday) {
      if (passedToday) {
        previewText = `${timeFormatted} hôm nay đã qua, nhắc đầu tiên: ngày mai ${timeFormatted}`;
      } else {
        const diffMin = Math.max(0, Math.round((todayAtTime.getTime() - currentNow.getTime()) / 60000));
        previewText = `Nhắc kế tiếp: hôm nay ${timeFormatted} (còn ${diffMin} phút)`;
      }
    } else if (isTargetTomorrow) {
      previewText = `Nhắc kế tiếp: ngày mai ${timeFormatted}`;
    } else {
      previewText = `Lần đến hạn kế tiếp: ${targetDate.toLocaleDateString('vi-VN')} lúc ${timeFormatted} (còn ${daysRemaining} ngày)`;
    }

    let urgency = 'safe';
    let statusText = `Còn ${daysRemaining} ngày`;
    if (isCompletedForThisMonth) {
      urgency = 'completed';
      statusText = `Đã xong tháng này (còn ${daysRemaining} ngày)`;
    } else if (daysRemaining < 0) {
      urgency = 'overdue';
      statusText = `Quá hạn ${Math.abs(daysRemaining)} ngày!`;
    } else if (daysRemaining === 0) {
      urgency = passedToday ? 'overdue' : 'warning';
      statusText = passedToday ? 'Hôm nay đến hạn (đã qua giờ nhắc)!' : 'Hôm nay đến hạn!';
    } else if (daysRemaining <= 3) {
      urgency = 'warning';
      statusText = `Sắp đến hạn (còn ${daysRemaining} ngày)`;
    }

    return {
      date: targetDate,
      isToday: isTargetToday,
      isTomorrow: isTargetTomorrow,
      passedToday: isTargetToday && passedToday,
      diffMinutes: Math.max(0, Math.round((targetDate.getTime() - currentNow.getTime()) / 60000)),
      diffDays: daysRemaining,
      daysRemaining,
      previewText,
      explanation,
      urgency,
      statusGroup: urgency,
      statusText,
      cycleInfo: `Ngày ${targetDay} hàng tháng`,
      progress: isCompletedForThisMonth ? 1 : Math.max(0, 1 - daysRemaining / 30),
      dueDate: targetDate,
    };
  }

  return null;
}

// Dữ liệu mẫu ban đầu chuẩn thực tế
export const DEFAULT_HABITS = [
  {
    id: 'habit-oil',
    title: 'Thay nhớt xe máy',
    type: HABIT_TYPES.INTERVAL,
    intervalDays: 45,
    lastCompletedDate: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(), // Còn 9 ngày
    icon: 'construct',
    color: '#F59E0B',
    category: 'Xe cộ',
    note: 'Nhớt tổng hợp 10W40, kiểm tra cả nước mát',
    reminderEnabled: false,
    reminderTime: '08:00',
    notificationId: null,
    history: [
      { id: '1', timestamp: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(), note: 'Thay nhớt Motul 7100' }
    ],
  },
  {
    id: 'habit-water-gas',
    title: 'Gọi bình nước lọc / Đổi bình ga',
    type: HABIT_TYPES.INTERVAL,
    intervalDays: 15,
    lastCompletedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // Còn 1 ngày (Sắp hết)
    icon: 'water',
    color: '#3B82F6',
    category: 'Gia đình',
    note: 'Đại lý Lavie / Gas Petrolimex gần nhà',
    reminderEnabled: true,
    reminderTime: '09:00',
    notificationId: null,
    history: [],
  },
  {
    id: 'habit-bedsheet',
    title: 'Giặt chăn ga gối đệm',
    type: HABIT_TYPES.INTERVAL,
    intervalDays: 14,
    lastCompletedDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000).toISOString(), // Quá hạn 3 ngày (Đỏ)
    icon: 'bed',
    color: '#8B5CF6',
    category: 'Nhà cửa',
    note: 'Ngâm xả Comfort và phơi nắng to',
    reminderEnabled: false,
    reminderTime: '08:00',
    notificationId: null,
    history: [],
  },
  {
    id: 'habit-rent',
    title: 'Đóng tiền trọ & Điện nước',
    type: HABIT_TYPES.MONTHLY,
    dayOfMonth: 5,
    lastCompletedDate: null,
    icon: 'home',
    color: '#EF4444',
    category: 'Chi phí',
    note: 'Chuyển khoản qua số tài khoản chủ nhà',
    reminderEnabled: true,
    reminderTime: '08:30',
    notificationId: null,
    history: [],
  },
  {
    id: 'habit-internet',
    title: 'Gia hạn gói cước 4G / Internet',
    type: HABIT_TYPES.MONTHLY,
    dayOfMonth: 20,
    lastCompletedDate: null,
    icon: 'wifi',
    color: '#06B6D4',
    category: 'Dịch vụ',
    note: 'Gói 120k/tháng Viettel',
    reminderEnabled: false,
    reminderTime: '09:00',
    notificationId: null,
    history: [],
  },
  {
    id: 'habit-medicine',
    title: 'Uống thuốc / Vitamin',
    type: HABIT_TYPES.DAILY,
    targetCount: 2,
    currentCount: 1,
    unit: 'lần',
    lastDailyDate: getTodayDateString(),
    icon: 'medkit',
    color: '#EC4899',
    category: 'Sức khỏe',
    note: 'Uống sau bữa ăn sáng và tối',
    reminderEnabled: true,
    reminderTime: '08:00',
    notificationId: null,
    history: [],
  },
  {
    id: 'habit-drink-water',
    title: 'Uống đủ nước lọc mỗi ngày',
    type: HABIT_TYPES.DAILY,
    targetCount: 8,
    currentCount: 4,
    unit: 'cốc',
    lastDailyDate: getTodayDateString(),
    icon: 'pint',
    color: '#10B981',
    category: 'Sức khỏe',
    note: 'Mỗi cốc khoảng 250ml (tổng 2L/ngày)',
    reminderEnabled: false,
    reminderTime: '10:00',
    notificationId: null,
    history: [],
  },
];

// Lưu danh sách việc vặt
export async function saveHabits(habits) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_HABITS, JSON.stringify(habits));
    return true;
  } catch (err) {
    console.warn('Lỗi lưu danh sách việc vặt:', err);
    return false;
  }
}

// Tải danh sách việc vặt (tự động điền dữ liệu mẫu nếu chưa có)
export async function loadHabits() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HABITS);
    if (!raw) {
      await saveHabits(DEFAULT_HABITS);
      return DEFAULT_HABITS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const todayStr = getTodayDateString();
      // Tự động kiểm tra reset daily counters nếu sang ngày mới
      const validated = parsed.map((item) => {
        let updated = { ...item };
        if (item.type === HABIT_TYPES.DAILY && item.lastDailyDate !== todayStr) {
          updated.currentCount = 0;
          updated.lastDailyDate = todayStr;
        }
        if (updated.reminderEnabled === undefined) {
          updated.reminderEnabled = false;
        }
        if (!updated.reminderTime) {
          updated.reminderTime = '08:00';
        }
        return updated;
      });
      return validated;
    }
    return DEFAULT_HABITS;
  } catch {
    return DEFAULT_HABITS;
  }
}

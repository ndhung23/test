// src/features/micro-habit/NotificationService.js
// Single native-notification boundary. UI code must not call expo-notifications directly.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { HABIT_TYPES, calculateHabitStatus, computeNextOccurrence, formatTaskNameForNotification } from './microHabitService';

export const HABIT_REMINDER_CHANNEL = 'habit-reminders';
export const MANAGED_BY = 'micro-habit';
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
const MAX_PRE_SCHEDULE_DAYS = 7;
const MAX_SYSTEM_NOTIFICATIONS = 60; // iOS hard limit is 64

const debugLog = [];
let queue = Promise.resolve();

function nowLog(action, detail = {}) {
  const entry = { at: new Date().toISOString(), action, ...detail };
  debugLog.unshift(entry);
  if (debugLog.length > 100) debugLog.pop();
  console.info('[HabitNotification]', entry);
}

function serial(work) {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}

export function getNotificationDebugLog() { return [...debugLog]; }

export async function ensureHabitReminderChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(HABIT_REMINDER_CHANNEL, {
    name: 'Nhắc nhở việc vặt',
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

export function getReminderKey(habit, dateSuffix = 'master') {
  return `task:${habit.id}:${habit.type}:${dateSuffix}`;
}

export function normalizeTriggerData(trigger) {
  if (!trigger) return null;
  const isDate = trigger.type === 'date' || Boolean(trigger.date) || Boolean(trigger.value) || typeof trigger.timestamp === 'number';
  if (isDate) {
    const raw = trigger.date || trigger.value || trigger.timestamp;
    const date = new Date(raw);
    return { type: 'date', timestamp: date.getTime(), date };
  }
  const hour = trigger.hour ?? trigger.dateComponents?.hour;
  const minute = trigger.minute ?? trigger.dateComponents?.minute;
  const second = trigger.second ?? trigger.dateComponents?.second ?? 0;
  const repeats = trigger.repeats ?? (trigger.type === 'daily' || trigger.type === 'calendar');
  if (Number.isInteger(hour) && Number.isInteger(minute)) {
    return {
      type: trigger.type || 'calendar',
      hour,
      minute,
      second,
      repeats: Boolean(repeats),
      timezone: trigger.timezone || TIMEZONE,
    };
  }
  return { type: trigger.type || 'unknown' };
}

export function triggerSignature(trigger) {
  const norm = normalizeTriggerData(trigger);
  if (!norm) return 'none';
  if (norm.type === 'date') return `date:${norm.timestamp}`;
  if (norm.hour !== undefined && norm.minute !== undefined) {
    return `time:${norm.hour}:${norm.minute}:${norm.second}:${norm.repeats ? 'repeat' : 'once'}`;
  }
  return `${norm.type}`;
}

export function buildHabitReminderTrigger(habit, now = new Date()) {
  const [hour, minute] = String(habit.reminderTime || '').split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  if (habit.type === HABIT_TYPES.DAILY) {
    return Platform.OS === 'ios'
      ? {
          type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
          hour,
          minute,
          second: 0,
          timezone: TIMEZONE,
          repeats: true,
        }
      : {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        };
  }

  // INTERVAL & MONTHLY
  const due = calculateHabitStatus(habit, now).dueDate;
  if (!due) return null;
  const date = new Date(due.getFullYear(), due.getMonth(), due.getDate(), hour, minute, 0, 0);
  return date > now ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date } : null;
}

export function getNextOccurrenceForTrigger(trigger, now = new Date()) {
  const norm = normalizeTriggerData(trigger);
  if (!norm) return null;
  if (norm.type === 'date') return norm.date;
  if (!Number.isInteger(norm.hour) || !Number.isInteger(norm.minute)) return null;
  const next = new Date(now);
  next.setHours(norm.hour, norm.minute, norm.second || 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export function getTriggerSummary(trigger) {
  const norm = normalizeTriggerData(trigger);
  if (!norm) return 'Không xác định';
  if (norm.type === 'date') return `Ngày ${norm.date.toLocaleString('vi-VN')}`;
  if (norm.hour !== undefined && norm.minute !== undefined) {
    const h = String(norm.hour).padStart(2, '0');
    const m = String(norm.minute).padStart(2, '0');
    const s = String(norm.second || 0).padStart(2, '0');
    return `Hàng ngày lúc ${h}:${m}:${s} (GMT+7)`;
  }
  return 'Không xác định';
}

async function permissionGranted() {
  await ensureHabitReminderChannel();
  await requestAndroidExactAlarmPermission();
  let permission = await Notifications.getPermissionsAsync();
  if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
  return permission.status === 'granted';
}

function contentFor(habit, key, subNote = '') {
  const noteText = subNote || habit.note || 'Đã đến giờ hoàn thành công việc.';
  return {
    title: '🔔 Nhắc việc',
    body: `${formatTaskNameForNotification(habit.title)}\n${noteText}`,
    sound: true,
    data: {
      taskId: habit.id,
      habitId: habit.id,
      notificationKey: key,
      managedBy: MANAGED_BY,
      reminderTime: habit.reminderTime,
      timezone: TIMEZONE,
    },
    ...(Platform.OS === 'android' ? { channelId: HABIT_REMINDER_CHANNEL } : {}),
  };
}

/**
 * Builds upcoming date triggers for daily tasks (7 days ahead)
 * Guarantees reminders fire even when app remains killed for days.
 * Supports reminderIntervalTotalMinutes (custom hour+minute interval) and reminderIntervalHours (legacy).
 * Respects reminderEndTime to stop generating slots after end time.
 */
export function buildUpcomingDailyTriggers(habit, daysCount = MAX_PRE_SCHEDULE_DAYS, now = new Date()) {
  const [startHour, startMinute] = String(habit.reminderTime || '').split(':').map(Number);
  if (!Number.isInteger(startHour) || !Number.isInteger(startMinute)) return [];
  const list = [];

  // Determine interval in minutes — support new custom field first, then legacy hourly field
  let intervalMinutes = 0;
  if (habit.reminderIntervalTotalMinutes && habit.reminderIntervalTotalMinutes >= 15) {
    intervalMinutes = habit.reminderIntervalTotalMinutes;
  } else {
    const intervalHours = parseInt(habit.reminderIntervalHours || 0, 10);
    intervalMinutes = intervalHours > 0 ? intervalHours * 60 : 0;
  }

  const targetCount = Math.max(1, parseInt(habit.targetCount || 1, 10));

  // Parse optional end time
  let endMinutes = 23 * 60 + 59;
  if (habit.reminderEndTime) {
    const [eh, em] = String(habit.reminderEndTime).split(':').map(Number);
    if (Number.isInteger(eh) && Number.isInteger(em)) {
      endMinutes = eh * 60 + em;
    }
  }

  // Determine reminder slots within each day
  const timeSlots = [];
  if (intervalMinutes >= 15) {
    const maxSlots = Math.min(targetCount, 8); // At most 8 slots a day to protect OS limits
    let cur = startHour * 60 + startMinute;
    while (timeSlots.length < maxSlots && cur <= endMinutes) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      if (h < 24) timeSlots.push({ hour: h, minute: m });
      cur += intervalMinutes;
    }
  } else {
    timeSlots.push({ hour: startHour, minute: startMinute });
  }

  const safeDays = Math.min(14, Math.max(1, daysCount));
  for (let dayOffset = 0; dayOffset < safeDays; dayOffset++) {
    for (let slotIdx = 0; slotIdx < timeSlots.length; slotIdx++) {
      const { hour, minute } = timeSlots[slotIdx];
      const occDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, hour, minute, 0, 0);
      if (occDate.getTime() <= now.getTime()) continue;

      const dateKey = `${occDate.getFullYear()}-${String(occDate.getMonth() + 1).padStart(2, '0')}-${String(occDate.getDate()).padStart(2, '0')}-slot-${slotIdx}`;
      list.push({
        date: occDate,
        dateKey,
        key: getReminderKey(habit, dateKey),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: occDate,
        },
      });
      if (list.length >= 35) break; // Hard safety cap across all future days
    }
    if (list.length >= 35) break;
  }
  return list;
}

async function scheduleOne(habit, now = new Date()) {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const existingForTask = pending.filter((item) =>
    item.content?.data?.taskId === habit?.id ||
    item.content?.data?.habitId === habit?.id ||
    (habit?.notificationId && item.identifier === habit.notificationId)
  );

  // If reminders are disabled, clear all pending notifications for this task
  if (!habit?.reminderEnabled || !habit.reminderTime) {
    await Promise.all(existingForTask.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})));
    nowLog('cancelled-disabled', { taskId: habit?.id, count: existingForTask.length });
    return null;
  }

  // Daily task completed today: cancel today's alert if still scheduled
  if (habit.type === HABIT_TYPES.DAILY && calculateHabitStatus(habit, now).isCompleted) {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const todayNotifications = existingForTask.filter((item) => item.content?.data?.notificationKey?.includes(todayStr));
    await Promise.all(todayNotifications.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})));
    nowLog('cancelled-today-completed', { taskId: habit.id });
  }

  if (!await permissionGranted()) {
    nowLog('permission-denied', { taskId: habit.id });
    return null;
  }

  // Clean stale notifications for this task before re-scheduling
  await Promise.all(existingForTask.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})));

  // DAILY: use pre-scheduled DATE triggers exclusively (more reliable in Expo Go than CALENDAR/DAILY repeating triggers)
  if (habit.type === HABIT_TYPES.DAILY) {
    const futureTriggers = buildUpcomingDailyTriggers(habit, MAX_PRE_SCHEDULE_DAYS, now);
    if (futureTriggers.length === 0) {
      nowLog('skip-no-future-triggers', { taskId: habit.id });
      return null;
    }
    let firstId = null;
    for (const item of futureTriggers) {
      const id = await Notifications.scheduleNotificationAsync({
        content: contentFor(habit, item.key, `Mục tiêu hàng ngày lúc ${habit.reminderTime}`),
        trigger: item.trigger,
      }).catch((err) => { console.warn('[HabitNotification] Pre-schedule warning:', err.message); return null; });
      if (id && !firstId) firstId = id;
    }
    const nextAt = futureTriggers[0]?.date?.toISOString() || null;
    nowLog('scheduled-daily-date-triggers', { taskId: habit.id, count: futureTriggers.length, nextAt });
    return firstId;
  }

  // INTERVAL & MONTHLY: one-shot DATE trigger at next due date
  const masterTrigger = buildHabitReminderTrigger(habit, now);
  if (!masterTrigger) {
    nowLog('skip-past-or-invalid', { taskId: habit.id });
    return null;
  }

  const masterKey = getReminderKey(habit, 'master');
  const masterId = await Notifications.scheduleNotificationAsync({
    content: contentFor(habit, masterKey),
    trigger: masterTrigger,
  });

  const nativeNext = Notifications.getNextTriggerDateAsync ? await Notifications.getNextTriggerDateAsync(masterTrigger).catch(() => null) : null;
  const nextAt = nativeNext ? new Date(nativeNext).toISOString() : getNextOccurrenceForTrigger(masterTrigger, now)?.toISOString() || null;
  nowLog('scheduled-master', { taskId: habit.id, key: masterKey, id: masterId, trigger: triggerSignature(masterTrigger), nextAt });

  return masterId;
}

export function scheduleHabitReminder(habit) {
  return serial(() => scheduleOne(habit));
}

export function cancelHabitReminder(notificationId, reason = 'explicit') {
  return serial(async () => {
    if (!notificationId) return;
    await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
    nowLog('cancelled', { id: notificationId, reason });
  });
}

export function cancelHabitRemindersForTask(taskId, reason = 'task-deleted') {
  return serial(async () => {
    if (!taskId) return;
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const targets = pending.filter((item) =>
      item.content?.data?.taskId === taskId || item.content?.data?.habitId === taskId
    );
    await Promise.all(targets.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})));
    nowLog('cancelled-all-for-task', { taskId, count: targets.length, reason });
  });
}

export function reconcileHabitReminders(habits = []) {
  return serial(async () => {
    if (!Array.isArray(habits) || habits.length === 0) {
      nowLog('reconcile-skipped-empty-habits');
      return habits;
    }

    const now = new Date();
    const activeHabits = habits.filter((h) => h?.reminderEnabled && h?.reminderTime);
    const activeTaskIds = new Set(activeHabits.map((h) => h.id));

    const pending = await Notifications.getAllScheduledNotificationsAsync();
    const managedItems = pending.filter((item) => item.content?.data?.managedBy === MANAGED_BY);

    // 1. Cancel orphan notifications whose tasks no longer exist or disabled reminders
    const orphans = managedItems.filter((item) => {
      const taskId = item.content?.data?.taskId || item.content?.data?.habitId;
      return !taskId || !activeTaskIds.has(taskId);
    });
    await Promise.all(orphans.map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => {})));
    if (orphans.length > 0) nowLog('cancelled-orphans', { count: orphans.length });

    // 2. Reconcile active habits
    const updatedHabits = [...habits];
    for (const habit of activeHabits) {
      const taskNotifications = managedItems.filter((item) =>
        (item.content?.data?.taskId === habit.id || item.content?.data?.habitId === habit.id) &&
        !orphans.some((o) => o.identifier === item.identifier)
      );

      let masterId = null;

      if (habit.type === HABIT_TYPES.DAILY) {
        // For DAILY: check if we have upcoming DATE triggers already scheduled (next 2 days at minimum)
        const futureDate = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
        const hasFutureDateTriggers = taskNotifications.some((item) => {
          const norm = normalizeTriggerData(item.trigger);
          return norm?.type === 'date' && norm.timestamp > now.getTime() && norm.timestamp < futureDate.getTime();
        });
        // Always re-schedule to fill the 7-day window whenever we reconcile
        masterId = await scheduleOne(habit, now);
        if (masterId) nowLog('reconciled-daily-rescheduled', { taskId: habit.id, hadFuture: hasFutureDateTriggers });
      } else {
        // INTERVAL / MONTHLY: check if master trigger still matches
        const desiredTrigger = buildHabitReminderTrigger(habit, now);
        const masterKey = getReminderKey(habit, 'master');
        const matchingMaster = taskNotifications.find((item) =>
          (item.content?.data?.notificationKey === masterKey || !item.content?.data?.notificationKey?.includes('day:')) &&
          triggerSignature(item.trigger) === triggerSignature(desiredTrigger)
        );
        masterId = matchingMaster?.identifier || null;
        if (!matchingMaster) {
          masterId = await scheduleOne(habit, now);
          nowLog('reconciled-rescheduled', { taskId: habit.id, newId: masterId });
        }
      }

      const idx = updatedHabits.findIndex((h) => h.id === habit.id);
      if (idx >= 0) {
        updatedHabits[idx] = { ...updatedHabits[idx], notificationId: masterId };
      }
    }

    nowLog('reconciled-finished', { totalActive: activeHabits.length });
    return updatedHabits;
  });
}

export async function getAllScheduledHabitReminders() {
  const items = await Notifications.getAllScheduledNotificationsAsync();
  return Promise.all(items
    .filter((item) => item.content?.data?.managedBy === MANAGED_BY)
    .map(async (item) => {
      const trigger = item.trigger || {};
      const nativeNext = Notifications.getNextTriggerDateAsync ? await Notifications.getNextTriggerDateAsync(trigger).catch(() => null) : null;
      const nextAt = nativeNext ? new Date(nativeNext).toISOString() : getNextOccurrenceForTrigger(trigger)?.toISOString() || null;
      const triggerSummary = getTriggerSummary(trigger);
      return {
        id: item.identifier,
        taskId: item.content?.data?.taskId || item.content?.data?.habitId,
        title: item.content?.title,
        body: item.content?.body,
        notificationKey: item.content?.data?.notificationKey,
        trigger,
        normalizedTrigger: normalizeTriggerData(trigger),
        triggerSummary,
        nextAt,
      };
    }));
}

export function testInstantNotification(taskId, title = '🔔 Thử chuông', body = 'Thông báo việc vặt hoạt động.') {
  return serial(async () => {
    if (!taskId) throw new Error('Chọn một việc trước khi thử chuông.');
    if (!await permissionGranted()) throw new Error('Chưa được cấp quyền thông báo.');
    // Use DATE trigger (same type as real notifications) +2 seconds
    // This validates the full scheduling path used by real reminders
    const fireAt = new Date(Date.now() + 2000);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { taskId, habitId: taskId, managedBy: MANAGED_BY, test: true },
        ...(Platform.OS === 'android' ? { channelId: HABIT_REMINDER_CHANNEL } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    nowLog('test-scheduled', { taskId, id, fireAt: fireAt.toISOString() });
    return id;
  });
}

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  ensureHabitReminderChannel().catch(() => {});
} catch { /* Expo Go fallback */ }

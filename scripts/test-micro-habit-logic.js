import assert from 'node:assert';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { transformFileSync } from '@babel/core';

const here = path.dirname(fileURLToPath(import.meta.url));
const nodeRequire = createRequire(import.meta.url);
const source = path.join(here, '..', 'src', 'features', 'micro-habit', 'microHabitService.js');
const transformed = transformFileSync(source, { presets: ['babel-preset-expo'] }).code;
const module = { exports: {} };
const notifications = { setNotificationHandler() {}, setNotificationChannelAsync() {} };
vm.runInNewContext(transformed, {
  module,
  exports: module.exports,
  require: (name) => {
    if (name === 'react-native') return { Platform: { OS: 'ios' } };
    if (name.includes('async-storage')) return {};
    if (name === 'expo-notifications') return notifications;
    if (name.startsWith('@babel/runtime/')) return nodeRequire(name);
    throw new Error(`Unexpected module: ${name}`);
  },
  console,
  Date,
  Math,
  setTimeout,
});

const { HABIT_TYPES, calculateHabitStatus, normalizeHabitSearch, getHabitStats, filterHabits, validateCategoryName, validateHabitTitle, formatTaskNameForNotification, createHabitClone, getSeriesCompletionCount, getHabitStatusGroup, recordCompletion, undoCompletion } = module.exports;
const atLocalMidnight = (year, month, day) => new Date(year, month - 1, day, 0, 0, 0, 0);
const cases = [
  ['hôm nay đến hạn', { type: HABIT_TYPES.MONTHLY, dayOfMonth: 31 }, atLocalMidnight(2026, 10, 31), 'Hôm nay đến hạn!', 0],
  ['đã hoàn thành tháng này', { type: HABIT_TYPES.MONTHLY, dayOfMonth: 31, lastCompletedDate: atLocalMidnight(2026, 10, 31).toISOString() }, atLocalMidnight(2026, 10, 31), 'Đã xong tháng này (còn 30 ngày)', 30],
  ['tháng 2 thường co ngày 31', { type: HABIT_TYPES.MONTHLY, dayOfMonth: 31 }, atLocalMidnight(2026, 2, 28), 'Hôm nay đến hạn!', 0],
  ['tháng 2 nhuận co ngày 31', { type: HABIT_TYPES.MONTHLY, dayOfMonth: 31 }, atLocalMidnight(2028, 2, 29), 'Hôm nay đến hạn!', 0],
  ['qua năm', { type: HABIT_TYPES.MONTHLY, dayOfMonth: 31, lastCompletedDate: atLocalMidnight(2026, 12, 31).toISOString() }, atLocalMidnight(2026, 12, 31), 'Đã xong tháng này (còn 31 ngày)', 31],
  ['chu kỳ ngày qua tháng', { type: HABIT_TYPES.INTERVAL, intervalDays: 7, lastCompletedDate: atLocalMidnight(2026, 1, 29).toISOString() }, atLocalMidnight(2026, 2, 2), 'Sắp đến hạn (còn 3 ngày)', 3],
];

for (const [name, habit, now, text, days] of cases) {
  const result = calculateHabitStatus(habit, now);
  assert.equal(result.statusText, text, name);
  assert.equal(result.daysRemaining, days, name);
  console.log(`[PASS] ${name}: ${result.statusText}`);
}

assert.equal(normalizeHabitSearch('  Rửa Xe ĐẸp  '), 'rua xe dep');
assert.equal(normalizeHabitSearch('ĐỒ Đạc'), 'do dac');
assert.equal(normalizeHabitSearch('   '), '');
const searchable = [
  { id: '1', title: 'Rửa xe sạch sẽ', category: 'Xe cộ', type: HABIT_TYPES.INTERVAL, status: { urgency: 'overdue' } },
  { id: '2', title: 'Uống nước', category: 'Sức khỏe', type: HABIT_TYPES.DAILY, status: { urgency: 'warning' } },
  { id: '3', title: 'Đóng tiền trọ', category: 'Chi phí', type: HABIT_TYPES.MONTHLY, status: { urgency: 'safe' } },
];
const totals = getHabitStats(searchable);
assert.equal(totals.overdue + totals.warning + totals.safe, totals.total);
assert.equal(filterHabits(searchable, { statusFilter: 'overdue' }).length, totals.overdue);
assert.equal(filterHabits(searchable, { search: 'rua xe' }).length, 1);
assert.equal(filterHabits(searchable, { search: 'XE CO' }).length, 1);
assert.equal(filterHabits(searchable, { typeFilter: HABIT_TYPES.INTERVAL, statusFilter: 'overdue', search: 'rua' }).length, 1);
assert.equal(filterHabits(searchable, { typeFilter: HABIT_TYPES.DAILY, statusFilter: 'overdue', search: 'nuoc' }).length, 0);
assert.equal(validateCategoryName('   '), 'Vui lòng nhập tên danh mục.');
assert.equal(validateCategoryName('Sinh hoạt'), 'Tên danh mục đã có.');
assert.equal(validateCategoryName('🎉 Việc đặc biệt'), null);
assert.equal(validateCategoryName('x'.repeat(21)), 'Tên danh mục tối đa 20 ký tự.');
assert.equal(validateHabitTitle('x'.repeat(61)), 'Tên không được vượt quá 60 ký tự.');
assert.equal(formatTaskNameForNotification('Rửa xe sạch sẽ vào cuối tuần', 20), 'Rửa xe sạch sẽ vào…');
assert.equal(formatTaskNameForNotification('x'.repeat(60), 20), `${'x'.repeat(19)}…`);
const original = { id: 'old', title: 'Rửa xe', type: HABIT_TYPES.INTERVAL, intervalDays: 30, category: 'Xe cộ', color: '#10B981', reminderEnabled: true, reminderTime: '09:00', note: 'Ghi chú', history: [{ id: 'done' }] };
const clone = createHabitClone(original, atLocalMidnight(2028, 2, 1));
assert.notEqual(clone.id, original.id);
assert.equal(clone.seriesId, original.id);
assert.equal(clone.title, original.title);
assert.equal(clone.category, original.category);
assert.equal(clone.history.length, 0);
assert.equal(clone.lastCompletedDate, atLocalMidnight(2028, 2, 1).toISOString());
assert.equal(getSeriesCompletionCount(original, [original, clone]), 1);
assert.equal(getHabitStatusGroup(calculateHabitStatus({ type: HABIT_TYPES.DAILY, targetCount: 2, currentCount: 2, lastDailyDate: '2026-10-31' }, atLocalMidnight(2026, 10, 31))), 'completed');
assert.equal(getHabitStatusGroup(calculateHabitStatus({ type: HABIT_TYPES.MONTHLY, dayOfMonth: 31, lastCompletedDate: atLocalMidnight(2026, 10, 31).toISOString() }, atLocalMidnight(2026, 10, 31))), 'completed');
assert.equal(getHabitStatusGroup(calculateHabitStatus({ type: HABIT_TYPES.INTERVAL, intervalDays: 30, completedCycleAt: atLocalMidnight(2026, 10, 31).toISOString(), lastCompletedDate: atLocalMidnight(2026, 10, 31).toISOString() }, atLocalMidnight(2026, 10, 31))), 'completed');
const dailyNow = new Date(2026, 9, 31, 10, 0, 0);
const daily = { id: 'daily', type: HABIT_TYPES.DAILY, targetCount: 2, unit: 'lần', currentCount: 0, lastDailyDate: '2026-10-31', history: [] };
const fromCard = recordCompletion(daily, dailyNow);
const fromSheet = recordCompletion(daily, dailyNow);
assert.equal(calculateHabitStatus(fromCard, dailyNow).currentCount, calculateHabitStatus(fromSheet, dailyNow).currentCount, 'card and sheet use the same reducer result');
assert.equal(calculateHabitStatus(fromCard, dailyNow).currentCount, 1);
const twoDone = recordCompletion(fromCard, dailyNow);
assert.equal(calculateHabitStatus(twoDone, dailyNow).isCompleted, true);
const overTarget = recordCompletion(twoDone, dailyNow);
assert.equal(calculateHabitStatus(overTarget, dailyNow).currentCount, 3, 'over-target activity remains recorded');
const undone = undoCompletion(overTarget, dailyNow);
assert.equal(calculateHabitStatus(undone, dailyNow).currentCount, 2);
const nextDay = calculateHabitStatus(undone, new Date(2026, 10, 1, 0, 1, 0));
assert.equal(nextDay.currentCount, 0, 'daily progress resets after midnight');
let rapid = { ...daily };
for (let index = 0; index < 5; index += 1) rapid = recordCompletion(rapid, dailyNow);
assert.equal(calculateHabitStatus(rapid, dailyNow).currentCount, 5, 'five sequential clicks preserve all events');
const interval = recordCompletion({ id: 'i', type: HABIT_TYPES.INTERVAL, intervalDays: 7, history: [] }, dailyNow);
const monthly = recordCompletion({ id: 'm', type: HABIT_TYPES.MONTHLY, dayOfMonth: 5, history: [] }, dailyNow);
assert.equal(interval.history.length, 1);
assert.equal(monthly.history.length, 1);
console.log(`Kết quả: ${cases.length + 36}/${cases.length + 36} kiểm tra logic nguồn thực đã pass.`);

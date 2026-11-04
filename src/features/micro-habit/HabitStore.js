// Single source of truth for list, TaskSheet and notification reconciliation.
import { loadHabits, saveHabits, recordCompletion, undoCompletion } from './microHabitService';
import { scheduleHabitReminder } from './NotificationService';

let habits = [];
let loaded = false;
let loading = null;
let writeQueue = Promise.resolve();
const listeners = new Set();

function emit() { listeners.forEach((listener) => listener(habits)); }

export async function ensureHabitsLoaded() {
  if (loaded) return habits;
  if (!loading) loading = loadHabits().then((items) => { habits = items; loaded = true; emit(); return habits; }).finally(() => { loading = null; });
  return loading;
}

export function getHabits() { return habits; }
export function subscribeHabits(listener) { listeners.add(listener); if (loaded) listener(habits); return () => listeners.delete(listener); }

export async function setHabits(next) {
  habits = next;
  loaded = true;
  emit();
  await saveHabits(next);
  return habits;
}

export async function updateHabit(id, updater) {
  await ensureHabitsLoaded();
  const work = writeQueue.then(async () => {
    const current = habits.find((item) => item.id === id);
    if (!current) return habits;
    const next = await updater(current);
    return setHabits(habits.map((item) => item.id === id ? next : item));
  });
  writeQueue = work.catch(() => {});
  return work;
}

export async function recordHabitCompletion(id, now = new Date()) {
  return updateHabit(id, async (habit) => {
    const completed = recordCompletion(habit, now);
    completed.notificationId = await scheduleHabitReminder(completed);
    return completed;
  });
}

export async function undoHabitCompletion(id, now = new Date()) {
  return updateHabit(id, async (habit) => {
    const updated = undoCompletion(habit, now);
    updated.notificationId = await scheduleHabitReminder(updated);
    return updated;
  });
}

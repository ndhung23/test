import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { calculateHabitStatus, createHabitClone, HABIT_TYPES } from './microHabitService';
import { clearPendingTask, getPendingTaskId, subscribeTaskSheet } from './TaskSheetStore';
import { scheduleHabitReminder } from './NotificationService';
import { ensureHabitsLoaded, setHabits as saveSharedHabits, subscribeHabits, recordHabitCompletion, undoHabitCompletion } from './HabitStore';

export default function TaskSheetHost({ navigationReady, navigateToTask }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [taskId, setTaskId] = useState(getPendingTaskId());
  const [habits, setHabits] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [missingTask, setMissingTask] = useState(false);

  useEffect(() => subscribeTaskSheet((id) => { if (id) setMissingTask(false); setTaskId(id); }), []);
  useEffect(() => {
    let active = true;
    ensureHabitsLoaded().then((items) => { if (active) { setHabits(items); setLoaded(true); console.info('[TaskSheet]', { stage: 'data-loaded', count: items.length }); } });
    return () => { active = false; };
  }, [taskId]);
  useEffect(() => subscribeHabits(setHabits), []);

  useEffect(() => {
    if (navigationReady && loaded && taskId && !habits.some((item) => item.id === taskId)) {
      setMissingTask(true);
      clearPendingTask();
    }
  }, [navigationReady, loaded, taskId, habits]);

  const selectedHabit = habits.find((item) => item.id === taskId);
  useEffect(() => {
    if (navigationReady && loaded && selectedHabit) console.info('[TaskSheet]', { at: new Date().toISOString(), stage: 'task-found-sheet-open', taskId });
  }, [navigationReady, loaded, selectedHabit, taskId]);

  if (missingTask) {
    return <Modal visible transparent onRequestClose={() => setMissingTask(false)}><View style={styles.missing}><Text>Việc này không còn tồn tại.</Text><Pressable onPress={() => setMissingTask(false)}><Text>Đóng</Text></Pressable></View></Modal>;
  }
  if (!navigationReady || !loaded || !taskId) return null;
  const habit = selectedHabit;
  if (!habit) return null;
  const status = calculateHabitStatus(habit);
  const close = () => clearPendingTask();
  const cloneTask = async () => {
    const clone = createHabitClone(habit);
    clone.notificationId = await scheduleHabitReminder(clone);
    const updated = [clone, ...habits];
    await saveSharedHabits(updated);
    setHabits(updated);
    close();
  };
  const completeTask = async () => {
    await recordHabitCompletion(taskId);
    console.info('[TaskSheet]', { at: new Date().toISOString(), stage: 'completed', taskId });
  };
  const undoTask = async () => { await undoHabitCompletion(taskId); };
  const primaryLabel = habit.type === HABIT_TYPES.DAILY
    ? (status.isCompleted ? 'Đã đủ mục tiêu hôm nay' : `Ghi nhận 1 lần (${status.currentCount}/${status.targetCount})`)
    : 'Vừa làm xong';
  return (
    <Modal visible transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingBottom: Math.max(insets.bottom, 16) + 6 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{habit.title}</Text>
        <Text style={[styles.meta, { color: colors.sub }]}>{habit.category || 'Khác'} · {status.cycleInfo || 'Chu kỳ'}</Text>
        <Text style={[styles.status, { color: status.urgency === 'overdue' ? '#EF4444' : status.urgency === 'warning' ? '#F59E0B' : '#10B981' }]}>{status.statusText}</Text>
        {!!habit.note && <Text style={[styles.note, { color: colors.sub }]}>{habit.note}</Text>}
        <Pressable style={[styles.primary, status.isCompleted && habit.type === HABIT_TYPES.DAILY && styles.primaryDone]} onPress={completeTask} disabled={habit.type === HABIT_TYPES.DAILY && status.isCompleted}><Text style={styles.primaryText}>{primaryLabel}</Text></Pressable>
        <View style={styles.row}>
          {habit.type === HABIT_TYPES.DAILY && (
            <Pressable style={[styles.secondary, { borderColor: colors.cardBorder, backgroundColor: colors.cardElevated || colors.card }]} onPress={undoTask}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.secondaryText, { color: colors.text }]}>Trừ 1</Text>
            </Pressable>
          )}
          <Pressable style={[styles.secondary, { borderColor: colors.cardBorder, backgroundColor: colors.cardElevated || colors.card }]} onPress={cloneTask}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.secondaryText, { color: colors.text }]}>Làm lại</Text>
          </Pressable>
          <Pressable style={[styles.secondary, { borderColor: colors.cardBorder, backgroundColor: colors.cardElevated || colors.card }]} onPress={() => { close(); navigateToTask(taskId); }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.secondaryText, { color: colors.text }]}>Xem danh sách</Text>
          </Pressable>
          <Pressable style={[styles.secondary, { borderColor: colors.cardBorder, backgroundColor: colors.cardElevated || colors.card }]} onPress={close}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.secondaryText, { color: colors.text }]}>Đóng</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { marginTop: 'auto', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  title: { fontSize: 21, fontWeight: '800' }, meta: { fontSize: 14 }, status: { fontWeight: '800' }, note: { fontSize: 14, lineHeight: 20 },
  primary: { backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 4 }, primaryDone: { backgroundColor: '#64748B' }, primaryText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  secondary: { flex: 1, height: 44, paddingHorizontal: 2, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: 'rgba(0,0,0,0.55)' },
});

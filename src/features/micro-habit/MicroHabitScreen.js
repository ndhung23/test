// src/features/micro-habit/MicroHabitScreen.js
// Màn hình theo dõi việc vặt & Chu kỳ sinh hoạt (Micro-Habit & Refill Tracker)
// Tự động đếm ngược, cảnh báo màu sắc, hỗ trợ tùy chọn thông báo nhắc nhở theo giờ

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  FlatList,
  Platform,
  Keyboard,
  BackHandler,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import runAfterUi from '../../utils/runAfterUi';
import { generateHabitsWithAi } from '../../services/geminiService';
import {
  HABIT_TYPES,
  calculateHabitStatus,
  computeNextOccurrence,
  getTodayDateString,
  getHabitStats,
  getHabitStatusGroup,
  filterHabits,
  normalizeHabitSearch,
  DEFAULT_CATEGORIES,
  validateCategoryName,
  loadCustomCategories,
  saveCustomCategories,
  validateHabitTitle,
} from './microHabitService';
import {
  scheduleHabitReminder,
  cancelHabitReminder,
  cancelHabitRemindersForTask,
  getAllScheduledHabitReminders,
  reconcileHabitReminders,
} from './NotificationService';
import { requestOpenTask } from './TaskSheetStore';
import { ensureHabitsLoaded, setHabits as saveSharedHabits, subscribeHabits, recordHabitCompletion, undoHabitCompletion } from './HabitStore';
import { styles } from './microHabitStyles';
import HabitCard from './components/HabitCard';
import HabitFormModal from './components/HabitFormModal';
import HabitAiModal from './components/HabitAiModal';
import HabitHistoryModal from './components/HabitHistoryModal';
import HabitDebugNotifModal from './components/HabitDebugNotifModal';
import HabitStatsHeader from './components/HabitStatsHeader';
import { serializeHabitFormState } from './components/habitFormUtils';

export { serializeHabitFormState };

const INTERVAL_PRESETS = [7, 14, 30, 60, 90, 180, 365];
const DAILY_PRESETS = [1, 2, 4, 8, 10];
const DAILY_UNITS = ['lần', 'cốc', 'viên', 'km'];
const CATEGORIES = [...DEFAULT_CATEGORIES, 'Khác'];
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

export default function MicroHabitScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [habits, setHabits] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeStatusFilter, setActiveStatusFilter] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listRef = useRef(null);
  const handledRouteHabitId = useRef(null);
  const [highlightHabitId, setHighlightHabitId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHabitForHistory, setSelectedHabitForHistory] = useState(null);

  // Debug Thông báo OS
  const [debugNotifModalVisible, setDebugNotifModalVisible] = useState(false);
  const [scheduledNotifs, setScheduledNotifs] = useState([]);

  // Gemini AI Gợi ý việc vặt
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Form State thêm / chỉnh sửa việc
  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState(HABIT_TYPES.INTERVAL);
  const [formIntervalDays, setFormIntervalDays] = useState('30');
  const [formDayOfMonth, setFormDayOfMonth] = useState('5');
  const [formTargetCount, setFormTargetCount] = useState('2');
  const [formUnit, setFormUnit] = useState('lần');
  const [formCategory, setFormCategory] = useState('Sinh hoạt');
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [customCategories, setCustomCategories] = useState([]);
  const [formNote, setFormNote] = useState('');
  const [formIcon, setFormIcon] = useState('repeat');
  const [formColor, setFormColor] = useState('#10B981');
  const [formReminderEnabled, setFormReminderEnabled] = useState(false);
  const [formReminderTime, setFormReminderTime] = useState('08:00');
  const [formReminderIntervalHours, setFormReminderIntervalHours] = useState('0');
  const [formReminderIntervalMinutes, setFormReminderIntervalMinutes] = useState('0');
  const [formReminderEndTime, setFormReminderEndTime] = useState('');
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [formStartDate, setFormStartDate] = useState(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Cảnh báo thoát khi chưa lưu & Trạng thái lưu an toàn
  const initialFormSnapshot = useRef(null);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const pendingExitActionRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const isBypassingUnsavedCheck = useRef(false);

  // Native Time Picker
  const [showTimePicker, setShowTimePicker] = useState(false);

  const filterTabs = useMemo(() => [
    { id: 'all', label: t('microHabit.tabAll') || 'Tất cả' },
    { id: 'urgent', label: t('microHabit.tabUrgent') || 'Khẩn cấp 🚨' },
    { id: 'interval', label: t('microHabit.tabInterval') || 'Theo ngày 🔄' },
    { id: 'monthly', label: t('microHabit.tabMonthly') || 'Hàng tháng 📅' },
    { id: 'daily', label: t('microHabit.tabDaily') || 'Trong ngày 🎯' },
  ], [t]);

  const occurrencePreview = useMemo(() => {
    return computeNextOccurrence({
      type: formType,
      intervalDays: parseInt(formIntervalDays || '1', 10),
      dayOfMonth: parseInt(formDayOfMonth || '1', 10),
      targetCount: parseInt(formTargetCount || '1', 10),
      reminderTime: formReminderTime,
      startDate: formStartDate,
    }, new Date(), formStartDate);
  }, [formType, formIntervalDays, formDayOfMonth, formTargetCount, formReminderTime, formStartDate]);

  const pickerDate = useMemo(() => {
    const parts = (formReminderTime || '08:00').split(':');
    const d = new Date();
    d.setHours(parseInt(parts[0] || '8', 10), parseInt(parts[1] || '0', 10), 0, 0);
    return d;
  }, [formReminderTime]);

  const handleTimePickerChange = useCallback((event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const h = String(selectedDate.getHours()).padStart(2, '0');
      const m = String(selectedDate.getMinutes()).padStart(2, '0');
      setFormReminderTime(`${h}:${m}`);
    }
  }, []);

  const handleOpenDebugNotifs = useCallback(async () => {
    const list = await getAllScheduledHabitReminders();
    setScheduledNotifs(list);
    setDebugNotifModalVisible(true);
  }, []);

  const handleSelfHealNotifications = useCallback(async () => {
    try {
      const result = await reconcileHabitReminders(habits);
      const list = await getAllScheduledHabitReminders();
      setScheduledNotifs(list);
      Alert.alert(
        'Đã đối chiếu thông báo',
        `Đã kiểm tra lại thông báo hệ thống (${result?.scheduledCount || list.length} thông báo hợp lệ).`
      );
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể tự đối chiếu thông báo.');
    }
  }, [habits]);

  useEffect(() => {
    let unsubscribe = () => {};
    const init = async () => {
      const loaded = await ensureHabitsLoaded();
      setHabits(loaded);
      const loadedCustomCats = await loadCustomCategories();
      setCustomCategories(loadedCustomCats);
      unsubscribe = subscribeHabits((freshHabits) => {
        setHabits(freshHabits);
      });
      reconcileHabitReminders(loaded).catch(() => {});
    };
    init();
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateHabitsList = useCallback((newList) => {
    if (!Array.isArray(newList)) return;
    setHabits(newList);
    saveSharedHabits(newList);
  }, []);

  useEffect(() => {
    const targetId = route.params?.targetHabitId;
    if (!targetId || habits.length === 0 || handledRouteHabitId.current === targetId) return;
    handledRouteHabitId.current = targetId;

    const targetIndex = habits.findIndex((h) => h.id === targetId);
    if (targetIndex !== -1) {
      setActiveFilter('all');
      setActiveStatusFilter(null);
      setSearchInput('');
      setHighlightHabitId(targetId);

      setTimeout(() => {
        try {
          listRef.current?.scrollToIndex({ index: targetIndex, animated: true, viewPosition: 0.3 });
        } catch {
          listRef.current?.scrollToOffset({ offset: targetIndex * 180, animated: true });
        }
      }, 350);

      setTimeout(() => {
        setHighlightHabitId(null);
      }, 3000);
    }
  }, [route.params?.targetHabitId, habits]);

  const handleOpenAiModal = useCallback(() => {
    setAiPrompt('');
    setAiSuggestions([]);
    setAiModalVisible(true);
  }, []);

  const handleGenerateAiHabits = useCallback(async (customPrompt) => {
    const query = customPrompt || aiPrompt;
    if (!query || !query.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn chủ đề nhanh hoặc nhập nhu cầu sinh hoạt của bạn.');
      return;
    }
    setIsGeneratingAi(true);
    try {
      const result = await generateHabitsWithAi(query.trim());
      if (!result || result.length === 0) {
        Alert.alert('Thông báo', 'Gemini AI không tìm thấy gợi ý phù hợp. Vui lòng thử lại với mô tả chi tiết hơn.');
      } else {
        setAiSuggestions(result);
      }
    } catch (err) {
      Alert.alert('Lỗi AI', err.message || 'Không thể tạo việc vặt từ AI vào lúc này.');
    } finally {
      setIsGeneratingAi(false);
    }
  }, [aiPrompt]);

  const handleApplyAiHabits = useCallback(async () => {
    if (!aiSuggestions || aiSuggestions.length === 0) return;
    const newItems = aiSuggestions.map((item) => {
      const newHabit = {
        id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        title: item.title,
        type: item.type || HABIT_TYPES.INTERVAL,
        intervalDays: item.intervalDays || 30,
        dayOfMonth: item.dayOfMonth || 1,
        targetCount: item.targetCount || 1,
        unit: item.unit || 'lần',
        category: item.category || 'Sinh hoạt',
        note: item.note || '',
        icon: item.icon || 'repeat',
        color: item.color || '#3B82F6',
        lastCompletedDate: new Date().toISOString(),
        currentCount: 0,
        lastDailyDate: getTodayDateString(),
        reminderEnabled: !!item.reminderEnabled,
        reminderTime: item.reminderTime || '08:00',
        notificationId: null,
        history: [],
      };
      return newHabit;
    });

    for (const h of newItems) {
      if (h.reminderEnabled) {
        const notifId = await scheduleHabitReminder(h);
        h.notificationId = notifId;
      }
    }

    const merged = [...newItems, ...habits];
    updateHabitsList(merged);
    setAiModalVisible(false);
    setAiSuggestions([]);
    Alert.alert('Thành công', `Đã thêm ${newItems.length} việc vặt thông minh vào danh sách theo dõi của bạn! 🎉`);
  }, [aiSuggestions, habits, updateHabitsList]);

  const handleCompleteHabit = useCallback(async (id) => {
    try {
      const list = Array.isArray(habits) ? habits : [];
      const currentTarget = list.find((h) => h.id === id);
      const title = currentTarget?.title || 'Việc vặt';

      await recordHabitCompletion(id);

      if (Platform.OS !== 'web') {
        Alert.alert(
          t('microHabit.completedTitle') || 'Đã hoàn thành! 🎉',
          (t('microHabit.cycleResetFor') || 'Đã reset chu kỳ cho') + ` "${title}".`,
          [
            {
              text: t('microHabit.undo') || 'Hoàn tác',
              style: 'destructive',
              onPress: async () => {
                await undoHabitCompletion(id);
              },
            },
            { text: t('common.ok') || 'OK' },
          ]
        );
      }
    } catch (err) {
      console.warn('[MicroHabit] Lỗi handleCompleteHabit:', err);
    }
  }, [habits, t]);

  const handleStepDaily = useCallback(async (id, delta) => {
    try {
      if (delta > 0) {
        await recordHabitCompletion(id);
      } else {
        await undoHabitCompletion(id);
      }
    } catch (err) {
      console.warn('[MicroHabit] Lỗi handleStepDaily:', err);
    }
  }, []);

  const handleDeleteHabit = (id, title) => {
    Alert.alert(
      t('microHabit.deleteHabit') || 'Xóa việc vặt',
      `${t('microHabit.deleteConfirm') || 'Bạn có chắc muốn xóa việc này không?'}\n"${title}"`,
      [
        { text: t('common.cancel') || 'Hủy', style: 'cancel' },
        {
          text: t('common.confirm') || 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const target = habits.find((h) => h.id === id);
            if (target?.notificationId) {
              await cancelHabitReminder(target.notificationId);
            }
            updateHabitsList(habits.filter((h) => h.id !== id));
          },
        },
      ]
    );
  };

  const handleOpenAddModal = useCallback(() => {
    isBypassingUnsavedCheck.current = false;
    setEditingId(null);
    setFormTitle('');
    setFormType(HABIT_TYPES.INTERVAL);
    setFormIntervalDays('30');
    setFormDayOfMonth('5');
    setFormTargetCount('2');
    setFormUnit('lần');
    setFormCategory('Sinh hoạt');
    setFormCustomCategory('');
    setFormNote('');
    setFormIcon('repeat');
    setFormColor('#10B981');
    setFormReminderEnabled(false);
    setFormReminderTime('08:00');
    setFormReminderIntervalHours('0');
    setFormReminderIntervalMinutes('0');
    setFormReminderEndTime('');
    setFormStartDate(null);
    setFormErrors({});
    setShowUnsavedConfirm(false);
    setIsSaving(false);

    initialFormSnapshot.current = serializeHabitFormState({
      title: '',
      type: HABIT_TYPES.INTERVAL,
      intervalDays: '30',
      dayOfMonth: '5',
      targetCount: '2',
      unit: 'lần',
      category: 'Sinh hoạt',
      customCategory: '',
      note: '',
      icon: 'repeat',
      color: '#10B981',
      reminderEnabled: false,
      reminderTime: '08:00',
      reminderIntervalHours: '0',
      reminderIntervalMinutes: '0',
      reminderEndTime: '',
      startDate: null,
    });

    setModalVisible(true);
  }, []);

  const handleOpenEditModal = useCallback((item) => {
    isBypassingUnsavedCheck.current = false;
    setEditingId(item.id);
    setFormTitle(item.title || '');
    setFormType(item.type || HABIT_TYPES.INTERVAL);
    setFormIntervalDays(String(item.intervalDays || 30));
    setFormDayOfMonth(String(item.dayOfMonth || 5));
    setFormTargetCount(String(item.targetCount || 2));
    setFormUnit(item.unit || 'lần');
    setFormCategory(CATEGORIES.includes(item.category) ? item.category : 'Khác');
    setFormCustomCategory(CATEGORIES.includes(item.category) ? '' : (item.category || ''));
    setFormNote(item.note || '');
    setFormIcon(item.icon || 'repeat');
    setFormColor(item.color || '#10B981');
    setFormReminderEnabled(!!item.reminderEnabled);
    setFormReminderTime(item.reminderTime || '08:00');
    setFormReminderIntervalHours(String(item.reminderIntervalHours || 0));
    setFormReminderIntervalMinutes(String(item.reminderIntervalMinutes || 0));
    setFormReminderEndTime(item.reminderEndTime || '');
    setFormStartDate(item.startDate || null);
    setFormErrors({});
    setShowUnsavedConfirm(false);
    setIsSaving(false);

    initialFormSnapshot.current = serializeHabitFormState({
      title: item.title || '',
      type: item.type || HABIT_TYPES.INTERVAL,
      intervalDays: String(item.intervalDays || 30),
      dayOfMonth: String(item.dayOfMonth || 5),
      targetCount: String(item.targetCount || 2),
      unit: item.unit || 'lần',
      category: CATEGORIES.includes(item.category) ? item.category : 'Khác',
      customCategory: CATEGORIES.includes(item.category) ? '' : (item.category || ''),
      note: item.note || '',
      icon: item.icon || 'repeat',
      color: item.color || '#10B981',
      reminderEnabled: !!item.reminderEnabled,
      reminderTime: item.reminderTime || '08:00',
      reminderIntervalHours: String(item.reminderIntervalHours || 0),
      reminderIntervalMinutes: String(item.reminderIntervalMinutes || 0),
      reminderEndTime: item.reminderEndTime || '',
      startDate: item.startDate || null,
    });

    setModalVisible(true);
  }, []);

  const handleQuickToggleReminder = async (item) => {
    const newEnabled = !item.reminderEnabled;
    let newNotifId = null;

    if (newEnabled) {
      newNotifId = await scheduleHabitReminder({
        ...item,
        reminderEnabled: true,
        reminderTime: item.reminderTime || '08:00',
      });
      if (!newNotifId) {
        Alert.alert('Chưa bật được nhắc nhở', 'Hãy cấp quyền Thông báo trong Cài đặt rồi thử lại.');
        return;
      }
      Alert.alert('Đã bật nhắc nhở', item.type === HABIT_TYPES.DAILY
        ? `Thông báo sẽ nhắc lúc ${item.reminderTime || '08:00'} mỗi ngày.`
        : `Thông báo sẽ nhắc vào kỳ đến hạn lúc ${item.reminderTime || '08:00'}.`);
    } else {
      if (item.notificationId) {
        await cancelHabitReminder(item.notificationId);
      }
    }

    const updated = habits.map((h) =>
      h.id === item.id
        ? { ...h, reminderEnabled: newEnabled, notificationId: newNotifId }
        : h
    );
    updateHabitsList(updated);
  };

  const handleSimulateNotificationTap = useCallback((taskId) => {
    setDebugNotifModalVisible(false);
    requestOpenTask(taskId);
  }, []);

  const validateHabitForm = useCallback(() => {
    const errors = {};
    const trimmedTitle = formTitle.trim();
    const titleError = validateHabitTitle(trimmedTitle);
    if (titleError) errors.title = titleError;

    let selectedCategory = formCategory;
    if (formCategory === 'Khác') {
      const customError = validateCategoryName(formCustomCategory);
      if (customError) {
        errors.category = customError;
      }
    }

    let parsedDayOfMonth = 1;
    if (formType === HABIT_TYPES.MONTHLY) {
      parsedDayOfMonth = parseInt(formDayOfMonth, 10);
      if (isNaN(parsedDayOfMonth) || parsedDayOfMonth < 1 || parsedDayOfMonth > 31) {
        errors.dayOfMonth = 'Ngày trong tháng phải từ 1 đến 31';
      }
    }

    if (formType === HABIT_TYPES.DAILY) {
      const val = parseInt(formTargetCount, 10);
      if (!formTargetCount.trim() || isNaN(val)) {
        errors.targetCount = 'Vui lòng nhập mục tiêu.';
      } else if (val < 1) {
        errors.targetCount = 'Tối thiểu là 1.';
      } else if (val > 9999) {
        errors.targetCount = 'Tối đa là 9999.';
      }
    }

    if (formReminderEnabled) {
      const validTime = (formReminderTime || '').trim();
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(validTime)) {
        errors.reminderTime = 'Giờ không hợp lệ (VD: 08:00, 19:30).';
      }
    }

    return errors;
  }, [formTitle, formType, formIntervalDays, formDayOfMonth, formTargetCount, formReminderEnabled, formReminderTime, formCategory, formCustomCategory]);

  const isFormValid = useMemo(() => {
    const errors = validateHabitForm();
    return Object.keys(errors).length === 0;
  }, [validateHabitForm]);

  const isFormDirty = useCallback(() => {
    if (isBypassingUnsavedCheck.current || !initialFormSnapshot.current) return false;
    const currentSnapshot = serializeHabitFormState({
      title: formTitle,
      type: formType,
      intervalDays: formIntervalDays,
      dayOfMonth: formDayOfMonth,
      targetCount: formTargetCount,
      unit: formUnit,
      category: formCategory,
      customCategory: formCustomCategory,
      note: formNote,
      icon: formIcon,
      color: formColor,
      reminderEnabled: formReminderEnabled,
      reminderTime: formReminderTime,
      reminderIntervalHours: formReminderIntervalHours,
      reminderIntervalMinutes: formReminderIntervalMinutes,
      reminderEndTime: formReminderEndTime,
      startDate: formStartDate,
    });
    return currentSnapshot !== initialFormSnapshot.current;
  }, [formTitle, formType, formIntervalDays, formDayOfMonth, formTargetCount, formUnit, formCategory, formCustomCategory, formNote, formIcon, formColor, formReminderEnabled, formReminderTime, formReminderIntervalHours, formReminderIntervalMinutes, formReminderEndTime, formStartDate]);

  const requestCloseModal = useCallback((onConfirmed) => {
    Keyboard.dismiss();
    if (isBypassingUnsavedCheck.current || !isFormDirty()) {
      setShowUnsavedConfirm(false);
      setModalVisible(false);
      setEditingId(null);
      setFormErrors({});
      initialFormSnapshot.current = null;
      if (typeof onConfirmed === 'function') onConfirmed();
      return;
    }
    pendingExitActionRef.current = typeof onConfirmed === 'function' ? onConfirmed : null;
    setShowUnsavedConfirm(true);
  }, [isFormDirty]);

  const handleContinueEditing = useCallback(() => {
    setShowUnsavedConfirm(false);
    pendingExitActionRef.current = null;
  }, []);

  const handleDiscardAndExit = useCallback(() => {
    isBypassingUnsavedCheck.current = true;
    setShowUnsavedConfirm(false);
    setModalVisible(false);
    setEditingId(null);
    setFormErrors({});
    initialFormSnapshot.current = null;
    if (pendingExitActionRef.current) {
      pendingExitActionRef.current();
      pendingExitActionRef.current = null;
    }
  }, []);

  const handleSaveForm = useCallback(async () => {
    if (isSaving) return;
    const errors = validateHabitForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);
    isBypassingUnsavedCheck.current = true;
    const wasEditing = !!editingId;

    const trimmedTitle = formTitle.trim();
    const validTime = (formReminderTime || '08:00').trim();
    const selectedCategory = formCategory === 'Khác' ? formCustomCategory.trim().replace(/\s+/g, ' ') : formCategory;
    if (formCategory === 'Khác' && !customCategories.includes(selectedCategory)) {
      const nextCategories = [selectedCategory, ...customCategories].slice(0, 10);
      setCustomCategories(nextCategories);
      saveCustomCategories(nextCategories).catch(() => {});
    }

    const parsedDayOfMonth = Math.min(31, Math.max(1, parseInt(formDayOfMonth || 1, 10)));
    const parsedIntervalDays = Math.min(3650, Math.max(1, parseInt(formIntervalDays || 1, 10)));
    const parsedTargetCount = Math.min(1000, Math.max(1, parseInt(formTargetCount || 1, 10)));
    const parsedReminderIntervalHours = Math.min(24, Math.max(0, parseInt(formReminderIntervalHours || 0, 10)));
    const parsedReminderIntervalMinutes = Math.min(55, Math.max(0, parseInt(formReminderIntervalMinutes || 0, 10)));
    const totalIntervalMinutes = parsedReminderIntervalHours * 60 + parsedReminderIntervalMinutes;
    const effectiveIntervalMinutes = totalIntervalMinutes > 0 ? Math.max(15, totalIntervalMinutes) : 0;

    let savedItem;
    let updatedList;

    if (editingId) {
      const currentItem = habits.find((h) => h.id === editingId);
      savedItem = {
        ...(currentItem || {}),
        id: editingId,
        title: trimmedTitle,
        type: formType,
        intervalDays: parsedIntervalDays,
        dayOfMonth: parsedDayOfMonth,
        targetCount: parsedTargetCount,
        unit: formUnit.trim() || 'lần',
        category: selectedCategory,
        note: formNote.trim(),
        icon: formIcon,
        color: formColor,
        reminderEnabled: formReminderEnabled,
        reminderTime: validTime || '08:00',
        reminderIntervalHours: parsedReminderIntervalHours,
        reminderIntervalMinutes: parsedReminderIntervalMinutes,
        reminderIntervalTotalMinutes: effectiveIntervalMinutes,
        reminderEndTime: formReminderEndTime || '',
        startDate: formStartDate || null,
      };
      updatedList = habits.map((h) => (h.id === editingId ? savedItem : h));
    } else {
      savedItem = {
        id: `habit-${Date.now()}`,
        title: trimmedTitle,
        type: formType,
        intervalDays: parsedIntervalDays,
        dayOfMonth: parsedDayOfMonth,
        targetCount: parsedTargetCount,
        unit: formUnit.trim() || 'lần',
        category: selectedCategory,
        note: formNote.trim(),
        icon: formIcon,
        color: formColor,
        lastCompletedDate: new Date().toISOString(),
        currentCount: 0,
        lastDailyDate: getTodayDateString(),
        reminderEnabled: formReminderEnabled,
        reminderTime: validTime || '08:00',
        reminderIntervalHours: parsedReminderIntervalHours,
        reminderIntervalMinutes: parsedReminderIntervalMinutes,
        reminderIntervalTotalMinutes: effectiveIntervalMinutes,
        reminderEndTime: formReminderEndTime || '',
        startDate: formStartDate || null,
        notificationId: null,
        history: [],
      };
      updatedList = [savedItem, ...habits];
    }

    setHabits(updatedList);
    saveSharedHabits(updatedList).catch((err) => console.warn('[HabitStore] Save error:', err));

    setModalVisible(false);
    setShowUnsavedConfirm(false);
    setEditingId(null);
    setFormErrors({});
    setIsSaving(false);
    initialFormSnapshot.current = null;

    runAfterUi(async () => {
      try {
        if (savedItem.reminderEnabled) {
          const schedulePromise = scheduleHabitReminder(savedItem);
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000));
          const newNotifId = await Promise.race([schedulePromise, timeoutPromise]).catch((err) => {
            console.warn('[MicroHabit] Notification scheduling warning:', err.message);
            return null;
          });

          if (newNotifId) {
            savedItem.notificationId = newNotifId;
            const synced = updatedList.map((h) => (h.id === savedItem.id ? { ...h, notificationId: newNotifId } : h));
            setHabits(synced);
            saveSharedHabits(synced).catch(() => {});
          } else if (newNotifId === null && savedItem.reminderEnabled) {
            setToastMessage('Đã lưu việc nhưng chưa đặt được nhắc, hãy thử lại');
            setTimeout(() => setToastMessage(null), 3000);
          }
        } else {
          cancelHabitRemindersForTask(savedItem.id).catch(() => {});
        }

        const targetStatus = calculateHabitStatus(savedItem);
        const targetGroup = getHabitStatusGroup(targetStatus);
        const STATUS_GROUP_NAMES = {
          overdue: 'Quá hạn',
          warning: 'Sắp đến hạn',
          safe: 'An toàn / Chưa đến hạn',
          completed: 'Đã hoàn thành',
        };

        const isVisibleUnderCurrentFilter =
          (!activeStatusFilter || activeStatusFilter === targetGroup) &&
          (activeFilter === 'all' || activeFilter === savedItem.type || (activeFilter === 'urgent' && ['overdue', 'warning'].includes(targetGroup))) &&
          (!debouncedSearch || normalizeHabitSearch(`${savedItem.title || ''} ${savedItem.category || ''}`).includes(normalizeHabitSearch(debouncedSearch)));

        if (!wasEditing && !isVisibleUnderCurrentFilter) {
          setActiveStatusFilter(targetGroup);
          setActiveFilter('all');
          setSearchInput('');
          setDebouncedSearch('');
          setToastMessage(`Việc đã chuyển sang nhóm ${STATUS_GROUP_NAMES[targetGroup] || targetGroup}`);
          setTimeout(() => setToastMessage(null), 2500);
        }

        setHighlightHabitId(savedItem.id);
        setTimeout(() => setHighlightHabitId(null), 2500);

        if (!wasEditing) {
          setTimeout(() => {
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          }, 200);
        }
      } catch (bgError) {
        console.warn('[MicroHabit] Background post-save warning:', bgError);
      } finally {
        isBypassingUnsavedCheck.current = false;
      }
    });
  }, [isSaving, validateHabitForm, editingId, formTitle, formReminderTime, formCategory, formCustomCategory, customCategories, formDayOfMonth, formIntervalDays, formTargetCount, formReminderIntervalHours, formReminderIntervalMinutes, formReminderEndTime, formStartDate, habits, formType, formUnit, formNote, formIcon, formColor, formReminderEnabled, activeStatusFilter, activeFilter, debouncedSearch]);

  const handleSaveAndExit = useCallback(async () => {
    const errors = validateHabitForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setShowUnsavedConfirm(false);
      return;
    }
    await handleSaveForm();
    if (pendingExitActionRef.current) {
      pendingExitActionRef.current();
      pendingExitActionRef.current = null;
    }
  }, [validateHabitForm, handleSaveForm]);

  useEffect(() => {
    if (!modalVisible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestCloseModal();
      return true;
    });
    return () => subscription.remove();
  }, [modalVisible, requestCloseModal]);

  const habitsWithStatus = useMemo(() => {
    const list = Array.isArray(habits) ? habits : [];
    return list.map((h) => ({
      ...h,
      status: calculateHabitStatus(h),
    }));
  }, [habits]);

  const filteredHabits = useMemo(() => {
    return filterHabits(habitsWithStatus, {
      activeFilter,
      activeStatusFilter,
      debouncedSearch: normalizeHabitSearch(debouncedSearch),
    });
  }, [habitsWithStatus, activeFilter, activeStatusFilter, debouncedSearch]);

  const stats = useMemo(() => {
    return getHabitStats(habitsWithStatus);
  }, [habitsWithStatus]);

  const hasActiveFilters = activeFilter !== 'all' || activeStatusFilter !== null || debouncedSearch.trim().length > 0;
  const clearFilters = () => {
    setActiveFilter('all');
    setActiveStatusFilter(null);
    setSearchInput('');
  };

  const renderHabitItem = useCallback(({ item }) => (
    <HabitCard
      item={item}
      highlightHabitId={highlightHabitId}
      colors={colors}
      onOpenEditModal={handleOpenEditModal}
      onDeleteHabit={handleDeleteHabit}
      onQuickToggleReminder={handleQuickToggleReminder}
      onOpenHistory={(habit) => {
        setSelectedHabitForHistory(habit);
        setHistoryModalVisible(true);
      }}
      onCompleteHabit={handleCompleteHabit}
      onStepDaily={handleStepDaily}
      t={t}
    />
  ), [highlightHabitId, colors, handleOpenEditModal, handleDeleteHabit, handleQuickToggleReminder, handleCompleteHabit, handleStepDaily, t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('microHabit.title') || 'Chu kỳ việc vặt'}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <FlatList
        ref={listRef}
        data={filteredHabits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabitItem}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        onScrollToIndexFailed={({ index, averageItemLength }) => listRef.current?.scrollToOffset({ offset: index * averageItemLength, animated: true })}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <HabitStatsHeader
            colors={colors}
            t={t}
            stats={stats}
            activeStatusFilter={activeStatusFilter}
            setActiveStatusFilter={setActiveStatusFilter}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            filterTabs={filterTabs}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            filteredHabitsCount={filteredHabits.length}
            debouncedSearch={debouncedSearch}
            onOpenDebugNotifs={handleOpenDebugNotifs}
            onOpenAiModal={handleOpenAiModal}
            onOpenAddModal={handleOpenAddModal}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.sub} />
            <Text style={[styles.emptyText, { color: colors.sub }]}>
              {t('microHabit.noHabits') || 'Không có việc nào phù hợp'}
            </Text>
            {hasActiveFilters ? (
              <Pressable onPress={clearFilters} style={[styles.emptyClearButton, { borderColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: '800' }}>{t('microHabit.clearFilter') || 'Xóa lọc'}</Text>
              </Pressable>
            ) : null}
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      {/* Modal Thêm / Chỉnh sửa việc vặt */}
      <HabitFormModal
        visible={modalVisible}
        onRequestClose={() => requestCloseModal()}
        editingId={editingId}
        formType={formType}
        setFormType={setFormType}
        formTitle={formTitle}
        setFormTitle={setFormTitle}
        formErrors={formErrors}
        setFormErrors={setFormErrors}
        formIntervalDays={formIntervalDays}
        setFormIntervalDays={setFormIntervalDays}
        formDayOfMonth={formDayOfMonth}
        setFormDayOfMonth={setFormDayOfMonth}
        formTargetCount={formTargetCount}
        setFormTargetCount={setFormTargetCount}
        formUnit={formUnit}
        setFormUnit={setFormUnit}
        formReminderEnabled={formReminderEnabled}
        setFormReminderEnabled={setFormReminderEnabled}
        formReminderTime={formReminderTime}
        setFormReminderTime={setFormReminderTime}
        showTimePicker={showTimePicker}
        setShowTimePicker={setShowTimePicker}
        pickerDate={pickerDate}
        handleTimePickerChange={handleTimePickerChange}
        occurrencePreview={occurrencePreview}
        formStartDate={formStartDate}
        setFormStartDate={setFormStartDate}
        showStartDatePicker={showStartDatePicker}
        setShowStartDatePicker={setShowStartDatePicker}
        formReminderIntervalHours={formReminderIntervalHours}
        setFormReminderIntervalHours={setFormReminderIntervalHours}
        formReminderIntervalMinutes={formReminderIntervalMinutes}
        setFormReminderIntervalMinutes={setFormReminderIntervalMinutes}
        formReminderEndTime={formReminderEndTime}
        setFormReminderEndTime={setFormReminderEndTime}
        showEndTimePicker={showEndTimePicker}
        setShowEndTimePicker={setShowEndTimePicker}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        customCategories={customCategories}
        setCustomCategories={setCustomCategories}
        saveCustomCategories={saveCustomCategories}
        formCustomCategory={formCustomCategory}
        setFormCustomCategory={setFormCustomCategory}
        formNote={formNote}
        setFormNote={setFormNote}
        formColor={formColor}
        setFormColor={setFormColor}
        handleSaveForm={handleSaveForm}
        isFormValid={isFormValid}
        isSaving={isSaving}
        showUnsavedConfirm={showUnsavedConfirm}
        handleSaveAndExit={handleSaveAndExit}
        handleDiscardAndExit={handleDiscardAndExit}
        handleContinueEditing={handleContinueEditing}
        colors={colors}
        t={t}
        intervalPresets={INTERVAL_PRESETS}
        dailyPresets={DAILY_PRESETS}
        dailyUnits={DAILY_UNITS}
        categories={CATEGORIES}
        daysOfMonth={DAYS_OF_MONTH}
        presetColors={PRESET_COLORS}
      />

      {/* Modal Xem lịch sử lần hoàn thành */}
      <HabitHistoryModal
        visible={historyModalVisible}
        onClose={() => setHistoryModalVisible(false)}
        habit={selectedHabitForHistory}
        colors={colors}
        t={t}
      />

      {/* Modal Gemini AI Gợi ý việc vặt */}
      <HabitAiModal
        visible={aiModalVisible}
        onClose={() => setAiModalVisible(false)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        isGeneratingAi={isGeneratingAi}
        aiSuggestions={aiSuggestions}
        onGenerateAiHabits={handleGenerateAiHabits}
        onApplyAiHabits={handleApplyAiHabits}
        colors={colors}
        t={t}
      />

      {/* Modal Debug Toàn Bộ Thông Báo OS Đã Lên Lịch */}
      <HabitDebugNotifModal
        visible={debugNotifModalVisible}
        onClose={() => setDebugNotifModalVisible(false)}
        scheduledNotifs={scheduledNotifs}
        onSimulateNotificationTap={handleSimulateNotificationTap}
        onSelfHeal={handleSelfHealNotifications}
        colors={colors}
        t={t}
      />

      {toastMessage ? (
        <View style={styles.toastBanner} pointerEvents="none">
          <Text style={styles.toastBannerText}>{toastMessage}</Text>
        </View>
      ) : null}
    </View>
  );
}

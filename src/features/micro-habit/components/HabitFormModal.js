import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  Switch,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles } from '../microHabitStyles';
import { HABIT_TYPES, getTodayDateString } from '../microHabitService';

export default function HabitFormModal({
  visible,
  onRequestClose,
  editingId,
  formType,
  setFormType,
  formTitle,
  setFormTitle,
  formErrors = {},
  setFormErrors,
  formIntervalDays,
  setFormIntervalDays,
  formDayOfMonth,
  setFormDayOfMonth,
  formTargetCount,
  setFormTargetCount,
  formUnit,
  setFormUnit,
  formReminderEnabled,
  setFormReminderEnabled,
  formReminderTime,
  setFormReminderTime,
  showTimePicker,
  setShowTimePicker,
  pickerDate,
  handleTimePickerChange,
  occurrencePreview,
  formStartDate,
  setFormStartDate,
  showStartDatePicker,
  setShowStartDatePicker,
  formReminderIntervalHours,
  setFormReminderIntervalHours,
  formReminderIntervalMinutes,
  setFormReminderIntervalMinutes,
  formReminderEndTime,
  setFormReminderEndTime,
  showEndTimePicker,
  setShowEndTimePicker,
  formCategory,
  setFormCategory,
  customCategories = [],
  setCustomCategories,
  saveCustomCategories,
  formCustomCategory,
  setFormCustomCategory,
  formNote,
  setFormNote,
  formColor,
  setFormColor,
  handleSaveForm,
  isFormValid,
  isSaving,
  showUnsavedConfirm,
  handleSaveAndExit,
  handleDiscardAndExit,
  handleContinueEditing,
  colors,
  t,
  intervalPresets = [7, 14, 30, 60, 90, 180, 365],
  dailyPresets = [1, 2, 4, 8, 10],
  dailyUnits = ['lần', 'cốc', 'viên', 'km'],
  categories = ['Sinh hoạt', 'Xe cộ', 'Nhà cửa', 'Tài chính', 'Sức khỏe', 'Khác'],
  daysOfMonth = Array.from({ length: 31 }, (_, i) => i + 1),
  presetColors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'],
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onRequestClose}
    >
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={onRequestClose}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingId
                  ? (t ? t('microHabit.editHabit') : 'Chỉnh sửa việc vặt')
                  : (t ? t('microHabit.addHabitTitle') : 'Thêm việc vặt & Chu kỳ mới')}
              </Text>
              <Pressable onPress={onRequestClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.sub} />
              </Pressable>
            </View>

            <FlatList
              data={[{ key: 'form-body' }]}
              keyExtractor={(item) => item.key}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={() => (
                <View style={styles.formContainer}>
                  {/* Chọn loại chu kỳ */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {t ? t('microHabit.cycleType') : 'Loại chu kỳ lặp'}
                  </Text>
                  <View style={styles.typeSelectorRow}>
                    {[
                      { type: HABIT_TYPES.INTERVAL, label: t ? t('microHabit.cycleByDay') : 'Theo ngày 🔄' },
                      { type: HABIT_TYPES.MONTHLY, label: t ? t('microHabit.cycleMonthly') : 'Hàng tháng 📅' },
                      { type: HABIT_TYPES.DAILY, label: t ? t('microHabit.cycleDaily') : 'Trong ngày 🎯' },
                    ].map((item) => (
                      <Pressable
                        key={item.type}
                        onPress={() => setFormType(item.type)}
                        style={[
                          styles.typeBtn,
                          {
                            backgroundColor: formType === item.type ? '#10B981' : colors.cardElevated,
                            borderColor: formType === item.type ? '#10B981' : colors.cardBorder,
                          },
                        ]}
                      >
                        <Text style={[styles.typeBtnText, { color: formType === item.type ? '#FFFFFF' : colors.text }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Tên việc */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    {t ? t('microHabit.habitName') : 'Tên việc vặt / Thói quen'}
                  </Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: formErrors.title ? '#EF4444' : colors.border }]}
                    value={formTitle}
                    onChangeText={(val) => { setFormTitle(val); setFormErrors?.((e) => ({ ...e, title: undefined })); }}
                    placeholder="VD: Thay nhớt xe, Đóng tiền trọ, Uống thuốc..."
                    placeholderTextColor={colors.sub}
                    autoCapitalize="sentences"
                    maxLength={60}
                  />
                  <Text style={[styles.charCount, { color: colors.sub }]}>{formTitle.length}/60</Text>
                  {formErrors.title ? <Text style={styles.errorText}>{formErrors.title}</Text> : null}

                  {/* Tham số chu kỳ */}
                  {formType === HABIT_TYPES.INTERVAL && (
                    <View style={styles.formSectionBox}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        {t ? t('microHabit.everyNDays') : 'Chu kỳ lặp lại (ngày)'}
                      </Text>
                      {/* Chips chọn nhanh */}
                      <View style={styles.chipRow}>
                        {intervalPresets.map((days) => {
                          const isSelected = parseInt(formIntervalDays, 10) === days;
                          return (
                            <Pressable
                              key={days}
                              onPress={() => {
                                setFormIntervalDays(String(days));
                                setFormErrors?.((e) => ({ ...e, intervalDays: undefined }));
                              }}
                              style={[
                                styles.presetChip,
                                {
                                  backgroundColor: isSelected ? '#10B981' : colors.cardElevated,
                                  borderColor: isSelected ? '#10B981' : colors.cardBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.presetChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                                {days} ngày
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Stepper */}
                      <View style={styles.stepperContainer}>
                        <Pressable
                          onPress={() => setFormIntervalDays((prev) => String(Math.max(1, parseInt(prev || '1', 10) - 5)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Text style={[styles.stepperMiniBtnText, { color: colors.text }]}>-5</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setFormIntervalDays((prev) => String(Math.max(1, parseInt(prev || '1', 10) - 1)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Ionicons name="remove" size={18} color={colors.text} />
                        </Pressable>

                        <View style={[styles.stepperDisplay, { backgroundColor: colors.card, borderColor: '#10B981' }]}>
                          <Text style={[styles.stepperDisplayText, { color: colors.text }]}>
                            {formIntervalDays} <Text style={{ fontSize: 13, color: colors.sub }}>ngày</Text>
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => setFormIntervalDays((prev) => String(Math.min(3650, parseInt(prev || '1', 10) + 1)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Ionicons name="add" size={18} color={colors.text} />
                        </Pressable>
                        <Pressable
                          onPress={() => setFormIntervalDays((prev) => String(Math.min(3650, parseInt(prev || '1', 10) + 5)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Text style={[styles.stepperMiniBtnText, { color: colors.text }]}>+5</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}

                  {formType === HABIT_TYPES.MONTHLY && (
                    <View style={styles.formSectionBox}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        {t ? t('microHabit.dayOfMonth') : 'Ngày đến hạn hàng tháng (Chọn 1 trong 31 ngày)'}
                      </Text>
                      <View style={styles.daysGrid}>
                        {daysOfMonth.map((d) => {
                          const isSelected = parseInt(formDayOfMonth, 10) === d;
                          return (
                            <Pressable
                              key={d}
                              onPress={() => {
                                setFormDayOfMonth(String(d));
                                setFormErrors?.((e) => ({ ...e, dayOfMonth: undefined }));
                              }}
                              style={[
                                styles.dayGridCell,
                                {
                                  backgroundColor: isSelected ? '#10B981' : colors.cardElevated,
                                  borderColor: isSelected ? '#10B981' : colors.cardBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.dayGridCellText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                                {d}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <View style={[styles.noteBox, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}>
                        <Ionicons name="information-circle-outline" size={16} color="#10B981" />
                        <Text style={[styles.noteBoxText, { color: colors.sub }]}>
                          Với tháng ngắn (tháng 2, 4, 6, 9, 11), hệ thống sẽ tự động chọn ngày cuối cùng của tháng đó.
                        </Text>
                      </View>
                    </View>
                  )}

                  {formType === HABIT_TYPES.DAILY && (
                    <View style={styles.formSectionBox}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        {t ? t('microHabit.dailyTarget') : 'Mục tiêu số lần mỗi ngày'}
                      </Text>
                      <View style={styles.chipRow}>
                        {dailyPresets.map((cnt) => {
                          const isSelected = parseInt(formTargetCount, 10) === cnt;
                          return (
                            <Pressable
                              key={cnt}
                              onPress={() => {
                                setFormTargetCount(String(cnt));
                                setFormErrors?.((e) => ({ ...e, targetCount: undefined }));
                              }}
                              style={[
                                styles.presetChip,
                                {
                                  backgroundColor: isSelected ? '#10B981' : colors.cardElevated,
                                  borderColor: isSelected ? '#10B981' : colors.cardBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.presetChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                                {cnt} lần
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <View style={styles.stepperContainer}>
                        <Pressable
                          onPress={() => setFormTargetCount((prev) => String(Math.max(1, parseInt(prev || '1', 10) - 1)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Ionicons name="remove" size={18} color={colors.text} />
                        </Pressable>
                        <View style={[styles.stepperDisplay, { backgroundColor: colors.card, borderColor: '#10B981' }]}>
                          <Text style={[styles.stepperDisplayText, { color: colors.text }]}>
                            {formTargetCount} <Text style={{ fontSize: 13, color: colors.sub }}>{formUnit || 'lần'}</Text>
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => setFormTargetCount((prev) => String(Math.min(9999, parseInt(prev || '1', 10) + 1)))}
                          style={[styles.stepperMiniBtn, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
                        >
                          <Ionicons name="add" size={18} color={colors.text} />
                        </Pressable>
                      </View>

                      <Text style={[styles.fieldLabel, { color: colors.text, marginTop: 8 }]}>Đơn vị tính</Text>
                      <View style={styles.chipWrap}>
                        {dailyUnits.map((u) => (
                          <Pressable
                            key={u}
                            onPress={() => setFormUnit(u)}
                            style={[
                              styles.choiceChip,
                              {
                                borderColor: formUnit === u ? '#10B981' : colors.border,
                                backgroundColor: formUnit === u ? 'rgba(16,185,129,0.15)' : colors.card,
                              },
                            ]}
                          >
                            <Text style={{ color: formUnit === u ? '#10B981' : colors.sub, fontWeight: '700' }}>{u}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* THIẾT LẬP THÔNG BÁO NHẮC NHỞ */}
                  <View style={[styles.reminderSection, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}>
                    <View style={styles.reminderHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="notifications" size={18} color="#10B981" />
                        <Text style={[styles.reminderSectionTitle, { color: colors.text }]}>
                          {t ? t('microHabit.enableReminder') : 'Nhắc nhở theo giờ (Tùy chọn)'}
                        </Text>
                      </View>
                      <Switch
                        value={formReminderEnabled}
                        onValueChange={setFormReminderEnabled}
                        trackColor={{ false: colors.cardBorder, true: '#10B981' }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    {formReminderEnabled && (
                      <View style={styles.reminderBody}>
                        <Text style={[styles.subPickerTitle, { color: colors.text }]}>
                          {t ? t('microHabit.reminderTime') : 'Khung giờ báo thức'}
                        </Text>
                        <Pressable
                          onPress={() => setShowTimePicker(true)}
                          style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: '#10B981' }]}
                        >
                          <Ionicons name="alarm-outline" size={26} color="#10B981" />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={[styles.timePickerVal, { color: colors.text }]}>
                              {formReminderTime}
                            </Text>
                            <Text style={[styles.timePickerSub, { color: colors.sub }]}>
                              {formType === HABIT_TYPES.DAILY ? 'Báo mỗi ngày lúc giờ này' : 'Báo vào ngày đến hạn lúc giờ này'}
                            </Text>
                          </View>
                          <View style={[styles.changeTimeBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Text style={{ color: '#10B981', fontSize: 12, fontWeight: '700' }}>Đổi giờ</Text>
                          </View>
                        </Pressable>

                        {showTimePicker && (
                          Platform.OS === 'ios' ? (
                            <Modal visible={showTimePicker} transparent animationType="fade">
                              <View style={styles.timePickerModalOverlay}>
                                <View style={[styles.timePickerModalBox, { backgroundColor: colors.card }]}>
                                  <View style={styles.timePickerModalHeader}>
                                    <Text style={[styles.timePickerModalTitle, { color: colors.text }]}>Chọn giờ nhắc</Text>
                                    <Pressable onPress={() => setShowTimePicker(false)}>
                                      <Ionicons name="close" size={22} color={colors.sub} />
                                    </Pressable>
                                  </View>
                                  <DateTimePicker
                                    value={pickerDate}
                                    mode="time"
                                    is24Hour
                                    display="spinner"
                                    textColor={colors.text}
                                    onChange={handleTimePickerChange}
                                  />
                                  <Pressable
                                    onPress={() => setShowTimePicker(false)}
                                    style={[styles.timePickerModalDone, { backgroundColor: '#10B981' }]}
                                  >
                                    <Text style={styles.timePickerModalDoneText}>Xác nhận giờ</Text>
                                  </Pressable>
                                </View>
                              </View>
                            </Modal>
                          ) : (
                            <DateTimePicker
                              value={pickerDate}
                              mode="time"
                              is24Hour
                              display="default"
                              onChange={handleTimePickerChange}
                            />
                          )
                        )}

                        {/* Dòng xem trước từ hàm computeNextOccurrence */}
                        {occurrencePreview?.previewText ? (
                          <View style={[styles.previewBox, { backgroundColor: colors.card, borderColor: '#10B981', marginTop: 10 }]}>
                            <Ionicons name="time-outline" size={16} color="#10B981" />
                            <Text style={[styles.previewText, { color: colors.text }]}>
                              {occurrencePreview.previewText}
                            </Text>
                          </View>
                        ) : null}

                        {/* Tùy chọn khi giờ nhắc đã qua hôm nay */}
                        {occurrencePreview?.passedToday && formType === HABIT_TYPES.DAILY ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={[styles.fieldSubLabel, { color: colors.sub }]}>Tùy chọn bắt đầu theo dõi:</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                              <Pressable
                                onPress={() => setFormStartDate?.(getTodayDateString())}
                                style={[
                                  styles.choiceChip,
                                  {
                                    flex: 1,
                                    borderColor: formStartDate === getTodayDateString() || !formStartDate ? '#10B981' : colors.border,
                                    backgroundColor: formStartDate === getTodayDateString() || !formStartDate ? 'rgba(16,185,129,0.15)' : colors.card,
                                    paddingVertical: 10,
                                    alignItems: 'center',
                                  },
                                ]}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: formStartDate === getTodayDateString() || !formStartDate ? '#10B981' : colors.sub }}>
                                  Từ hôm nay
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  const tom = new Date();
                                  tom.setDate(tom.getDate() + 1);
                                  setFormStartDate?.(getTodayDateString(tom));
                                }}
                                style={[
                                  styles.choiceChip,
                                  {
                                    flex: 1,
                                    borderColor: formStartDate && formStartDate > getTodayDateString() ? '#10B981' : colors.border,
                                    backgroundColor: formStartDate && formStartDate > getTodayDateString() ? 'rgba(16,185,129,0.15)' : colors.card,
                                    paddingVertical: 10,
                                    alignItems: 'center',
                                  },
                                ]}
                              >
                                <Text style={{ fontSize: 13, fontWeight: '700', color: formStartDate && formStartDate > getTodayDateString() ? '#10B981' : colors.sub }}>
                                  Từ ngày mai
                                </Text>
                              </Pressable>
                            </View>
                          </View>
                        ) : null}

                        {/* Khoảng cách nhắc trong ngày */}
                        {formType === HABIT_TYPES.DAILY && setFormReminderIntervalHours ? (
                          <View style={{ marginTop: 12 }}>
                            <Text style={[styles.fieldSubLabel, { color: colors.text, fontWeight: '700', fontSize: 12 }]}>
                              Khoảng cách nhắc trong ngày
                            </Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              {[
                                { val: '0', label: '1 lần duy nhất' },
                                { val: '1', label: 'Mỗi 1 giờ' },
                                { val: '2', label: 'Mỗi 2 giờ' },
                                { val: '3', label: 'Mỗi 3 giờ' },
                                { val: '4', label: 'Mỗi 4 giờ' },
                                { val: 'custom', label: '⚙️ Tùy chỉnh' },
                              ].map((opt) => {
                                const isCustomMode = String(formReminderIntervalHours).startsWith('custom');
                                const isSel = opt.val === 'custom'
                                  ? isCustomMode
                                  : !isCustomMode && String(formReminderIntervalHours) === opt.val;
                                return (
                                  <Pressable
                                    key={opt.val}
                                    onPress={() => {
                                      if (opt.val === 'custom') {
                                        setFormReminderIntervalHours('custom:1');
                                        if (formReminderIntervalMinutes === '0') {
                                          setFormReminderIntervalMinutes?.('30');
                                        }
                                      } else {
                                        setFormReminderIntervalHours(opt.val);
                                        setFormReminderIntervalMinutes?.('0');
                                      }
                                    }}
                                    style={[
                                      styles.presetChip,
                                      {
                                        backgroundColor: isSel ? '#10B981' : colors.cardElevated,
                                        borderColor: isSel ? '#10B981' : colors.cardBorder,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.presetChipText, { color: isSel ? '#FFFFFF' : colors.text }]}>
                                      {opt.label}
                                    </Text>
                                  </Pressable>
                                );
                              })}
                            </View>

                            {/* Bộ tùy chỉnh giờ + phút */}
                            {String(formReminderIntervalHours).startsWith('custom') ? (
                              <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.cardElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder }}>
                                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12, marginBottom: 10 }}>
                                  Cách nhắc mỗi:
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                                  <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ color: colors.sub, fontSize: 11, marginBottom: 4 }}>Giờ (0–12)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Pressable
                                        onPress={() => {
                                          const raw = String(formReminderIntervalHours);
                                          const cur = raw.startsWith('custom:') ? parseInt(raw.split(':')[1] || '0', 10) : 0;
                                          const newH = Math.max(0, cur - 1);
                                          setFormReminderIntervalHours(`custom:${newH}`);
                                        }}
                                        style={[styles.stepperMiniBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                      >
                                        <Ionicons name="remove" size={16} color={colors.text} />
                                      </Pressable>
                                      <View style={[styles.stepperDisplay, { backgroundColor: colors.card, borderColor: '#10B981', minWidth: 44 }]}>
                                        <Text style={[styles.stepperDisplayText, { color: colors.text }]}>
                                          {String(formReminderIntervalHours).startsWith('custom:') ? String(formReminderIntervalHours).split(':')[1] || '0' : '0'}
                                        </Text>
                                      </View>
                                      <Pressable
                                        onPress={() => {
                                          const raw = String(formReminderIntervalHours);
                                          const cur = raw.startsWith('custom:') ? parseInt(raw.split(':')[1] || '0', 10) : 0;
                                          const newH = Math.min(12, cur + 1);
                                          setFormReminderIntervalHours(`custom:${newH}`);
                                        }}
                                        style={[styles.stepperMiniBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                      >
                                        <Ionicons name="add" size={16} color={colors.text} />
                                      </Pressable>
                                    </View>
                                  </View>

                                  <Text style={{ color: colors.sub, fontSize: 18, fontWeight: '700' }}>:</Text>

                                  <View style={{ alignItems: 'center', flex: 1 }}>
                                    <Text style={{ color: colors.sub, fontSize: 11, marginBottom: 4 }}>Phút (bước 5)</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                      <Pressable
                                        onPress={() => {
                                          const cur = parseInt(formReminderIntervalMinutes || '0', 10);
                                          const newM = Math.max(0, Math.floor((cur - 5) / 5) * 5);
                                          setFormReminderIntervalMinutes?.(String(newM));
                                        }}
                                        style={[styles.stepperMiniBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                      >
                                        <Ionicons name="remove" size={16} color={colors.text} />
                                      </Pressable>
                                      <View style={[styles.stepperDisplay, { backgroundColor: colors.card, borderColor: '#10B981', minWidth: 44 }]}>
                                        <Text style={[styles.stepperDisplayText, { color: colors.text }]}>
                                          {String(parseInt(formReminderIntervalMinutes || '0', 10)).padStart(2, '0')}
                                        </Text>
                                      </View>
                                      <Pressable
                                        onPress={() => {
                                          const cur = parseInt(formReminderIntervalMinutes || '0', 10);
                                          const newM = Math.min(55, Math.ceil((cur + 5) / 5) * 5);
                                          setFormReminderIntervalMinutes?.(String(newM));
                                        }}
                                        style={[styles.stepperMiniBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                                      >
                                        <Ionicons name="add" size={16} color={colors.text} />
                                      </Pressable>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            ) : null}

                            {/* Giờ kết thúc nhắc */}
                            {formReminderIntervalHours !== '0' && setFormReminderEndTime ? (
                              <View style={{ marginTop: 10 }}>
                                <Text style={{ color: colors.sub, fontSize: 11, fontWeight: '600', marginBottom: 4 }}>
                                  Giờ dừng nhắc (tùy chọn)
                                </Text>
                                <Pressable
                                  onPress={() => setShowEndTimePicker?.(true)}
                                  style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, paddingVertical: 10 }]}
                                >
                                  <Ionicons name="moon-outline" size={20} color={colors.sub} />
                                  <View style={{ flex: 1, marginLeft: 10 }}>
                                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                      {formReminderEndTime || 'Không giới hạn (cả ngày)'}
                                    </Text>
                                    <Text style={{ color: colors.sub, fontSize: 11 }}>
                                      Nhắc từ {formReminderTime || '08:00'}{formReminderEndTime ? ` đến ${formReminderEndTime}` : ' đến cuối ngày'}
                                    </Text>
                                  </View>
                                  {formReminderEndTime ? (
                                    <Pressable
                                      onPress={() => setFormReminderEndTime('')}
                                      hitSlop={8}
                                      style={{ padding: 4 }}
                                    >
                                      <Ionicons name="close-circle" size={18} color={colors.sub} />
                                    </Pressable>
                                  ) : null}
                                </Pressable>

                                {showEndTimePicker && (
                                  <DateTimePicker
                                    value={pickerDate}
                                    mode="time"
                                    is24Hour
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                      setShowEndTimePicker?.(false);
                                      if (selectedDate) {
                                        const h = String(selectedDate.getHours()).padStart(2, '0');
                                        const m = String(selectedDate.getMinutes()).padStart(2, '0');
                                        setFormReminderEndTime(`${h}:${m}`);
                                      }
                                    }}
                                  />
                                )}
                              </View>
                            ) : null}
                          </View>
                        ) : null}

                        {/* Cho việc Theo ngày và Hàng tháng: Chọn ngày bắt đầu */}
                        {(formType === HABIT_TYPES.INTERVAL || formType === HABIT_TYPES.MONTHLY) && setShowStartDatePicker ? (
                          <View style={{ marginTop: 10 }}>
                            <Text style={[styles.subPickerTitle, { color: colors.text }]}>Ngày bắt đầu / Đến hạn kế tiếp</Text>
                            <Pressable
                              onPress={() => setShowStartDatePicker(true)}
                              style={[styles.timePickerBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder, marginTop: 4 }]}
                            >
                              <Ionicons name="calendar-outline" size={22} color="#3B82F6" />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={[styles.timePickerVal, { color: colors.text, fontSize: 15 }]}>
                                  {formStartDate ? new Date(formStartDate).toLocaleDateString() : 'Mặc định theo chu kỳ'}
                                </Text>
                                <Text style={[styles.timePickerSub, { color: colors.sub }]}>
                                  {occurrencePreview?.dueDate ? `Kỳ tiếp theo: ${new Date(occurrencePreview.dueDate).toLocaleDateString()}` : 'Tự động tính'}
                                </Text>
                              </View>
                              <View style={[styles.changeTimeBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                <Text style={{ color: '#3B82F6', fontSize: 12, fontWeight: '700' }}>Chọn ngày</Text>
                              </View>
                            </Pressable>

                            {occurrencePreview?.explanation ? (
                              <View style={[styles.explanationBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: '#F59E0B' }]}>
                                <Ionicons name="information-circle" size={16} color="#F59E0B" />
                                <Text style={{ color: '#F59E0B', fontSize: 12, flex: 1, marginLeft: 6, fontWeight: '600' }}>
                                  {occurrencePreview.explanation}
                                </Text>
                              </View>
                            ) : null}

                            {showStartDatePicker && (
                              <DateTimePicker
                                value={formStartDate ? new Date(formStartDate) : new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                  setShowStartDatePicker(false);
                                  if (selectedDate) {
                                    setFormStartDate?.(getTodayDateString(selectedDate));
                                  }
                                }}
                              />
                            )}
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>

                  {/* Danh mục */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Nhóm / Danh mục</Text>
                  <View style={styles.chipWrap}>
                    {categories.map((cat) => (
                      <Pressable
                        key={cat}
                        onPress={() => { setFormCategory(cat); setFormErrors?.((e) => ({ ...e, category: undefined })); }}
                        style={[
                          styles.choiceChip,
                          {
                            borderColor: formCategory === cat ? '#10B981' : colors.border,
                            backgroundColor: formCategory === cat ? 'rgba(16,185,129,0.15)' : colors.card,
                          },
                        ]}
                      >
                        <Text style={{ color: formCategory === cat ? '#10B981' : colors.sub, fontWeight: '700' }}>{cat}</Text>
                      </Pressable>
                    ))}
                  </View>

                  {customCategories.length ? (
                    <View style={styles.customCategoryRow}>
                      {customCategories.map((cat) => (
                        <View key={cat} style={[styles.choiceChip, { flexDirection: 'row', gap: 4, borderColor: colors.border }]}>
                          <Pressable onPress={() => { setFormCategory('Khác'); setFormCustomCategory(cat); }}>
                            <Text style={{ color: colors.sub, fontWeight: '700' }}>{cat}</Text>
                          </Pressable>
                          <Pressable
                            onPress={async () => {
                              const next = customCategories.filter((item) => item !== cat);
                              setCustomCategories(next);
                              if (saveCustomCategories) await saveCustomCategories(next);
                            }}
                            hitSlop={6}
                          >
                            <Ionicons name="close" size={14} color={colors.sub} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {formCategory === 'Khác' ? (
                    <>
                      <TextInput
                        autoFocus
                        value={formCustomCategory}
                        onChangeText={(text) => { setFormCustomCategory(text); setFormErrors?.((e) => ({ ...e, category: undefined })); }}
                        maxLength={20}
                        placeholder="Tên danh mục"
                        placeholderTextColor={colors.sub}
                        style={[styles.input, { color: colors.text, borderColor: formErrors.category ? '#EF4444' : colors.border, marginTop: 8 }]}
                      />
                      {formErrors.category ? <Text style={styles.errorText}>{formErrors.category}</Text> : null}
                    </>
                  ) : null}

                  {/* Ghi chú */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Ghi chú thêm</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                    value={formNote}
                    onChangeText={setFormNote}
                    placeholder="VD: Nhớt 10W40, STK chủ nhà..."
                    placeholderTextColor={colors.sub}
                  />

                  {/* Chọn màu sắc */}
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Màu đại diện</Text>
                  <View style={styles.colorPalette}>
                    {presetColors.map((c) => (
                      <Pressable
                        key={c}
                        onPress={() => setFormColor(c)}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          formColor === c && styles.colorCircleSelected,
                        ]}
                      />
                    ))}
                  </View>

                  {/* Nút Submit */}
                  <Pressable
                    onPress={handleSaveForm}
                    disabled={!isFormValid || isSaving}
                    style={[styles.saveBtn, { backgroundColor: isFormValid && !isSaving ? '#10B981' : '#6B7280', opacity: isFormValid && !isSaving ? 1 : 0.5 }]}
                  >
                    {isSaving ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.saveBtnText}>Đang lưu...</Text>
                      </View>
                    ) : (
                      <Text style={styles.saveBtnText}>
                        {editingId
                          ? (t ? t('microHabit.updateHabit') : 'Cập nhật việc vặt')
                          : (t ? t('microHabit.saveHabit') : 'Lưu việc vặt mới')}
                      </Text>
                    )}
                  </Pressable>
                  <View style={{ height: 20 }} />
                </View>
              )}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Hộp thoại xác nhận thay đổi chưa lưu */}
        {showUnsavedConfirm && (
          <View style={styles.confirmOverlayAbsolute}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={handleContinueEditing} />
            <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.confirmHeader}>
                <Ionicons name="alert-circle" size={30} color="#F59E0B" />
                <Text style={[styles.confirmTitle, { color: colors.text }]}>Lưu thay đổi?</Text>
              </View>
              <Text style={[styles.confirmDesc, { color: colors.sub }]}>
                Bạn có các thay đổi chưa được lưu. Bạn có muốn lưu lại trước khi thoát không?
              </Text>

              <View style={styles.confirmActionCol}>
                <Pressable
                  onPress={handleSaveAndExit}
                  disabled={isSaving}
                  style={[styles.confirmBtn, styles.confirmBtnSave]}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnTextSave}>Lưu và thoát</Text>
                </Pressable>

                <Pressable
                  onPress={handleDiscardAndExit}
                  style={[styles.confirmBtn, styles.confirmBtnDiscard]}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnTextDiscard}>Không lưu</Text>
                </Pressable>

                <Pressable
                  onPress={handleContinueEditing}
                  style={[styles.confirmBtn, styles.confirmBtnContinue, { borderColor: colors.cardBorder, backgroundColor: colors.cardElevated }]}
                >
                  <Text style={[styles.confirmBtnTextContinue, { color: colors.text }]}>Tiếp tục chỉnh sửa</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// src/features/fap/FapExamListView.js
// Component hiển thị Tab Lịch thi FAP, cấu hình chuông nhắc trước giờ thi & thao tác lịch thi

import React from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { REMINDER_PRESETS } from './fapExamHelper';
import FapExamCard from './FapExamCard';

export default function FapExamListView({
  exams = [],
  colors,
  fapUser,
  now,
  defaultReminderMins = 30,
  customMinsInput = '30',
  setCustomMinsInput,
  onSelectPresetMins,
  onApplyCustomMins,
  onToggleReminder,
  onEditExam,
  onDeleteExam,
  onOpenAddModal,
  headerComponent,
}) {
  const insets = useSafeAreaInsets();
  const renderExamItem = ({ item }) => (
    <FapExamCard
      item={item}
      colors={colors}
      defaultReminderMins={defaultReminderMins}
      now={now}
      onToggleReminder={onToggleReminder}
      onEditExam={onEditExam}
      onDeleteExam={onDeleteExam}
    />
  );

  return (
    <FlatList
      data={fapUser ? exams : []}
      keyExtractor={(item) => item.id}
      renderItem={renderExamItem}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <>
          {headerComponent}

          {fapUser && (
            <>
              {/* CẤU HÌNH THỜI GIAN NHẮC NHỞ TRƯỚC GIỜ THI */}
              <View style={[styles.reminderConfigCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.configHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="alarm-outline" size={20} color={colors.primary} />
                    <Text style={[styles.configTitle, { color: colors.text }]}>
                      Thời gian nhắc nhở trước giờ thi
                    </Text>
                  </View>
                  <View style={[styles.activeMinsPill, { backgroundColor: 'rgba(255, 208, 0, 0.15)' }]}>
                    <Text style={{ color: colors.primary, fontSize: 11.5, fontWeight: '800' }}>
                      Trước {defaultReminderMins} phút
                    </Text>
                  </View>
                </View>

                {/* <Text style={[styles.configSub, { color: colors.sub }]}>
                  Chọn nhanh mốc thời gian hoặc tự nhập số phút bạn muốn hệ thống báo chuông trước khi vào phòng thi:
                </Text> */}

                {/* Hàng nút chọn nhanh (Presets) */}
                <View style={styles.presetRow}>
                  {REMINDER_PRESETS.map((p) => {
                    const selected = defaultReminderMins === p.minutes;
                    return (
                      <Pressable
                        key={p.minutes}
                        onPress={() => onSelectPresetMins?.(p.minutes)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: selected ? colors.primary : colors.bg,
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: '700',
                            color: selected ? '#121214' : colors.text,
                          }}
                        >
                          {p.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Ô tự nhập số phút tùy chỉnh */}
                <View style={styles.customInputRow}>
                  <TextInput
                    value={customMinsInput}
                    onChangeText={setCustomMinsInput}
                    keyboardType="numeric"
                    placeholder="Nhập số phút (VD: 45)"
                    placeholderTextColor={colors.sub}
                    style={[
                      styles.customMinsInput,
                      { color: colors.text, backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                  />
                  <Pressable
                    onPress={onApplyCustomMins}
                    style={[styles.applyMinsBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.applyMinsBtnText}>Lưu mốc nhắc</Text>
                  </Pressable>
                </View>
              </View>

              {/* TIÊU ĐỀ BẢNG LỊCH THI CỦA TÔI */}
              <View style={styles.scheduleHeaderRow}>
                <View>
                  <Text style={[styles.scheduleTitle, { color: colors.text }]}>
                    Lịch thi của tôi ({exams.length})
                  </Text>
                  <Text style={{ color: colors.sub, fontSize: 12 }}>
                    Tự động đồng bộ từ cổng đào tạo FAP
                  </Text>
                </View>

                <Pressable
                  onPress={onOpenAddModal}
                  style={[styles.addScheduleBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: 12.5, fontWeight: '800' }}>
                    Thêm / Dán lịch FAP
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </>
      }
      ListEmptyComponent={
        fapUser ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-clear-outline" size={36} color={colors.sub} />
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 10 }}>
              Chưa có lịch thi nào
            </Text>
            <Text style={{ color: colors.sub, fontSize: 12.5, marginTop: 4, textAlign: 'center' }}>
              Nhấn "Tự động lấy lại lịch thi" hoặc "Thêm / Dán lịch FAP" để cập nhật.
            </Text>
          </View>
        ) : null
      }
      ListFooterComponent={<View style={{ height: Math.max(insets.bottom + 30, 60) }} />}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 18, paddingTop: 8 },
  reminderConfigCard: { borderRadius: 18, borderWidth: 1, padding: 15, marginBottom: 16 },
  configHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  configTitle: { fontSize: 14.5, fontWeight: '800' },
  activeMinsPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  configSub: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 12 },
  presetChip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 9, borderWidth: 1 },
  customInputRow: { flexDirection: 'row', gap: 8 },
  customMinsInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13 },
  applyMinsBtn: { paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  applyMinsBtnText: { color: '#121214', fontWeight: '800', fontSize: 12.5 },
  scheduleHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  scheduleTitle: { fontSize: 16.5, fontWeight: '800' },
  addScheduleBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  emptyBox: { padding: 28, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
});

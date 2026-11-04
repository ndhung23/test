// src/screens/tools/fap/FapExamCard.js
// Thẻ hiển thị môn thi FAP kèm đếm ngược, badge PE/FE, mốc giờ nhắc và nút thao tác

import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getExamTimeStatus, triggerExamNotification } from './fapExamHelper';

export default function FapExamCard({
  item,
  colors,
  defaultReminderMins,
  now,
  onToggleReminder,
  onEditExam,
  onDeleteExam,
}) {
  const status = getExamTimeStatus(item, defaultReminderMins, now);
  const isPE = item.examType?.toUpperCase() === 'PE';

  return (
    <View
      style={[
        styles.examCard,
        {
          backgroundColor: colors.card,
          borderColor: status.isReminderReached ? colors.primary : colors.cardBorder,
        },
      ]}
    >
      {/* Hàng trên: Mã môn + Loại thi (PE/FE) + Switch bật/tắt nhắc nhở */}
      <View style={styles.examTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={[
              styles.examTypeBadge,
              {
                backgroundColor: isPE ? 'rgba(245, 158, 11, 0.16)' : 'rgba(59, 130, 246, 0.16)',
                borderColor: isPE ? '#F59E0B' : '#3B82F6',
              },
            ]}
          >
            <Text
              style={{
                color: isPE ? '#F59E0B' : '#3B82F6',
                fontWeight: '900',
                fontSize: 11.5,
              }}
            >
              {item.examType || 'PE'}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.subjectCodeText, { color: colors.text }]}>
              {item.subjectCode}
            </Text>
            <Text style={[styles.subjectNameText, { color: colors.sub }]} numberOfLines={2}>
              {item.subjectName}
            </Text>
          </View>
        </View>

        <Switch
          value={Boolean(item.reminderEnabled)}
          onValueChange={() => onToggleReminder(item.id)}
          trackColor={{ false: '#3E3E42', true: colors.primary }}
          thumbColor={item.reminderEnabled ? '#121214' : '#9E9EA7'}
        />
      </View>

      {/* Bảng chi tiết Ngày - Giờ - Phòng - Hình thức thi chuẩn FAP */}
      <View style={[styles.examMetaGrid, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.metaCell}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Ngày thi:</Text>
          <Text style={[styles.metaValue, { color: colors.text }]}>{item.date}</Text>
        </View>

        <View style={styles.metaCell}>
          <Ionicons name="time-outline" size={14} color="#10B981" />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Thời gian:</Text>
          <Text style={[styles.metaValue, { color: '#10B981' }]}>{item.time}</Text>
        </View>

        <View style={styles.metaCell}>
          <Ionicons name="location-outline" size={14} color="#F59E0B" />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Phòng thi:</Text>
          <Text style={[styles.metaValue, { color: '#F59E0B' }]}>{item.room}</Text>
        </View>

        <View style={styles.metaCell}>
          <Ionicons name="desktop-outline" size={14} color="#3B82F6" />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Hình thức:</Text>
          <Text style={[styles.metaValue, { color: colors.text }]} numberOfLines={1}>
            {item.examForm}
          </Text>
        </View>
      </View>

      {/* Khung trạng thái Đếm ngược & Mốc giờ báo nhắc nhở */}
      <View
        style={[
          styles.countdownBanner,
          {
            backgroundColor: status.isReminderReached
              ? 'rgba(255, 208, 0, 0.16)'
              : item.reminderEnabled
              ? 'rgba(16, 185, 129, 0.1)'
              : 'rgba(158, 158, 167, 0.08)',
            borderColor: status.isReminderReached
              ? colors.primary
              : item.reminderEnabled
              ? 'rgba(16, 185, 129, 0.3)'
              : colors.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons
              name={item.reminderEnabled ? 'notifications' : 'notifications-off-outline'}
              size={15}
              color={
                status.isReminderReached
                  ? colors.primary
                  : item.reminderEnabled
                  ? '#10B981'
                  : colors.sub
              }
            />
            <Text
              style={{
                fontSize: 12.5,
                fontWeight: '800',
                color: status.isReminderReached
                  ? colors.primary
                  : item.reminderEnabled
                  ? '#10B981'
                  : colors.sub,
              }}
            >
              {status.countdownText}
            </Text>
          </View>
          <Text style={{ fontSize: 11.5, color: colors.sub, marginTop: 3 }}>
            {item.reminderEnabled
              ? `Hẹn nhắc trước ${status.reminderMins} phút (${status.reminderTimeText})`
              : 'Đã tắt nhắc nhở cho môn thi này'}
          </Text>
        </View>

        {item.customReminderMinutes !== null && item.customReminderMinutes !== undefined && (
          <View style={[styles.customPill, { backgroundColor: 'rgba(255, 208, 0, 0.18)' }]}>
            <Text style={{ color: colors.primary, fontSize: 10.5, fontWeight: '800' }}>
              Riêng: {item.customReminderMinutes}p
            </Text>
          </View>
        )}
      </View>

      {/* Hàng nút hành động: Test thông báo / Chỉnh sửa / Xóa */}
      <View style={styles.examActionsRow}>
        <Pressable
          onPress={() => triggerExamNotification(item, status.reminderMins)}
          style={[styles.actionBtn, { backgroundColor: 'rgba(255, 208, 0, 0.14)', borderColor: colors.primary }]}
        >
          <Ionicons name="volume-high-outline" size={14} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
            Test nhắc ngay
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onEditExam(item)}
          style={[styles.actionBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <Ionicons name="options-outline" size={14} color={colors.text} />
          <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
            Chỉnh giờ / Nhắc
          </Text>
        </Pressable>

        <Pressable
          onPress={() => onDeleteExam(item)}
          style={[styles.iconOnlyBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
        >
          <Ionicons name="trash-outline" size={14} color={colors.danger || '#EF4444'} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  examCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  examTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  examTypeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  subjectCodeText: { fontSize: 15, fontWeight: '900' },
  subjectNameText: { fontSize: 12, marginTop: 1 },
  examMetaGrid: { borderRadius: 12, borderWidth: 1, padding: 10, gap: 6, marginBottom: 10 },
  metaCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaLabel: { fontSize: 12, width: 72 },
  metaValue: { fontSize: 12.5, fontWeight: '700', flex: 1 },
  countdownBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, borderWidth: 1, marginBottom: 10 },
  customPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  examActionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  iconOnlyBtn: { width: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1 },
});


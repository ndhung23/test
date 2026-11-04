// src/features/fap/FapUpcomingClassCard.js
// Thẻ hiển thị nổi bật "Ca học tiếp theo" (Next Upcoming Class) kèm đếm mốc, phòng học, GV & link Meet

import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { detectSlotFromTimeStr } from './fapAttendanceHelper';

export default function FapUpcomingClassCard({ item, colors }) {
  if (!item) return null;

  const rawSlot = Number(item.slot);
  const slotNum = rawSlot >= 1 && rawSlot <= 9 ? rawSlot : (detectSlotFromTimeStr(item.time) || 1);

  const rawLecturer = (item.lecturer || '').trim();
  const isOnline =
    Boolean(item.meetLink) ||
    String(item.time || '').toLowerCase().includes('online') ||
    String(item.mode || '').toLowerCase() === 'online' ||
    rawLecturer.toLowerCase() === 'online';

  let classCode = item.classCode || '';
  let cleanLecturer = rawLecturer;

  // Tự động bóc tách mã lớp nếu bị lẫn trong lecturer (ví dụ: EXE101 - SE1990-NJ)
  if (!classCode && cleanLecturer) {
    const cMatch = cleanLecturer.match(/\b([A-Z]{2,4}\d{4}[A-Z0-9-]*)\b/i);
    if (cMatch) {
      classCode = cMatch[1].toUpperCase();
      cleanLecturer = cleanLecturer.replace(cMatch[0], '').replace(item.subjectCode || '', '').replace(/[-–\s]+/g, ' ').trim();
    }
  }

  if (
    cleanLecturer.toLowerCase() === 'offline' ||
    cleanLecturer.toLowerCase() === 'online' ||
    cleanLecturer === '-' ||
    cleanLecturer.toLowerCase() === 'giảng viên' ||
    cleanLecturer.length < 2 ||
    cleanLecturer.toUpperCase() === item.subjectCode?.toUpperCase()
  ) {
    cleanLecturer = '';
  }

  const cleanTime = String(item.time || '')
    .replace(/\s*-\s*(Offline|Online).*/i, '')
    .replace(/\[.*\]/g, '')
    .trim() || '07h30 - 09h50';

  const isOngoing = item.statusLabel?.includes('Đang diễn ra');

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isOngoing ? '#10B981' : colors.primary,
        },
      ]}
    >
      {/* Header: Tiêu đề "Ca học tiếp theo" + Badge trạng thái */}
      <View style={styles.topRow}>
        <View style={styles.labelWrap}>
          <View style={[styles.pulseDot, { backgroundColor: isOngoing ? '#10B981' : colors.primary }]} />
          <Text style={[styles.headerLabel, { color: isOngoing ? '#10B981' : colors.primary }]}>
            CA HỌC TIẾP THEO
          </Text>
        </View>

        <View
          style={[
            styles.timingBadge,
            {
              backgroundColor: isOngoing ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 208, 0, 0.15)',
              borderColor: isOngoing ? '#10B981' : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={isOngoing ? 'radio' : 'time-outline'}
            size={12}
            color={isOngoing ? '#10B981' : colors.primary}
          />
          <Text
            style={[
              styles.timingBadgeText,
              { color: isOngoing ? '#10B981' : colors.primary },
            ]}
          >
            {item.statusLabel || (item.dayName ? `${item.dayName}` : 'Sắp tới')}
          </Text>
        </View>
      </View>

      {/* Thông tin môn học & Slot */}
      <View style={styles.contentWrap}>
        <View style={styles.subjectRow}>
          <Text style={[styles.subjectCode, { color: colors.text }]}>{item.subjectCode}</Text>
          <View style={[styles.slotBadge, { backgroundColor: isOngoing ? '#10B981' : colors.primary }]}>
            <Text style={styles.slotBadgeText}>SLOT {slotNum}</Text>
          </View>
        </View>

        {item.subjectName && item.subjectName !== item.subjectCode ? (
          <Text style={[styles.subjectName, { color: colors.sub }]} numberOfLines={1}>
            {item.subjectName}
          </Text>
        ) : null}

        <View style={styles.timeRow}>
          <Ionicons name="time" size={13} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.text }]}>
            {item.dayName ? `${item.dayName} • ` : ''}{cleanTime}
          </Text>
        </View>
      </View>

      {/* Thanh Meta: Phòng học & Giảng viên */}
      <View style={[styles.metaBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.metaItem}>
          <Ionicons name="location" size={14} color="#F59E0B" />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Phòng:</Text>
          <Text style={[styles.metaValue, { color: '#F59E0B' }]}>
            {item.room && item.room !== '-' ? item.room : (isOnline ? 'Online' : 'Chưa xếp')}
          </Text>
        </View>

        {classCode ? (
          <View style={styles.metaItem}>
            <Ionicons name="people" size={13} color="#8B5CF6" />
            <Text style={[styles.metaLabel, { color: colors.sub }]}>Lớp:</Text>
            <Text style={[styles.metaValue, { color: '#8B5CF6' }]}>{classCode}</Text>
          </View>
        ) : (
          <View style={styles.metaItem}>
            <Ionicons name="person" size={13} color="#3B82F6" />
            <Text style={[styles.metaLabel, { color: colors.sub }]}>GV:</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {cleanLecturer || 'Bộ môn'}
            </Text>
          </View>
        )}

        <View style={styles.metaItem}>
          <Ionicons
            name={isOnline ? 'videocam' : 'business'}
            size={13}
            color={isOnline ? '#3B82F6' : '#10B981'}
          />
          <Text
            style={[
              styles.metaValue,
              { color: isOnline ? '#3B82F6' : '#10B981' },
            ]}
          >
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Nút vào lớp Google Meet (nếu có) */}
      {item.meetLink ? (
        <Pressable
          onPress={() => Linking.openURL(item.meetLink)}
          style={[styles.meetBtn, { backgroundColor: '#1A73E8' }]}
          hitSlop={8}
        >
          <Ionicons name="videocam" size={15} color="#FFFFFF" />
          <Text style={styles.meetBtnText}>Vào lớp Google Meet ngay</Text>
          <Ionicons name="open-outline" size={13} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLabel: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  timingBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  contentWrap: {
    gap: 3,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectCode: {
    fontSize: 18,
    fontWeight: '900',
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotBadgeText: {
    color: '#121214',
    fontSize: 11,
    fontWeight: '900',
  },
  subjectName: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  meetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  meetBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

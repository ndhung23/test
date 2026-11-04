// src/features/fap/FapAttendanceSlotCard.js
// Thẻ hiển thị một ca học FAP (Slot 1..6, 9) kèm trạng thái điểm danh, Google Meet & Cảnh báo vắng

import React from 'react';
import { View, Text, Pressable, Linking, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ATTENDANCE_STATUS, detectSlotFromTimeStr } from './fapAttendanceHelper';

export default function FapAttendanceSlotCard({ item, colors }) {
  // 1. Chuẩn hóa Slot học (FAP chỉ có slot 1..9, không có slot 101 hay 392)
  const rawSlot = Number(item.slot);
  const slotNum = rawSlot >= 1 && rawSlot <= 9 ? rawSlot : (detectSlotFromTimeStr(item.time) || 1);

  // 2. Chuẩn hóa giảng viên & hình thức học (Offline vs Online)
  const rawLecturer = (item.lecturer || '').trim();
  const isOnline =
    Boolean(item.meetLink) ||
    String(item.time || '').toLowerCase().includes('online') ||
    String(item.mode || '').toLowerCase() === 'online' ||
    rawLecturer.toLowerCase() === 'online';

  let classCode = item.classCode || '';
  let cleanLecturer = rawLecturer;

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

  // 3. Chuẩn hóa giờ học hiển thị (loại bỏ chữ '- Offline' hoặc '- Online' thừa trong time)
  const cleanTime = String(item.time || '')
    .replace(/\s*-\s*(Offline|Online).*/i, '')
    .replace(/\[.*\]/g, '')
    .trim() || '07h30 - 09h50';

  const todayStr = `${String(new Date().getDate()).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const isTodaySlot = item.date && (item.date === todayStr || item.date.includes(todayStr));

  const isAbsent =
    item.status === ATTENDANCE_STATUS.ABSENT ||
    item.status?.toLowerCase() === 'absent' ||
    item.status?.toLowerCase() === 'vắng' ||
    item.status?.toLowerCase() === 'vắng mặt';
  const isPresent =
    item.status === ATTENDANCE_STATUS.PRESENT ||
    item.status?.toLowerCase() === 'present' ||
    item.status?.toLowerCase() === 'có mặt';

  let badgeBg = 'rgba(245, 158, 11, 0.12)';
  let badgeBorder = 'rgba(245, 158, 11, 0.3)';
  let badgeText = '#F59E0B';
  let statusLabel = 'Chưa điểm danh';
  let iconName = 'time-outline';

  if (isAbsent) {
    badgeBg = 'rgba(239, 68, 68, 0.15)';
    badgeBorder = '#EF4444';
    badgeText = '#EF4444';
    statusLabel = 'VẮNG MẶT (ABSENT)';
    iconName = 'alert-circle';
  } else if (isPresent) {
    badgeBg = 'rgba(16, 185, 129, 0.15)';
    badgeBorder = '#10B981';
    badgeText = '#10B981';
    statusLabel = 'Có mặt (Present)';
    iconName = 'checkmark-circle';
  }

  return (
    <View
      style={[
        styles.slotCard,
        {
          backgroundColor: colors.card,
          borderColor: isAbsent ? '#EF4444' : colors.cardBorder,
          borderWidth: isAbsent ? 1.5 : 1,
        },
      ]}
    >
      {/* Hàng 1: Slot + Thời gian + Badge trạng thái */}
      <View style={styles.slotTopRow}>
        <View style={styles.slotBadgeWrap}>
          <View style={[styles.slotBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.slotBadgeText}>SLOT {slotNum}</Text>
          </View>
          <Text style={[styles.slotTimeText, { color: colors.sub }]}>
            {item.dayName ? `${item.dayName} • ` : ''}
            {cleanTime}
          </Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
          <Ionicons name={iconName} size={13} color={badgeText} />
          <Text style={[styles.statusBadgeText, { color: badgeText }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Hàng 2: Tên môn & Mã môn + Badge Online/Offline */}
      <View style={styles.subjectRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[styles.subjectCode, { color: colors.text }]}>{item.subjectCode}</Text>
          <View
            style={[
              styles.modeChip,
              {
                backgroundColor: isOnline ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                borderColor: isOnline ? '#3B82F6' : '#10B981',
              },
            ]}
          >
            <Ionicons
              name={isOnline ? 'videocam-outline' : 'business-outline'}
              size={11}
              color={isOnline ? '#3B82F6' : '#10B981'}
            />
            <Text
              style={[
                styles.modeChipText,
                { color: isOnline ? '#3B82F6' : '#10B981' },
              ]}
            >
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>

        {item.subjectName && item.subjectName !== item.subjectCode ? (
          <Text style={[styles.subjectName, { color: colors.sub }]} numberOfLines={1}>
            {item.subjectName}
          </Text>
        ) : null}
      </View>

      {/* Hàng 3: Phòng học & Giảng viên */}
      <View style={[styles.metaBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color="#F59E0B" />
          <Text style={[styles.metaLabel, { color: colors.sub }]}>Phòng:</Text>
          <Text style={[styles.metaValue, { color: '#F59E0B' }]}>
            {item.room && item.room !== '-' ? item.room : (isOnline ? 'Online' : 'Chưa xếp')}
          </Text>
        </View>

        {classCode ? (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color="#8B5CF6" />
            <Text style={[styles.metaLabel, { color: colors.sub }]}>Lớp:</Text>
            <Text style={[styles.metaValue, { color: '#8B5CF6' }]}>{classCode}</Text>
          </View>
        ) : (
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={13} color="#3B82F6" />
            <Text style={[styles.metaLabel, { color: colors.sub }]}>GV:</Text>
            <Text style={[styles.metaValue, { color: colors.text }]}>
              {cleanLecturer || 'Bộ môn'}
            </Text>
          </View>
        )}
      </View>

      {/* Nút vào Google Meet nếu là lớp Online có link Meet */}
      {item.meetLink ? (
        <Pressable
          onPress={() => {
            if (item.meetLink) {
              Linking.openURL(item.meetLink);
            }
          }}
          style={[styles.meetLinkBtn, { backgroundColor: '#1A73E8' }]}
          hitSlop={8}
        >
          <Ionicons name="videocam" size={14} color="#FFFFFF" />
          <Text style={styles.meetLinkText}>Vào lớp Google Meet</Text>
          <Ionicons name="open-outline" size={13} color="#FFFFFF" />
        </Pressable>
      ) : null}

      {/* Cảnh báo vắng nếu bị Absent */}
      {isAbsent && (
        <View style={styles.absentAlertBanner}>
          <Ionicons name="alert-circle" size={14} color="#EF4444" />
          <Text style={styles.absentAlertBannerText}>
            {isTodaySlot
              ? `Báo chuông máy lúc ${item.alertTime || '10:00'} (+10p) do bị đánh Vắng!`
              : 'Đã ghi nhận vắng mặt ca học này'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slotCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  slotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slotBadgeText: {
    color: '#121214',
    fontSize: 11.5,
    fontWeight: '900',
  },
  slotTimeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  subjectRow: {
    gap: 2,
  },
  subjectCode: {
    fontSize: 16,
    fontWeight: '900',
  },
  subjectName: {
    fontSize: 12,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  modeChipText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  metaBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
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
  meetLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 2,
  },
  meetLinkText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
  },
  absentAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  absentAlertBannerText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
  },
});

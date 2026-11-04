// src/features/fap/FapCourseAttendanceCard.js
// Thẻ hiển thị Trọn bộ Lịch học & Điểm danh cả kỳ của 1 Môn học (20-30 buổi từ FAP)

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeTop } from '../../../components/ui';

export default function FapCourseAttendanceCard({
  course,
  colors,
  onDeleteCourse,
  onRefreshCourse,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Present' | 'Absent' | 'Not yet'
  const safeTop = useSafeTop();

  if (!course) return null;

  const sessions = Array.isArray(course.sessions) ? course.sessions : [];
  const absentNum = course.absentSlots || 0;
  const totalNum = course.totalSlots || sessions.length || 20;
  const absentRateNum = parseFloat((course.absentPercent || '0%').replace('%', '')) || 0;

  // Lọc danh sách buổi học theo bộ lọc
  const filteredSessions = sessions.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status === statusFilter;
  });

  const presentCount = sessions.filter((s) => s.status === 'Present').length;
  const absentCount = sessions.filter((s) => s.status === 'Absent').length;
  const notYetCount = sessions.length - presentCount - absentCount;

  const isDangerAbsent = absentRateNum >= 15;

  const handleDelete = () => {
    Alert.alert(
      'Xóa môn học',
      `Bạn có chắc muốn xóa dữ liệu lịch học và điểm danh môn ${course.courseCode} (${course.courseName})?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => onDeleteCourse?.(course.courseCode),
        },
      ]
    );
  };

  const renderSessionItem = ({ item }) => {
    const isPresent = item.status === 'Present';
    const isAbsent = item.status === 'Absent';

    let badgeBg = 'rgba(245, 158, 11, 0.12)';
    let badgeBorder = 'rgba(245, 158, 11, 0.3)';
    let badgeColor = '#F59E0B';
    let statusText = 'Chưa điểm danh';
    let statusIcon = 'time-outline';

    if (isPresent) {
      badgeBg = 'rgba(16, 185, 129, 0.15)';
      badgeBorder = '#10B981';
      badgeColor = '#10B981';
      statusText = 'Có mặt';
      statusIcon = 'checkmark-circle';
    } else if (isAbsent) {
      badgeBg = 'rgba(239, 68, 68, 0.15)';
      badgeBorder = '#EF4444';
      badgeColor = '#EF4444';
      statusText = 'VẮNG MẶT';
      statusIcon = 'alert-circle';
    }

    return (
      <View
        style={[
          styles.sessionRow,
          {
            backgroundColor: colors.card,
            borderColor: isAbsent ? '#EF4444' : colors.cardBorder,
            borderWidth: isAbsent ? 1.5 : 1,
          },
        ]}
      >
        <View style={styles.sessionHeaderRow}>
          <View style={styles.sessionNumBadge}>
            <Text style={styles.sessionNumText}>Buổi {item.sessionNumber}</Text>
          </View>
          <Text style={[styles.sessionDateText, { color: colors.text }]}>
            {item.dayName ? `${item.dayName} ` : ''}{item.date}
          </Text>

          <View style={[styles.sessionStatusBadge, { backgroundColor: badgeBg, borderColor: badgeBorder }]}>
            <Ionicons name={statusIcon} size={12} color={badgeColor} />
            <Text style={[styles.sessionStatusText, { color: badgeColor }]}>{statusText}</Text>
          </View>
        </View>

        <View style={styles.sessionMetaRow}>
          <View style={styles.sessionMetaCol}>
            <Ionicons name="time-outline" size={13} color={colors.primary} />
            <Text style={[styles.sessionMetaText, { color: colors.sub }]}>
              Slot {item.slot} ({item.time})
            </Text>
          </View>

          <View style={styles.sessionMetaCol}>
            <Ionicons name="location-outline" size={13} color="#F59E0B" />
            <Text style={[styles.sessionMetaText, { color: '#F59E0B' }]}>
              {item.room || 'DE-422'}
            </Text>
          </View>

          <View style={styles.sessionMetaCol}>
            <Ionicons name="person-outline" size={13} color="#3B82F6" />
            <Text style={[styles.sessionMetaText, { color: colors.text }]}>
              {item.lecturer && item.lecturer !== '-' ? item.lecturer : 'Giảng viên'}
            </Text>
          </View>
        </View>

        {item.note && item.note !== '-' ? (
          <View style={[styles.sessionNoteBox, { backgroundColor: colors.bg }]}>
            <Ionicons name="information-circle-outline" size={12} color={colors.sub} />
            <Text style={[styles.sessionNoteText, { color: colors.sub }]}>{item.note}</Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDangerAbsent ? '#EF4444' : colors.cardBorder,
            borderWidth: isDangerAbsent ? 1.5 : 1,
          },
        ]}
      >
        {/* Hàng 1: Mã môn + Tên môn + Nút Xóa */}
        <View style={styles.topRow}>
          <View style={styles.courseTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={[styles.codeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.codeText}>{course.courseCode}</Text>
              </View>
              {course.group ? (
                <View style={[styles.groupBadge, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.groupText, { color: colors.sub }]}>{course.group}</Text>
                </View>
              ) : null}
              {course.term ? (
                <View style={[styles.groupBadge, { borderColor: colors.cardBorder }]}>
                  <Text style={[styles.groupText, { color: colors.sub }]}>{course.term}</Text>
                </View>
              ) : null}
            </View>

            <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
              {course.courseName || course.courseCode}
            </Text>
          </View>

          <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={17} color="#EF4444" />
          </Pressable>
        </View>

        {/* Hàng 2: Thống kê số buổi & Tỷ lệ vắng */}
        <View style={[styles.statsBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: colors.text }]}>{sessions.length} / {totalNum}</Text>
            <Text style={[styles.statLbl, { color: colors.sub }]}>Tổng buổi</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>{presentCount}</Text>
            <Text style={[styles.statLbl, { color: '#10B981' }]}>Có mặt</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statNum, { color: absentCount > 0 ? '#EF4444' : colors.text }]}>
              {absentNum}
            </Text>
            <Text style={[styles.statLbl, { color: absentCount > 0 ? '#EF4444' : colors.sub }]}>
              Đã vắng
            </Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.statCol}>
            <View
              style={[
                styles.absentRateChip,
                {
                  backgroundColor: isDangerAbsent
                    ? 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.absentRateText,
                  { color: isDangerAbsent ? '#EF4444' : '#10B981' },
                ]}
              >
                Vắng {course.absentPercent || '0%'}
              </Text>
            </View>
            <Text style={[styles.statLbl, { color: colors.sub }]}>Tỷ lệ nghỉ</Text>
          </View>
        </View>

        {/* Cảnh báo nếu nguy cơ cấm thi (vắng >= 15%) */}
        {isDangerAbsent ? (
          <View style={styles.dangerAlertBox}>
            <Ionicons name="warning" size={15} color="#EF4444" />
            <Text style={styles.dangerAlertText}>
              Cảnh báo: Bạn đã vắng {course.absentPercent}! Giới hạn tối đa là 20% để được dự thi.
            </Text>
          </View>
        ) : null}

        {/* Nút Xem chi tiết trọn bộ các buổi học */}
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.viewDetailsBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="list-outline" size={16} color="#121214" />
          <Text style={styles.viewDetailsBtnText}>
            Xem chi tiết {sessions.length} buổi học cả kỳ
          </Text>
        </Pressable>
      </View>

      {/* Modal Danh sách đầy đủ 20-30 buổi học cả kỳ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: colors.bg }]}>
          {/* Header Modal */}
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: colors.card,
                borderBottomColor: colors.cardBorder,
                paddingTop: safeTop + 8,
              },
            ]}
          >
            <Pressable onPress={() => setModalVisible(false)} hitSlop={8} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>

            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {course.courseCode} — {course.courseName || course.courseCode}
              </Text>
              <Text style={[styles.modalSub, { color: colors.sub }]}>
                {course.group} • {course.term} • Vắng {course.absentPercent || '0%'} ({absentNum}/{totalNum} buổi)
              </Text>
            </View>

            {onRefreshCourse ? (
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  onRefreshCourse(course);
                }}
                hitSlop={8}
                style={styles.backBtn}
              >
                <Ionicons name="refresh-outline" size={20} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>

          {/* Thanh lọc trạng thái buổi học: Tất cả / Có mặt / Vắng / Chưa học */}
          <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.cardBorder }]}>
            <Pressable
              onPress={() => setStatusFilter('ALL')}
              style={[
                styles.filterChip,
                statusFilter === 'ALL' && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === 'ALL' ? '#121214' : colors.sub },
                ]}
              >
                Tất cả ({sessions.length})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter('Present')}
              style={[
                styles.filterChip,
                statusFilter === 'Present' && { backgroundColor: '#10B981' },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === 'Present' ? '#FFFFFF' : '#10B981' },
                ]}
              >
                Có mặt ({presentCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter('Absent')}
              style={[
                styles.filterChip,
                statusFilter === 'Absent' && { backgroundColor: '#EF4444' },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === 'Absent' ? '#FFFFFF' : '#EF4444' },
                ]}
              >
                Vắng ({absentCount})
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStatusFilter('Not yet')}
              style={[
                styles.filterChip,
                statusFilter === 'Not yet' && { backgroundColor: '#F59E0B' },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: statusFilter === 'Not yet' ? '#121214' : '#F59E0B' },
                ]}
              >
                Chưa học ({notYetCount})
              </Text>
            </Pressable>
          </View>

          {/* Danh sách FlatList tất cả các buổi */}
          <FlatList
            data={filteredSessions}
            keyExtractor={(item) => `session_${course.courseCode}_${item.sessionNumber}`}
            renderItem={renderSessionItem}
            contentContainerStyle={styles.sessionListContent}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            ListEmptyComponent={
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Ionicons name="filter-outline" size={32} color={colors.sub} />
                <Text style={{ color: colors.text, marginTop: 8, fontWeight: '700' }}>
                  Không có buổi học nào phù hợp bộ lọc
                </Text>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 15,
    marginBottom: 14,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  courseTitleWrap: {
    flex: 1,
    gap: 6,
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    color: '#121214',
    fontSize: 12,
    fontWeight: '900',
  },
  groupBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  groupText: {
    fontSize: 11,
    fontWeight: '700',
  },
  courseName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  deleteBtn: {
    padding: 6,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  statNum: {
    fontSize: 13,
    fontWeight: '900',
  },
  statLbl: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  absentRateChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  absentRateText: {
    fontSize: 11,
    fontWeight: '900',
  },
  dangerAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  dangerAlertText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewDetailsBtnText: {
    color: '#121214',
    fontSize: 12.5,
    fontWeight: '800',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '900',
  },
  modalSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  sessionListContent: {
    padding: 14,
    paddingBottom: 32,
    gap: 10,
  },
  sessionRow: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionNumBadge: {
    backgroundColor: 'rgba(255, 208, 0, 0.2)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionNumText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F59E0B',
  },
  sessionDateText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  sessionStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  sessionMetaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  sessionNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 2,
  },
  sessionNoteText: {
    fontSize: 11,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
});

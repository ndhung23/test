// src/features/fap/FapAttendanceView.js
// Giao diện Điểm danh FAP - Hỗ trợ xem Full cả môn (20-30 buổi), Hôm nay & Cả tuần

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ATTENDANCE_STATUS,
  getCurrentVietnamDayInfo,
  getWeekDateRange,
  filterSlotsForWeek,
  filterSlotsForToday,
  getNextUpcomingSlot,
  SAMPLE_TODAY_SLOTS,
  extractTodaySlotsFromCourses,
  extractWeeklySlotsFromCourses,
} from './fapAttendanceHelper';
import { triggerAbsentNotification } from './fapNotificationHelper';
import FapCourseAttendanceCard from './FapCourseAttendanceCard';
import FapAttendanceSlotCard from './FapAttendanceSlotCard';
import FapWeekNavigatorBar from './FapWeekNavigatorBar';
import FapUpcomingClassCard from './FapUpcomingClassCard';

export default function FapAttendanceView({
  colors,
  courses = [],
  weeklySlots = [],
  todaySlots: propTodaySlots = [],
  absentAlertEnabled = true,
  onToggleAbsentAlert,
  onSyncAttendance,
  onSyncCourseAttendance,
  onDeleteCourse,
  onSimulateAbsentAlert,
  onTestSlotReminder,
  onTriggerSilentCheck,
  isSilentChecking = false,
  silentCheckStatus = '',
  onOpenPasteModal,
  headerComponent = null,
}) {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState('today'); // 'courses' | 'today' | 'week'
  const [weekOffset, setWeekOffset] = useState(0); // 0 = tuần này, 1 = tuần sau, -1 = tuần trước...
  const [selectedDayFilter, setSelectedDayFilter] = useState('all'); // 'all' | 2..8

  const dayInfo = getCurrentVietnamDayInfo();
  const weekInfo = getWeekDateRange(weekOffset);

  // Tính toán ca học Hôm nay & Tuần được chọn từ Full kỳ hoặc dữ liệu đã cào
  const coursesTodaySlots = extractTodaySlotsFromCourses(courses);
  const coursesWeeklySlots = extractWeeklySlotsFromCourses(courses, weekOffset);

  const fallbackWeeklySlots =
    Array.isArray(weeklySlots) && weeklySlots.length > 0
      ? weeklySlots
      : Array.isArray(propTodaySlots)
        ? propTodaySlots
        : [];

  // Lọc slots từ fallbackWeeklySlots cho tuần được chọn
  const fallbackWeekFiltered = filterSlotsForWeek(fallbackWeeklySlots, weekOffset);

  const allWeeklySlots =
    coursesWeeklySlots.length > 0 ? coursesWeeklySlots : fallbackWeekFiltered;

  // Lọc theo thứ trong tuần nếu người dùng chọn chip thứ cụ thể
  const displayWeeklySlots =
    selectedDayFilter === 'all'
      ? allWeeklySlots
      : allWeeklySlots.filter((s) => s.dayIndex === selectedDayFilter);

  const todayClasses =
    coursesTodaySlots.length > 0
      ? coursesTodaySlots
      : typeof filterSlotsForToday === 'function'
        ? filterSlotsForToday(fallbackWeeklySlots)
        : fallbackWeeklySlots;

  const nextClass = getNextUpcomingSlot(fallbackWeeklySlots);

  // Thống kê nhanh điểm danh hôm nay
  const presentCount = todayClasses.filter(
    (s) => s.status === ATTENDANCE_STATUS.PRESENT || s.status?.toLowerCase() === 'present'
  ).length;
  const absentCount = todayClasses.filter(
    (s) => s.status === ATTENDANCE_STATUS.ABSENT || s.status?.toLowerCase() === 'absent'
  ).length;
  const notYetCount = todayClasses.length - presentCount - absentCount;

  const renderSlotCard = ({ item }) => (
    <FapAttendanceSlotCard item={item} colors={colors} />
  );

  const renderCourseItem = ({ item }) => (
    <FapCourseAttendanceCard
      course={item}
      colors={colors}
      onDeleteCourse={onDeleteCourse}
      onRefreshCourse={onSyncCourseAttendance}
    />
  );

  const ListHeader = () => (
    <View style={styles.headerWrap}>
      {headerComponent}

      {/* CA HỌC TIẾP THEO: Chỉ hiện ở đầu nếu đang xem tuần HOẶC hôm nay có lịch học */}
      {nextClass && (viewMode !== 'today' || todayClasses.length > 0) ? (
        <FapUpcomingClassCard item={nextClass} colors={colors} />
      ) : null}

      {/* 1. THANH CHUYỂN 3 CHẾ ĐỘ XEM: [Theo Môn (Full)] vs [Hôm nay] vs [Cả tuần] */}
      <View style={[styles.modeTabContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* <Pressable
          onPress={() => setViewMode('courses')}
          style={[
            styles.modeTabBtn,
            viewMode === 'courses' && { backgroundColor: '#3B82F6' },
          ]}
        >
          <Ionicons
            name="school"
            size={13}
            color={viewMode === 'courses' ? '#FFFFFF' : colors.sub}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: viewMode === 'courses' ? '#FFFFFF' : colors.sub },
            ]}
          >
            Theo Môn ({courses.length})
          </Text>
        </Pressable> */}

        <Pressable
          onPress={() => setViewMode('today')}
          style={[
            styles.modeTabBtn,
            viewMode === 'today' && { backgroundColor: colors.primary },
          ]}
        >
          <Ionicons
            name="today"
            size={13}
            color={viewMode === 'today' ? '#121214' : colors.sub}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: viewMode === 'today' ? '#121214' : colors.sub },
            ]}
          >
            Hôm nay ({todayClasses.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setViewMode('week')}
          style={[
            styles.modeTabBtn,
            viewMode === 'week' && { backgroundColor: '#10B981' },
          ]}
        >
          <Ionicons
            name="calendar-outline"
            size={13}
            color={viewMode === 'week' ? '#FFFFFF' : colors.sub}
          />
          <Text
            style={[
              styles.modeTabText,
              { color: viewMode === 'week' ? '#FFFFFF' : colors.sub },
            ]}
          >
            Cả tuần ({allWeeklySlots.length})
          </Text>
        </Pressable>
      </View>

      {/* THANH ĐIỀU HƯỚNG TUẦN (TUẦN TRƯỚC / TUẦN NÀY / TUẦN SAU + CHIP LỌC THỨ) KHI XEM CẢ TUẦN */}
      {viewMode === 'week' && (
        <FapWeekNavigatorBar
          colors={colors}
          weekOffset={weekOffset}
          weekInfo={weekInfo}
          allWeeklySlots={allWeeklySlots}
          selectedDayFilter={selectedDayFilter}
          onPrevWeek={() => {
            setWeekOffset((prev) => prev - 1);
            setSelectedDayFilter('all');
          }}
          onNextWeek={() => {
            setWeekOffset((prev) => prev + 1);
            setSelectedDayFilter('all');
          }}
          onCurrentWeek={() => {
            setWeekOffset(0);
            setSelectedDayFilter('all');
          }}
          onSelectDayFilter={(filter) => setSelectedDayFilter(filter)}
        />
      )}

      {/* BANNER THÔNG BÁO SILENT AUTO-FETCH ĐANG CHẠY NGẦM */}
      {isSilentChecking && (
        <View style={[styles.silentStatusBar, { backgroundColor: '#1E3A8A', borderColor: '#3B82F6' }]}>
          <ActivityIndicator size="small" color="#60A5FA" />
          <Text style={styles.silentStatusText}>
            {silentCheckStatus || 'Đang tự động kiểm tra điểm danh FAP ngầm...'}
          </Text>
        </View>
      )}

      {/* 2. CẤU HÌNH CẢNH BÁO VẮNG (+10P SAU CA HỌC) GỌN GÀNG */}
      <View style={[styles.alertCompactBar, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.alertLeftCol}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="notifications" size={15} color={absentAlertEnabled ? '#10B981' : colors.sub} />
            <Text style={[styles.alertCompactTitle, { color: colors.text }]}>
              Test
            </Text>
          </View>
          <Text style={[styles.alertCompactSub, { color: colors.sub }]}>
            {absentAlertEnabled ? '10p sau ca học' : 'Đang tắt chuông'}
          </Text>
        </View>

        <View style={styles.alertRightCol}>
          {onTriggerSilentCheck && (
            <Pressable
              onPress={onTriggerSilentCheck}
              disabled={isSilentChecking}
              style={[
                styles.compactTestBtn,
                { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.08)' },
              ]}
              hitSlop={6}
            >
              <Ionicons name="sync-outline" size={13} color="#3B82F6" />
              <Text style={[styles.compactTestBtnText, { color: '#3B82F6' }]}>Quét ngầm</Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => {
              if (onTestSlotReminder) {
                onTestSlotReminder();
              } else if (onSimulateAbsentAlert) {
                onSimulateAbsentAlert();
              } else if (todayClasses.length > 0) {
                const target =
                  todayClasses.find((s) => s.status === ATTENDANCE_STATUS.ABSENT) || todayClasses[0];
                triggerAbsentNotification(target);
              } else {
                triggerAbsentNotification(SAMPLE_TODAY_SLOTS[1]);
              }
            }}
            style={[styles.compactTestBtn, { borderColor: '#EF4444' }]}
            hitSlop={6}
          >
            <Ionicons name="volume-high-outline" size={13} color="#EF4444" />
            <Text style={[styles.compactTestBtnText, { color: '#EF4444' }]}>Thử chuông</Text>
          </Pressable>

          <Switch
            value={absentAlertEnabled}
            onValueChange={onToggleAbsentAlert}
            trackColor={{ false: '#3E3E42', true: '#10B981' }}
            thumbColor={absentAlertEnabled ? '#FFFFFF' : '#9E9EA7'}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {/* 3. TIÊU ĐỀ SECTION */}
      <View style={styles.sectionTitleRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons
            name={viewMode === 'courses' ? 'school' : viewMode === 'today' ? 'today' : 'calendar'}
            size={16}
            color={viewMode === 'courses' ? '#3B82F6' : colors.primary}
          />
          <Text style={[styles.sectionTitleText, { color: colors.text }]}>
            {viewMode === 'courses'
              ? `Danh sách môn học cả kỳ (${courses.length} môn)`
              : viewMode === 'today'
                ? `Điểm danh hôm nay (${dayInfo.fullDateStr})`
                : `${weekInfo.weekLabel} • ${selectedDayFilter === 'all' ? `Cả tuần (${allWeeklySlots.length} ca)` : `Thứ ${selectedDayFilter} (${displayWeeklySlots.length} ca)`}`}
          </Text>
        </View>

        {viewMode === 'courses' ? (
          <Pressable
            onPress={onSyncCourseAttendance}
            style={[styles.addCourseBtn, { borderColor: '#3B82F6' }]}
          >
            <Ionicons name="add" size={14} color="#3B82F6" />
            <Text style={{ color: '#3B82F6', fontSize: 11.5, fontWeight: '800' }}>Cào thêm môn</Text>
          </Pressable>
        ) : null}
      </View>

      {/* NẾU XEM HÔM NAY VÀ HÔM NAY CÓ CA HỌC -> THANH TÓM TẮT TRẠNG THÁI */}
      {viewMode === 'today' && todayClasses.length > 0 ? (
        <View style={styles.todayStatsRow}>
          <View style={[styles.statChip, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
            <Text style={[styles.statChipNumber, { color: '#10B981' }]}>{presentCount}</Text>
            <Text style={[styles.statChipLabel, { color: '#10B981' }]}>Có mặt</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
            <Text style={[styles.statChipNumber, { color: '#EF4444' }]}>{absentCount}</Text>
            <Text style={[styles.statChipLabel, { color: '#EF4444' }]}>Vắng mặt</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
            <Text style={[styles.statChipNumber, { color: '#F59E0B' }]}>{notYetCount}</Text>
            <Text style={[styles.statChipLabel, { color: '#F59E0B' }]}>Chưa điểm danh</Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  const getActiveData = () => {
    if (viewMode === 'courses') return courses;
    if (viewMode === 'today') return todayClasses;
    return displayWeeklySlots;
  };

  return (
    <FlatList
      data={getActiveData()}
      keyExtractor={(item) => item.id || `slot_${item.slot}_${item.dayIndex}_${item.subjectCode}`}
      renderItem={viewMode === 'courses' ? renderCourseItem : renderSlotCard}
      ListHeaderComponent={ListHeader}
      ListEmptyComponent={
        viewMode === 'courses' ? (
          /* TRƯỜNG HỢP: Chưa cào môn nào */
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="school-outline" size={42} color="#3B82F6" />
            <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
              Chưa có dữ liệu Thời khóa biểu Full cả môn
            </Text>
            <Text style={[styles.emptyCardDesc, { color: colors.sub }]}>
              Vào cổng FAP {'->'} Trang Báo cáo điểm danh (/Report/Attendance) {'->'} Chọn bất kỳ môn nào trong mục "Lớp học" để hệ thống tự động bóc tách trọn bộ 20-30 buổi học cả kỳ!
            </Text>
            <Pressable
              onPress={onSyncCourseAttendance}
              style={[styles.syncTimetableBtn, { backgroundColor: '#3B82F6' }]}
            >
              <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
              <Text style={styles.syncTimetableBtnText}>Mở FAP cào Lịch Cả Môn</Text>
            </Pressable>
          </View>
        ) : viewMode === 'today' && (allWeeklySlots.length > 0 || fallbackWeeklySlots.length > 0) ? (
          /* TRƯỜNG HỢP: Hôm nay không có ca học nào */
          <View style={[styles.dayOffCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.dayOffIconWrap}>
              <Ionicons name="cafe-outline" size={34} color="#10B981" />
            </View>
            <Text style={[styles.dayOffTitle, { color: colors.text }]}>
              Hôm nay bạn không có ca học nào! 🎉
            </Text>
            <Text style={[styles.dayOffDesc, { color: colors.sub }]}>
              {dayInfo.fullDateStr} • Tận hưởng ngày nghỉ hoặc tự ôn bài nhé!
            </Text>

            {nextClass ? (
              <View style={[styles.upcomingClassCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.upcomingClassTitle, { color: colors.text }]}>
                    Ca học tiếp theo: {nextClass.dayName}
                  </Text>
                  <Text style={[styles.upcomingClassDetails, { color: colors.sub }]}>
                    Slot {nextClass.slot} ({nextClass.time}) • Môn {nextClass.subjectCode} tại phòng {nextClass.room || 'AL-L302'}
                  </Text>
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={() => setViewMode('week')}
              style={[styles.switchWeekBtn, { backgroundColor: '#10B981', borderColor: '#10B981' }]}
            >
              <Ionicons name="calendar" size={15} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Xem thời khóa biểu cả tuần ({allWeeklySlots.length} ca)
              </Text>
            </Pressable>
          </View>
        ) : viewMode === 'week' ? (
          /* TRƯỜNG HỢP: Tuần được chọn chưa có ca học hoặc ngày đã chọn không có ca */
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-clear-outline" size={40} color={colors.sub} />
            <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
              {selectedDayFilter !== 'all'
                ? `Không có ca học vào Thứ ${selectedDayFilter}`
                : `Chưa có lịch học cho ${weekInfo.weekLabel}`}
            </Text>
            <Text style={[styles.emptyCardDesc, { color: colors.sub }]}>
              {weekOffset === 0
                ? 'Nhấn "Cập nhật Thời khóa biểu tuần" để tự động lấy danh sách ca học từ fap.fpt.edu.vn.'
                : `Tuần từ ${weekInfo.startStr} đến ${weekInfo.endStr} chưa có dữ liệu. Bạn có thể mở FAP để tự động cào tuần này hoặc dán TKB.`}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, width: '100%' }}>
              <Pressable
                onPress={() => onSyncAttendance?.(weekInfo.refDate)}
                style={[styles.syncTimetableBtn, { backgroundColor: '#10B981', flex: 1 }]}
              >
                <Ionicons name="globe-outline" size={15} color="#FFFFFF" />
                <Text style={styles.syncTimetableBtnText}>Lấy tuần này từ FAP</Text>
              </Pressable>
              {onOpenPasteModal ? (
                <Pressable
                  onPress={onOpenPasteModal}
                  style={[styles.syncTimetableBtn, { backgroundColor: colors.primary, flex: 0.8 }]}
                >
                  <Ionicons name="clipboard-outline" size={15} color="#121214" />
                  <Text style={[styles.syncTimetableBtnText, { color: '#121214' }]}>Dán TKB</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          /* TRƯỜNG HỢP: Chưa có ca học tuần này */
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="calendar-clear-outline" size={40} color={colors.sub} />
            <Text style={[styles.emptyCardTitle, { color: colors.text }]}>
              Chưa có dữ liệu Thời khóa biểu & Điểm danh
            </Text>
            <Text style={[styles.emptyCardDesc, { color: colors.sub }]}>
              Nhấn "Cào môn từ FAP" hoặc "Cập nhật TKB Tuần" để tự động lấy danh sách ca học từ fap.fpt.edu.vn.
            </Text>
            <Pressable
              onPress={() => onSyncAttendance?.(weekInfo.refDate)}
              style={[styles.syncTimetableBtn, { backgroundColor: '#10B981' }]}
            >
              <Ionicons name="globe-outline" size={16} color="#FFFFFF" />
              <Text style={styles.syncTimetableBtnText}>Cập nhật Thời khóa biểu tuần</Text>
            </Pressable>
          </View>
        )
      }
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      ListFooterComponent={<View style={{ height: Math.max(insets.bottom + 24, 48) }} />}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
  },
  headerWrap: {
    marginBottom: 10,
    gap: 12,
  },
  modeTabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  modeTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 9,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  alertCompactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  alertLeftCol: {
    flex: 1,
  },
  alertCompactTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  alertCompactSub: {
    fontSize: 11,
    marginTop: 1,
  },
  alertRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactTestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  compactTestBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  sectionTitleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  addCourseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  todayStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 2,
  },
  statChipNumber: {
    fontSize: 15,
    fontWeight: '900',
  },
  statChipLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCardDesc: {
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  syncTimetableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  syncTimetableBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
  silentStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  silentStatusText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
});

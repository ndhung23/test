// src/features/fap/FapWeekNavigatorBar.js
// Thanh điều hướng tuần (Tuần trước / Tuần này / Tuần sau) kèm các chip lọc Thứ trong tuần

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function FapWeekNavigatorBar({
  colors,
  weekOffset,
  weekInfo,
  allWeeklySlots = [],
  selectedDayFilter = 'all',
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
  onSelectDayFilter,
}) {
  const isCurrentWeek = weekOffset === 0;

  return (
    <View style={[styles.weekNavContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Hàng 1: Nút Tuần trước, Badge Tuần hiển thị, Nút Tuần sau (Không bao giờ bị tràn/đè chữ) */}
      <View style={styles.weekNavControlsRow}>
        <Pressable
          onPress={onPrevWeek}
          style={[styles.weekNavBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={15} color={colors.text} />
          <Text style={[styles.weekNavBtnText, { color: colors.text }]}>Trước</Text>
        </Pressable>

        <View
          style={[
            styles.weekLabelBadge,
            {
              backgroundColor: isCurrentWeek ? 'rgba(16, 185, 129, 0.12)' : 'rgba(59, 130, 246, 0.12)',
              borderColor: isCurrentWeek ? '#10B981' : '#3B82F6',
            },
          ]}
        >
          <Ionicons
            name="calendar"
            size={13}
            color={isCurrentWeek ? '#10B981' : '#3B82F6'}
          />
          <Text
            style={[
              styles.weekLabelText,
              { color: isCurrentWeek ? '#10B981' : '#3B82F6' },
            ]}
            numberOfLines={1}
          >
            {isCurrentWeek ? 'Tuần này' : 'Tuần'}: {weekInfo.startStr} - {weekInfo.endStr}
          </Text>
        </View>

        <Pressable
          onPress={onNextWeek}
          style={[styles.weekNavBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
          hitSlop={8}
        >
          <Text style={[styles.weekNavBtnText, { color: colors.text }]}>Sau</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.text} />
        </Pressable>
      </View>

      {/* Hàng phụ: Nút Quay về tuần này nếu đang xem tuần khác (Tách riêng hàng để chống đè chữ) */}
      {!isCurrentWeek && (
        <Pressable
          onPress={onCurrentWeek}
          style={[styles.returnTodayBtn, { backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}
        >
          <Ionicons name="refresh" size={12} color="#3B82F6" />
          <Text style={styles.returnTodayText}>Trở về Tuần hiện tại</Text>
        </Pressable>
      )}

      {/* Hàng 2: Chip lọc Thứ trong tuần (Tất cả, T2, T3, T4, T5, T6, T7, CN) */}
      <View style={styles.dayFilterRow}>
        <Pressable
          onPress={() => onSelectDayFilter('all')}
          style={[
            styles.dayFilterChip,
            selectedDayFilter === 'all'
              ? { backgroundColor: '#10B981', borderColor: '#10B981' }
              : { backgroundColor: colors.bg, borderColor: colors.border },
          ]}
        >
          <Text
            style={[
              styles.dayFilterChipText,
              { color: selectedDayFilter === 'all' ? '#FFFFFF' : colors.sub },
            ]}
          >
            Cả tuần ({allWeeklySlots.length})
          </Text>
        </Pressable>

        {weekInfo.days.map((day) => {
          const count = allWeeklySlots.filter((s) => s.dayIndex === day.dayIndex).length;
          const isSelected = selectedDayFilter === day.dayIndex;
          return (
            <Pressable
              key={day.dayIndex}
              onPress={() => onSelectDayFilter(day.dayIndex)}
              style={[
                styles.dayFilterChip,
                isSelected
                  ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                  : day.isToday
                    ? { backgroundColor: 'rgba(59, 130, 246, 0.12)', borderColor: '#3B82F6' }
                    : { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
            >
              <Text
                style={[
                  styles.dayFilterChipText,
                  {
                    color: isSelected
                      ? '#FFFFFF'
                      : day.isToday
                        ? '#3B82F6'
                        : colors.text,
                    fontWeight: isSelected || day.isToday ? '800' : '600',
                  },
                ]}
              >
                {day.dayName.replace('Thứ ', 'T')}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  weekNavContainer: {
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  weekNavControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 7,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  weekNavBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  weekLabelBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  weekLabelText: {
    fontSize: 12,
    fontWeight: '800',
  },
  returnTodayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  returnTodayText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
  },
  dayFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 2,
  },
  dayFilterChip: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  dayFilterChipText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
});

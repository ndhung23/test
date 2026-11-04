import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../microHabitStyles';
import { HABIT_TYPES, HABIT_ATTRIBUTE_COLORS } from '../microHabitService';

function getUrgencyColor(urgency) {
  if (urgency === 'overdue') return '#EF4444'; // Đỏ
  if (urgency === 'warning') return '#F59E0B'; // Vàng
  return '#10B981'; // Xanh
}

export default function HabitCard({
  item,
  highlightHabitId,
  colors,
  onOpenEditModal,
  onDeleteHabit,
  onQuickToggleReminder,
  onOpenHistory,
  onCompleteHabit,
  onStepDaily,
  t,
}) {
  const { status } = item;
  const urgencyColor = getUrgencyColor(status.urgency);

  return (
    <View
      style={[
        styles.habitCard,
        {
          backgroundColor: colors.card,
          borderColor: item.id === highlightHabitId ? colors.primary : colors.cardBorder,
          borderWidth: item.id === highlightHabitId ? 2 : 1,
        },
      ]}
    >
      {/* Header thẻ: Icon, Tên, Nút Sửa, Nút Xóa */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIconBox, { backgroundColor: (item.color || colors.primary) + '20' }]}>
          <Ionicons name={item.icon || 'repeat'} size={22} color={item.color || colors.primary} />
        </View>
        <View style={styles.cardTitleBox}>
          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.note ? (
            <Text style={[styles.cardNote, { color: colors.sub }]} numberOfLines={1}>
              {item.note}
            </Text>
          ) : null}
        </View>

        {/* Nút Sửa */}
        <Pressable
          onPress={() => onOpenEditModal(item)}
          hitSlop={8}
          style={styles.cardHeaderBtn}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.sub} />
        </Pressable>

        {/* Nút Xóa */}
        <Pressable
          onPress={() => onDeleteHabit(item.id, item.title)}
          hitSlop={8}
          style={styles.cardHeaderBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.sub} />
        </Pressable>
      </View>

      {/* HÀNG 1: Trạng thái đến hạn */}
      <View style={styles.cardRow1}>
        <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor + '20', borderColor: urgencyColor }]}>
          <View style={[styles.urgencyDot, { backgroundColor: urgencyColor }]} />
          <Text style={[styles.urgencyText, { color: urgencyColor }]}>
            {status.statusText}
          </Text>
        </View>
      </View>

      {/* HÀNG 2: Thông tin phụ */}
      <View style={styles.cardRow2}>
        {/* Badge Chu kỳ lặp */}
        <View style={[styles.infoChip, { backgroundColor: HABIT_ATTRIBUTE_COLORS.cycle.background, borderColor: HABIT_ATTRIBUTE_COLORS.cycle.border }]}>
          <Ionicons
            name={item.type === HABIT_TYPES.MONTHLY ? 'calendar-outline' : item.type === HABIT_TYPES.DAILY ? 'trophy-outline' : 'repeat-outline'}
            size={13}
            color={HABIT_ATTRIBUTE_COLORS.cycle.text}
          />
          <Text style={[styles.infoChipText, { color: HABIT_ATTRIBUTE_COLORS.cycle.text }]}>
            {status.cycleInfo}
          </Text>
        </View>

        {/* Huy hiệu nhắc nhở theo giờ */}
        <Pressable
          onPress={() => onQuickToggleReminder(item)}
          hitSlop={6}
          style={[
            styles.infoChip,
            {
              backgroundColor: item.reminderEnabled ? HABIT_ATTRIBUTE_COLORS.reminder.background : colors.cardElevated,
              borderColor: item.reminderEnabled ? HABIT_ATTRIBUTE_COLORS.reminder.border : colors.cardBorder,
            },
          ]}
        >
          <Ionicons
            name={item.reminderEnabled ? 'notifications' : 'notifications-off-outline'}
            size={13}
            color={item.reminderEnabled ? HABIT_ATTRIBUTE_COLORS.reminder.text : colors.sub}
          />
          <Text
            style={[
              styles.infoChipText,
              { color: item.reminderEnabled ? HABIT_ATTRIBUTE_COLORS.reminder.text : colors.sub, fontWeight: item.reminderEnabled ? '700' : '500' },
            ]}
          >
            {item.reminderEnabled ? item.reminderTime || '08:00' : 'Tắt'}
          </Text>
        </Pressable>

        {/* Huy hiệu số lần đã hoàn thành */}
        {item.history && item.history.length > 0 && (
          <Pressable
            onPress={() => onOpenHistory(item)}
            hitSlop={6}
            style={[styles.infoChip, { backgroundColor: HABIT_ATTRIBUTE_COLORS.count.background, borderColor: HABIT_ATTRIBUTE_COLORS.count.border }]}
          >
            <Ionicons name="time-outline" size={13} color={HABIT_ATTRIBUTE_COLORS.count.text} />
            <Text style={[styles.infoChipText, { color: HABIT_ATTRIBUTE_COLORS.count.text }]}>
              {t ? `${t('microHabit.history')}: ${item.history.length}` : `Đã làm ${item.history.length} lần`}
            </Text>
          </Pressable>
        )}

        {/* Badge Danh mục */}
        {item.category ? (
          <View style={[styles.infoChip, { backgroundColor: `${item.color || '#64748B'}26`, borderColor: `${item.color || '#64748B'}80` }]}>
            <Ionicons name="pricetag-outline" size={12} color={item.color || '#94A3B8'} />
            <Text style={[styles.infoChipText, { color: item.color || '#94A3B8' }]}>{item.category}</Text>
          </View>
        ) : null}
      </View>

      {/* Thanh tiến trình chu kỳ */}
      <View style={[styles.progressBarBg, { backgroundColor: colors.cardElevated }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              backgroundColor: urgencyColor,
              width: `${Math.round(status.progress * 100)}%`,
            },
          ]}
        />
      </View>

      {/* Nút bấm hành động Reset vòng lặp */}
      <View style={styles.actionRow}>
        {item.type === HABIT_TYPES.INTERVAL && (
          <Pressable
            onPress={() => onCompleteHabit(item.id)}
            style={[styles.resetBtn, { backgroundColor: urgencyColor }]}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.resetBtnText}>
              Vừa làm xong · Reset {item.intervalDays} ngày
            </Text>
          </Pressable>
        )}

        {item.type === HABIT_TYPES.MONTHLY && (
          <Pressable
            onPress={() => onCompleteHabit(item.id)}
            style={[styles.resetBtn, { backgroundColor: urgencyColor }]}
          >
            <Ionicons name="calendar" size={18} color="#FFFFFF" />
            <Text style={styles.resetBtnText}>
              Đã hoàn thành · Chuyển tháng tới
            </Text>
          </Pressable>
        )}

        {item.type === HABIT_TYPES.DAILY && (
          <View style={styles.dailyCounterRow}>
            <Pressable
              onPress={() => onStepDaily(item.id, -1)}
              style={[styles.stepBtnMinus, { backgroundColor: colors.cardElevated, borderColor: colors.border }]}
            >
              <Ionicons name="remove" size={18} color={colors.sub} />
            </Pressable>

            <Pressable
              onPress={() => onStepDaily(item.id, 1)}
              style={[styles.stepBtnPlus, { backgroundColor: urgencyColor }]}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.stepBtnPlusText}>
                {status.isCompleted ? 'Đã đạt mục tiêu' : `Tăng 1 ${item.unit || 'lần'} (${status.currentCount}/${status.targetCount})`}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

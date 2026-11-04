import React from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../microHabitStyles';

export default function HabitDebugNotifModal({
  visible,
  onClose,
  scheduledNotifs = [],
  onSimulateNotificationTap,
  onSelfHeal,
  colors,
  t,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="notifications-circle" size={22} color="#10B981" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t ? t('microHabit.scheduledOsReminders') : 'Lịch báo OS'} ({scheduledNotifs.length})
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.sub} />
            </Pressable>
          </View>

          <FlatList
            data={scheduledNotifs}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onSimulateNotificationTap && onSimulateNotificationTap(item.taskId)}
                style={[styles.debugNotifCard, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name="alarm" size={16} color="#10B981" />
                  <Text style={[styles.debugNotifTitle, { color: colors.text }]}>{item.title}</Text>
                </View>
                <Text style={[styles.debugNotifBody, { color: colors.sub }]}>{item.body}</Text>
                <View style={styles.debugNotifMetaRow}>
                  <Text style={[styles.debugNotifTrigger, { color: '#10B981' }]}>⏰ {item.triggerSummary}</Text>
                  <Text style={[styles.debugNotifId, { color: colors.sub }]}>ID: {item.id.slice(0, 8)}...</Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                <Ionicons name="notifications-off-outline" size={44} color={colors.sub} />
                <Text style={[styles.emptyText, { color: colors.sub }]}>
                  {t ? t('microHabit.noHabits') : 'Hiện chưa có thông báo nào được đặt lịch.'}
                </Text>
              </View>
            }
          />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {onSelfHeal ? (
              <Pressable
                onPress={onSelfHeal}
                style={[styles.saveBtn, { flex: 1, backgroundColor: '#3B82F6', marginTop: 0 }]}
              >
                <Text style={styles.saveBtnText}>Tự đối chiếu & Sửa</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onClose}
              style={[styles.saveBtn, { flex: 1, backgroundColor: '#10B981', marginTop: 0 }]}
            >
              <Text style={styles.saveBtnText}>{t ? t('common.close') : 'Đóng'}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

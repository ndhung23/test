import React from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../microHabitStyles';

export default function HabitHistoryModal({
  visible,
  onClose,
  habit,
  colors,
  t,
}) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t ? t('microHabit.history') : 'Lịch sử'}: {habit?.title}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.sub} />
            </Pressable>
          </View>

          <FlatList
            data={habit?.history || []}
            keyExtractor={(h, idx) => h.id || String(idx)}
            style={{ maxHeight: 320, marginVertical: 12 }}
            renderItem={({ item: h }) => (
              <View style={[styles.historyRow, { borderBottomColor: colors.cardBorder }]}>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text style={[styles.historyDateText, { color: colors.text }]}>
                  {new Date(h.timestamp).toLocaleDateString()} {new Date(h.timestamp).toLocaleTimeString()}
                </Text>
                <Text style={[styles.historyNoteText, { color: colors.sub }]}>{h.note}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.sub, textAlign: 'center', marginVertical: 20 }]}>
                {t ? t('microHabit.noHistory') : 'Chưa có lịch sử.'}
              </Text>
            }
          />

          <Pressable
            onPress={onClose}
            style={[styles.saveBtn, { backgroundColor: colors.cardElevated }]}
          >
            <Text style={[styles.saveBtnText, { color: colors.text }]}>
              {t ? t('common.close') : 'Đóng'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

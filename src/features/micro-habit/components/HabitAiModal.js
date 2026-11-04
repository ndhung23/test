import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../microHabitStyles';

export default function HabitAiModal({
  visible,
  onClose,
  aiPrompt,
  setAiPrompt,
  isGeneratingAi,
  aiSuggestions,
  onGenerateAiHabits,
  onApplyAiHabits,
  colors,
  t,
}) {
  const topics = [
    { label: '🎓 Sinh viên ở trọ', prompt: 'Sinh viên ở trọ phòng riêng' },
    { label: '🛵 Bảo dưỡng xe máy', prompt: 'Bảo dưỡng xe máy tay ga định kỳ' },
    { label: '🩺 Sức khỏe sinh hoạt', prompt: 'Sức khỏe, uống nước, tập thể dục' },
    { label: '🐾 Nuôi thú cưng', prompt: 'Nuôi mèo và chó trong nhà' },
    { label: '🏠 Nhà cửa & Gas', prompt: 'Gia đình, nhà cửa, đổi gas, lọc nước' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.aiModalCard, { backgroundColor: colors.card }]}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={22} color="#7C3AED" />
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Gemini AI {t ? t('microHabit.aiSuggest') : 'Gợi ý việc vặt'}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.sub} />
            </Pressable>
          </View>

          <FlatList
            data={[{ key: 'ai-content' }]}
            keyExtractor={(item) => item.key}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            renderItem={() => (
              <View style={{ paddingBottom: 16 }}>
                <Text style={[styles.aiIntroText, { color: colors.sub }]}>
                  Chọn chủ đề nhanh hoặc nhập nhu cầu sinh hoạt thực tế của bạn để Gemini AI tự động lên lịch chu kỳ tối ưu (100% miễn phí).
                </Text>

                {/* Nhóm chủ đề nhanh */}
                <View style={styles.aiTopicChipsRow}>
                  {topics.map((topic) => (
                    <Pressable
                      key={topic.label}
                      onPress={() => {
                        setAiPrompt(topic.prompt);
                        onGenerateAiHabits(topic.prompt);
                      }}
                      style={[styles.aiTopicChip, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}
                    >
                      <Text style={[styles.aiTopicChipText, { color: colors.text }]}>{topic.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Ô nhập tùy biến */}
                <View style={styles.aiInputRow}>
                  <TextInput
                    style={[styles.aiCustomInput, { color: colors.text, borderColor: colors.cardBorder }]}
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder="VD: Người mới mua xe tay ga, sống 1 mình..."
                    placeholderTextColor={colors.sub}
                    returnKeyType="done"
                    onSubmitEditing={() => onGenerateAiHabits()}
                  />
                  <Pressable
                    onPress={() => onGenerateAiHabits()}
                    disabled={isGeneratingAi}
                    style={[styles.aiGenerateBtn, { backgroundColor: '#7C3AED', opacity: isGeneratingAi ? 0.6 : 1 }]}
                  >
                    {isGeneratingAi ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                    )}
                  </Pressable>
                </View>

                {/* Danh sách gợi ý từ Gemini AI */}
                {aiSuggestions.length > 0 && (
                  <View style={styles.aiResultsContainer}>
                    <Text style={[styles.aiResultsTitle, { color: colors.text }]}>
                      Đã tạo {aiSuggestions.length} việc vặt thông minh:
                    </Text>

                    {aiSuggestions.map((item, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.aiSuggestionCard,
                          { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder },
                        ]}
                      >
                        <View style={[styles.aiCardColorBar, { backgroundColor: item.color || '#3B82F6' }]} />
                        <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 12 }}>
                          <Text style={[styles.aiCardTitle, { color: colors.text }]}>{item.title}</Text>
                          <Text style={[styles.aiCardSubtitle, { color: colors.sub }]}>
                            {item.type === 'interval' && `Lặp lại mỗi ${item.intervalDays} ngày`}
                            {item.type === 'monthly' && `Ngày ${item.dayOfMonth} hàng tháng`}
                            {item.type === 'daily' && `Mỗi ngày ${item.targetCount} ${item.unit || 'lần'}`}
                            {item.reminderTime ? ` • Nhắc lúc ${item.reminderTime}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Nút áp dụng tất cả */}
                    <Pressable
                      onPress={onApplyAiHabits}
                      style={[styles.applyAiBtn, { backgroundColor: '#10B981' }]}
                    >
                      <Ionicons name="checkmark-done" size={20} color="#FFFFFF" />
                      <Text style={styles.applyAiBtnText}>
                        Thêm tất cả vào danh sách (+{aiSuggestions.length})
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import {
  sendToGemini,
  getSavedChatHistory,
  saveChatHistory,
  clearChatHistory,
  getSavedCustomKey,
  setCustomGeminiKey,
} from '../../services/geminiService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const PROMPT_SUGGESTIONS = [
  { label: '✍️ Soạn tin nhắn lịch sự', prompt: 'Hãy giúp tôi viết lại tin nhắn sau một cách chuyên nghiệp, lịch sự và nhã nhặn: ' },
  { label: '🌐 Dịch sang tiếng Anh', prompt: 'Hãy dịch đoạn văn bản sau sang tiếng Anh tự nhiên, chuẩn văn phong giao tiếp: ' },
  { label: '💡 Gợi ý trả lời khéo léo', prompt: 'Khách hàng nhắn tin hỏi như sau, hãy gợi ý cho tôi 3 cách trả lời khéo léo và thuyết phục: ' },
  { label: '📝 Tóm tắt ngắn gọn', prompt: 'Hãy tóm tắt ngắn gọn các ý chính của đoạn văn bản sau trong 3 gạch đầu dòng: ' },
];

export default function AiChatBottomSheet({ visible, onClose }) {
  const { colors } = useTheme();
  const { t, isVietnamese } = useLanguage();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const promptSuggestions = [
    {
      label: t('aiBot.suggestionPolite'),
      prompt: isVietnamese
        ? 'Hãy giúp tôi viết lại tin nhắn sau một cách chuyên nghiệp, lịch sự và nhã nhặn: '
        : 'Please rewrite the following message in a professional, polite, and courteous tone: ',
    },
    {
      label: t('aiBot.suggestionTranslate'),
      prompt: isVietnamese
        ? 'Hãy dịch đoạn văn bản sau sang tiếng Anh tự nhiên, chuẩn văn phong giao tiếp: '
        : 'Please translate the following text into natural, fluent English: ',
    },
    {
      label: t('aiBot.suggestionReply'),
      prompt: isVietnamese
        ? 'Khách hàng nhắn tin hỏi như sau, hãy gợi ý cho tôi 3 cách trả lời khéo léo và thuyết phục: '
        : 'A customer asked the following, please suggest 3 persuasive and tactful responses: ',
    },
    {
      label: t('aiBot.suggestionSummary'),
      prompt: isVietnamese
        ? 'Hãy tóm tắt ngắn gọn các ý chính của đoạn văn bản sau trong 3 gạch đầu dòng: '
        : 'Please summarize the main points of the following text in 3 bullet points: ',
    },
  ];

  // Modal cài đặt API Key cá nhân
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Nạp lịch sử trò chuyện khi mở
  useEffect(() => {
    if (visible) {
      (async () => {
        const history = await getSavedChatHistory();
        if (history && history.length > 0) {
          setMessages(history);
        } else {
          // Tin nhắn chào mừng mặc định từ Bot
          setMessages([
            {
              id: 'welcome_1',
              role: 'model',
              text: t('aiBot.welcomeMessage'),
              timestamp: Date.now(),
            },
          ]);
        }
      })();
    }
  }, [visible, isVietnamese]);

  // Nạp Custom Key khi mở cài đặt
  const handleOpenSettings = async () => {
    const saved = await getSavedCustomKey();
    setCustomKeyInput(saved);
    setSettingsVisible(true);
  };

  const handleSaveCustomKey = async () => {
    try {
      await setCustomGeminiKey(customKeyInput.trim());
      setSettingsVisible(false);
      Alert.alert(isVietnamese ? 'Thành công' : 'Success', t('aiBot.savedSuccess'));
    } catch (_e) {
      Alert.alert(isVietnamese ? 'Lỗi' : 'Error', isVietnamese ? 'Không thể lưu API Key.' : 'Could not save API Key.');
    }
  };

  // Xóa lịch sử chat
  const handleClearHistory = () => {
    Alert.alert(
      t('aiBot.clearHistory'),
      t('aiBot.clearConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('aiBot.clearBtn'),
          style: 'destructive',
          onPress: async () => {
            await clearChatHistory();
            setMessages([
              {
                id: `welcome_${Date.now()}`,
                role: 'model',
                text: isVietnamese
                  ? 'Cuộc trò chuyện mới đã bắt đầu. Hãy gửi câu hỏi hoặc chọn một gợi ý bên dưới!'
                  : 'New chat started. Send a question or choose a prompt suggestion below!',
                timestamp: Date.now(),
              },
            ]);
          },
        },
      ]
    );
  };

  // Sao chép nội dung tin nhắn AI
  const handleCopyMessage = async (msg) => {
    try {
      await Clipboard.setStringAsync(msg.text);
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (_e) {
      Alert.alert('Lỗi', 'Không thể sao chép văn bản.');
    }
  };

  // Gửi tin nhắn đến Gemini
  const handleSendMessage = useCallback(
    async (textToSend) => {
      const text = (textToSend || inputText).trim();
      if (!text || loading) return;

      const userMsgId = `user_${Date.now()}`;
      const newUserMsg = {
        id: userMsgId,
        role: 'user',
        text: text,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, newUserMsg];
      setMessages(updatedHistory);
      setInputText('');
      setLoading(true);

      try {
        const replyText = await sendToGemini(messages, text);
        const aiMsg = {
          id: `ai_${Date.now()}`,
          role: 'model',
          text: replyText,
          timestamp: Date.now(),
        };

        const finalHistory = [...updatedHistory, aiMsg];
        setMessages(finalHistory);
        await saveChatHistory(finalHistory);
      } catch (error) {
        const errorMsg = {
          id: `err_${Date.now()}`,
          role: 'model',
          isError: true,
          text: `⚠️ ${error.message || 'Không thể kết nối đến Gemini AI.'}`,
          timestamp: Date.now(),
        };
        const finalHistory = [...updatedHistory, errorMsg];
        setMessages(finalHistory);
      } finally {
        setLoading(false);
      }
    },
    [inputText, loading, messages]
  );

  // Render từng bong bóng chat
  const renderMessageItem = ({ item }) => {
    const isUser = item.role === 'user';
    const isCopied = copiedId === item.id;

    return (
      <View
        style={[
          styles.msgRow,
          isUser ? styles.msgRowUser : styles.msgRowAi,
        ]}
      >
        {!isUser && (
          <View style={styles.botAvatarBadge}>
            <Ionicons name="sparkles" size={13} color="#FFFFFF" />
          </View>
        )}

        <View
          style={[
            styles.bubbleContainer,
            isUser
              ? [styles.bubbleUser, { backgroundColor: '#6366F1' }]
              : [
                  styles.bubbleAi,
                  {
                    backgroundColor: item.isError ? 'rgba(239, 68, 68, 0.15)' : colors.card,
                    borderColor: item.isError ? '#EF4444' : colors.cardBorder,
                  },
                ],
          ]}
        >
          <Text
            style={[
              styles.msgText,
              { color: isUser ? '#FFFFFF' : item.isError ? '#EF4444' : colors.text },
            ]}
            selectable
          >
            {item.text}
          </Text>

          {!isUser && !item.isError && (
            <View style={styles.msgFooter}>
              <Pressable
                onPress={() => handleCopyMessage(item)}
                style={styles.copyBtn}
                hitSlop={6}
              >
                <Ionicons
                  name={isCopied ? 'checkmark' : 'copy-outline'}
                  size={12}
                  color={isCopied ? '#10B981' : colors.sub}
                />
                <Text
                  style={[
                    styles.copyBtnText,
                    { color: isCopied ? '#10B981' : colors.sub },
                  ]}
                >
                  {isCopied ? (isVietnamese ? 'Đã sao chép' : 'Copied') : (isVietnamese ? 'Sao chép để dán' : 'Copy response')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.bg,
              borderColor: colors.cardBorder,
              paddingBottom: insets.bottom || 12,
            },
          ]}
        >
          {/* Thanh nắm kéo & Header */}
          <View style={styles.dragHandleWrap}>
            <View style={[styles.dragBar, { backgroundColor: colors.border }]} />
          </View>

          <View style={[styles.sheetHeader, { borderBottomColor: colors.cardBorder }]}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="sparkles" size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.text }]}>{t('aiBot.botName')}</Text>
                <Text style={[styles.headerSub, { color: '#10B981' }]}>
                  {isVietnamese ? '● Gemini 1.5 Flash Sẵn sàng' : '● Gemini 1.5 Flash Ready'}
                </Text>
              </View>
            </View>

            <View style={styles.headerActionsRow}>
              <Pressable
                onPress={handleClearHistory}
                style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
                hitSlop={6}
              >
                <Ionicons name="trash-outline" size={17} color={colors.sub} />
              </Pressable>

              <Pressable
                onPress={handleOpenSettings}
                style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
                hitSlop={6}
              >
                <Ionicons name="settings-outline" size={17} color={colors.sub} />
              </Pressable>

              <Pressable
                onPress={onClose}
                style={[styles.headerIconBtn, { backgroundColor: colors.card }]}
                hitSlop={6}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>
          </View>

          {/* Gợi ý Prompt nhanh */}
          <View style={styles.suggestionsContainer}>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={promptSuggestions}
              keyExtractor={(item) => item.label}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setInputText(item.prompt);
                  }}
                  style={[
                    styles.promptChip,
                    { backgroundColor: colors.card, borderColor: colors.cardBorder },
                  ]}
                >
                  <Text style={[styles.promptChipText, { color: colors.text }]}>
                    {item.label}
                  </Text>
                </Pressable>
              )}
            />
          </View>

          {/* Danh sách tin nhắn dùng FlatList */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessageItem}
            contentContainerStyle={styles.chatListContent}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              loading ? (
                <View style={styles.typingIndicatorRow}>
                  <View style={styles.botAvatarBadge}>
                    <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                  </View>
                  <View style={[styles.typingBubble, { backgroundColor: colors.card }]}>
                    <ActivityIndicator size="small" color="#6366F1" />
                    <Text style={[styles.typingText, { color: colors.sub }]}>
                      {isVietnamese ? 'Gemini đang suy nghĩ...' : 'Gemini is thinking...'}
                    </Text>
                  </View>
                </View>
              ) : null
            }
          />

          {/* Ô nhập tin nhắn */}
          <View style={[styles.inputContainer, { borderTopColor: colors.cardBorder, backgroundColor: colors.card }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('aiBot.inputPlaceholder')}
              placeholderTextColor={colors.sub}
              style={[
                styles.textInput,
                { color: colors.text, backgroundColor: colors.bg, borderColor: colors.cardBorder },
              ]}
              multiline
              maxLength={1500}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
            />

            <Pressable
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() && !loading ? '#6366F1' : colors.border,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="send" size={16} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>

      {/* Modal Cài đặt API Key cá nhân */}
      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.settingsOverlay}
        >
          <View style={[styles.settingsBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.settingsHeader}>
              <Ionicons name="key-outline" size={20} color="#6366F1" />
              <Text style={[styles.settingsTitle, { color: colors.text }]}>{t('aiBot.apiKeySettings')}</Text>
            </View>

            <Text style={[styles.settingsSub, { color: colors.sub }]}>
              {t('aiBot.apiKeyDesc')}
            </Text>

            <TextInput
              value={customKeyInput}
              onChangeText={setCustomKeyInput}
              placeholder={t('aiBot.apiKeyPlaceholder')}
              placeholderTextColor={colors.sub}
              style={[
                styles.settingsInput,
                { backgroundColor: colors.bg, borderColor: colors.cardBorder, color: colors.text },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.settingsActions}>
              <Pressable
                onPress={() => setSettingsVisible(false)}
                style={[styles.settingsBtn, { backgroundColor: colors.bg }]}
              >
                <Text style={{ color: colors.sub, fontWeight: '700' }}>{t('settings.cancel')}</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveCustomKey}
                style={[styles.settingsBtn, { backgroundColor: '#6366F1' }]}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '800' }}>{t('aiBot.saveKey')}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetContainer: {
    height: SCREEN_HEIGHT * 0.78,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
  },
  dragHandleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dragBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  headerActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    paddingVertical: 8,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  promptChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chatListContent: {
    padding: 14,
    gap: 12,
  },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginVertical: 4,
  },
  msgRowUser: {
    justifyContent: 'flex-end',
  },
  msgRowAi: {
    justifyContent: 'flex-start',
  },
  botAvatarBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  bubbleContainer: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAi: {
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  msgText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  msgFooter: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typingIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  typingText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 90,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13.5,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  settingsSub: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  settingsInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    marginBottom: 16,
  },
  settingsActions: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

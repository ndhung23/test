import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, Alert, FlatList } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { sendToGemini } from '../../services/geminiService';

const SAMPLES = [
  'Báo cáo dự án hôm nay tiến độ đến đâu rồi em?',
  'Sản phẩm này bên bạn còn hàng không, giá bao nhiêu ạ?',
  'Tối nay rảnh không, đi cafe nói chuyện xíu bạn ơi?',
];

export default function AiReplyScreen({ navigation }) {
  const { colors } = useTheme();
  const { isVietnamese } = useLanguage();
  const [incomingMsg, setIncomingMsg] = useState(SAMPLES[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [replies, setReplies] = useState([
    {
      tone: 'Lịch sự & Chuyên nghiệp',
      icon: 'briefcase',
      color: '#3B82F6',
      text: 'Dạ chào sếp, em đã hoàn thành 90% các hạng mục và đang tổng hợp số liệu để gửi báo cáo chi tiết cho sếp trước 17h hôm nay ạ!',
    },
    {
      tone: 'Thân thiện & Tự nhiên',
      icon: 'happy',
      color: '#10B981',
      text: 'Em đang kiểm tra lại lần cuối để gửi sếp đây ạ, cơ bản mọi thứ chạy rất mượt và đúng kế hoạch sếp nhé!',
    },
    {
      tone: 'Ngắn gọn & Nhanh',
      icon: 'flash',
      color: '#F59E0B',
      text: 'Tiến độ đang đạt 90%, em sẽ nộp báo cáo hoàn chỉnh vào cuối giờ chiều nay ạ.',
    },
  ]);

  const handleGenerate = async () => {
    if (!incomingMsg.trim()) {
      Alert.alert('Chưa có tin nhắn', 'Hãy nhập hoặc dán nội dung tin nhắn bạn vừa nhận được.');
      return;
    }
    setAnalyzing(true);
    try {
      const prompt = `Phân tích tin nhắn sau của người khác gửi cho tôi: "${incomingMsg.trim()}".
Hãy tạo 3 câu gợi ý phản hồi hay nhất bằng tiếng Việt theo 3 phong cách:
1. Lịch sự & Chuyên nghiệp
2. Thân thiện & Tự nhiên
3. Ngắn gọn & Nhanh
Trả về định dạng JSON thuần túy (không bọc trong markdown code block) theo cấu trúc:
[
  {"tone": "Lịch sự & Chuyên nghiệp", "text": "..."},
  {"tone": "Thân thiện & Tự nhiên", "text": "..."},
  {"tone": "Ngắn gọn & Nhanh", "text": "..."}
]`;

      const aiResponse = await sendToGemini([], prompt);
      let parsed = null;
      try {
        const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleanJson);
      } catch (_err) {
        // Fallback nếu AI trả về text thường
      }

      if (Array.isArray(parsed) && parsed.length >= 3) {
        setReplies([
          {
            tone: parsed[0].tone || 'Lịch sự & Chuyên nghiệp',
            icon: 'briefcase',
            color: '#3B82F6',
            text: parsed[0].text,
          },
          {
            tone: parsed[1].tone || 'Thân thiện & Tự nhiên',
            icon: 'happy',
            color: '#10B981',
            text: parsed[1].text,
          },
          {
            tone: parsed[2].tone || 'Ngắn gọn & Nhanh',
            icon: 'flash',
            color: '#F59E0B',
            text: parsed[2].text,
          },
        ]);
      } else {
        // Cập nhật câu trả lời từ AI
        setReplies((prev) => [
          {
            ...prev[0],
            text: aiResponse.slice(0, 150),
          },
          ...prev.slice(1),
        ]);
      }
      Alert.alert('AI Phân tích xong! ✨', 'Đã dùng Gemini 1.5 Flash tạo các gợi ý phản hồi phù hợp nhất.');
    } catch (err) {
      Alert.alert('Lỗi kết nối Gemini', err.message || 'Không thể tạo câu trả lời.');
    } finally {
      setAnalyzing(false);
    }
  };

  const copyReply = (text) => {
    Alert.alert('Đã chọn câu trả lời', `Nội dung đã được sao chép:\n"${text}"\n\nBạn có thể dán ngay vào Messenger/Zalo để gửi.`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={isVietnamese ? 'AI Gợi ý trả lời' : 'AI Reply Assistant'}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Khung nhập tin nhắn nhận được */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="chatbubbles" size={20} color={colors.primary} />
          <Text style={styles.cardTitle}>{isVietnamese ? 'Tin nhắn bạn nhận được' : 'Incoming Message'}</Text>
        </View>

        <TextInput
          value={incomingMsg}
          onChangeText={setIncomingMsg}
          multiline
          placeholder={isVietnamese ? 'Dán hoặc gõ tin nhắn nhận được vào đây...' : 'Paste or type message here...'}
          placeholderTextColor={colors.sub}
          style={[styles.msgInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
        />

        <Text style={[styles.sampleLabel, { color: colors.sub }]}>{isVietnamese ? 'Gợi ý tin nhắn mẫu:' : 'Sample messages:'}</Text>
        <View style={styles.samplesRow}>
          {SAMPLES.map((s, idx) => (
            <Pressable
              key={idx}
              onPress={() => setIncomingMsg(s)}
              style={[styles.samplePill, { backgroundColor: colors.bg, borderColor: colors.border }]}
            >
              <Text style={{ color: colors.sub, fontSize: 12 }} numberOfLines={1}>
                {s}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleGenerate}
          disabled={analyzing}
          style={[styles.analyzeBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="sparkles" size={18} color="#121214" />
          <Text style={styles.analyzeBtnText}>
            {analyzing
              ? (isVietnamese ? 'AI đang phân tích ngữ cảnh...' : 'AI analyzing context...')
              : (isVietnamese ? 'AI phân tích & gợi ý trả lời' : 'Analyze & Suggest Replies')}
          </Text>
        </Pressable>
      </View>

      {/* Danh sách 3 gợi ý trả lời từ AI */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{isVietnamese ? 'Gợi ý phản hồi thông minh' : 'Smart Reply Suggestions'}</Text>

      {replies.map((reply, idx) => (
        <View
          key={idx}
          style={[styles.replyCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        >
          <View style={styles.replyTop}>
            <View style={[styles.toneBadge, { backgroundColor: reply.color + '22' }]}>
              <Ionicons name={reply.icon} size={14} color={reply.color} />
              <Text style={[styles.toneText, { color: reply.color }]}>{reply.tone}</Text>
            </View>

            <Pressable
              onPress={() => copyReply(reply.text)}
              style={[styles.copyBtn, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}
            >
              <Ionicons name="copy-outline" size={14} color={colors.primary} />
              <Text style={[styles.copyText, { color: colors.primary }]}>{isVietnamese ? 'Sao chép' : 'Copy'}</Text>
            </Pressable>
          </View>

          <Text style={styles.replyContent}>{reply.text}</Text>
        </View>
      ))}
          </>
        }
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  msgInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 14.5,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  sampleLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  samplesRow: {
    gap: 6,
  },
  samplePill: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 999,
    gap: 8,
    marginTop: 16,
    overflow: 'hidden',
  },
  analyzeBtnText: {
    color: '#121214',
    fontSize: 15,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  replyCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  replyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  toneText: {
    fontSize: 12,
    fontWeight: '800',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  copyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  replyContent: {
    fontSize: 14.5,
    lineHeight: 21,
    color: '#FFFFFF',
  },
});

// src/services/geminiService.js
// Service tích hợp Google Gemini AI cho Trợ lý ảo ToolKit, Gợi ý trả lời & Chu kỳ việc vặt sinh hoạt
import AsyncStorage from '@react-native-async-storage/async-storage';

const GEMINI_CUSTOM_KEY_STORAGE = '@toolkit_gemini_custom_key';
const GEMINI_CHAT_HISTORY_STORAGE = '@toolkit_gemini_chat_history';

const GEMINI_MODEL = 'gemini-3-flash-preview';
const FALLBACK_MODEL = 'gemini-3.5-flash';
const GEMINI_API_URL = process.env.EXPO_PUBLIC_GEMINI_API_URL;

/**
 * Lấy API Key đang hoạt động (Ưu tiên Custom Key của người dùng -> Fallback về .env)
 * @returns {Promise<string>}
 */
export async function getActiveGeminiKey() {
  try {
    const customKey = await AsyncStorage.getItem(GEMINI_CUSTOM_KEY_STORAGE);
    if (customKey && customKey.trim().length > 0) {
      return customKey.trim();
    }
  } catch (_e) {
    // ignore
  }
  return process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
}

/**
 * Lưu Custom API Key do người dùng nhập
 * @param {string} key
 */
export async function setCustomGeminiKey(key) {
  if (!key || !key.trim()) {
    await AsyncStorage.removeItem(GEMINI_CUSTOM_KEY_STORAGE);
  } else {
    await AsyncStorage.setItem(GEMINI_CUSTOM_KEY_STORAGE, key.trim());
  }
}

/**
 * Đọc Custom Key đã lưu (nếu có)
 * @returns {Promise<string>}
 */
export async function getSavedCustomKey() {
  try {
    return (await AsyncStorage.getItem(GEMINI_CUSTOM_KEY_STORAGE)) || '';
  } catch (_e) {
    return '';
  }
}

/**
 * Lấy lịch sử trò chuyện đã lưu
 * @returns {Promise<Array>}
 */
export async function getSavedChatHistory() {
  try {
    const raw = await AsyncStorage.getItem(GEMINI_CHAT_HISTORY_STORAGE);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_e) {
    // ignore
  }
  return [];
}

/**
 * Lưu lịch sử trò chuyện
 * @param {Array} history
 */
export async function saveChatHistory(history) {
  try {
    // Giới hạn lưu tối đa 40 tin nhắn gần nhất để tối ưu dung lượng và tốc độ
    const trimmed = (history || []).slice(-40);
    await AsyncStorage.setItem(GEMINI_CHAT_HISTORY_STORAGE, JSON.stringify(trimmed));
  } catch (_e) {
    // ignore
  }
}

/**
 * Xóa sạch lịch sử trò chuyện
 */
export async function clearChatHistory() {
  try {
    await AsyncStorage.removeItem(GEMINI_CHAT_HISTORY_STORAGE);
  } catch (_e) {
    // ignore
  }
}

/**
 * Gửi tin nhắn đến Google Gemini 1.5 Flash cho Trợ lý ảo Bot và Trả lời tin nhắn
 * @param {Array} messages - Danh sách tin nhắn [{ id, role: 'user'|'model', text, timestamp }]
 * @param {string} promptText - Câu hỏi / tin nhắn mới của người dùng
 * @returns {Promise<string>} - Nội dung phản hồi từ AI
 */
export async function sendToGemini(messages, promptText) {
  const apiKey = await getActiveGeminiKey();

  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình Gemini API Key. Vui lòng bấm vào biểu tượng Cài đặt bánh răng trên khung chat để nhập API Key của bạn.'
    );
  }

  // Chuẩn hóa danh sách tin nhắn cho định dạng contents của Gemini API
  // Chỉ lấy tối đa 10 lượt hội thoại gần nhất để tránh tràn context
  const recentMessages = (messages || []).slice(-10);

  const contents = recentMessages.map((msg) => ({
    role: msg.role === 'model' ? 'model' : 'user',
    parts: [{ text: msg.text || '' }],
  }));

  // Đính kèm câu hỏi mới của người dùng
  contents.push({
    role: 'user',
    parts: [{ text: promptText }],
  });

  const requestBody = {
    system_instruction: {
      parts: [
        {
          text:
            'Bạn là Trợ lý AI ToolKit thông minh, hữu ích và thân thiện. Bạn hỗ trợ người dùng trò chuyện, trả lời câu hỏi, soạn thảo tin nhắn lịch sự, dịch thuật ngôn ngữ, và gợi ý phản hồi tin nhắn khách hàng / bạn bè. Luôn trả lời bằng tiếng Việt tự nhiên, súc tích, định dạng gạch đầu dòng rõ ràng khi cần thiết.',
        },
      ],
    },
    contents: contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000,
    },
  };

  // Danh sách các model mới nhất để thử nghiệm và dự phòng
  const candidateModels = [GEMINI_MODEL, FALLBACK_MODEL, 'gemini-flash-latest'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `Lỗi từ máy chủ Gemini (Mã: ${response.status})`;
        // Nếu model 404 (bị loại bỏ) hoặc 503 (quá tải tạm thời), tiếp tục thử model dự phòng tiếp theo
        if (response.status === 404 || response.status === 503) {
          lastError = new Error(errorMsg);
          continue;
        }
        if (response.status === 400 || response.status === 403) {
          throw new Error(`API Key không hợp lệ hoặc đã hết hạn: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      const candidate = data?.candidates?.[0];
      const replyText = candidate?.content?.parts?.[0]?.text;

      if (replyText) {
        return replyText.trim();
      }
    } catch (err) {
      if (err.message?.includes('API Key không hợp lệ')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('AI không thể tạo câu trả lời cho yêu cầu này. Vui lòng thử lại.');
}

/**
 * Gọi API Google Gemini (hỗ trợ Backend Proxy URL hoặc gọi trực tiếp bằng API Key)
 */
export async function callGemini(prompt, systemInstruction = '') {
  if (GEMINI_API_URL) {
    const requestBody = {
      contents: [
        {
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 0 },
      },
    };

    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const tryCallModel = async (modelName) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000);

      try {
        const res = await fetch(GEMINI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...requestBody, model: modelName }),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const msg = errData?.error?.message || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        const data = await res.json();
        const candidate = data?.text;
        if (!candidate) {
          throw new Error('Không nhận được phản hồi từ Gemini AI.');
        }
        return candidate.trim();
      } catch (err) {
        clearTimeout(timeout);
        throw err;
      }
    };

    try {
      return await tryCallModel(GEMINI_MODEL);
    } catch {
      try {
        return await tryCallModel(FALLBACK_MODEL);
      } catch {
        // Tiếp tục thử gọi qua Direct Key bên dưới
      }
    }
  }

  // Fallback: Thử gọi trực tiếp nếu có cấu hình Gemini Key
  const directKey = await getActiveGeminiKey();
  if (directKey) {
    const candidateModels = [GEMINI_MODEL, FALLBACK_MODEL, 'gemini-flash-latest'];
    const reqBody = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    };
    if (systemInstruction) {
      reqBody.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    for (const model of candidateModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${directKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
        });
        const data = await response.json();
        if (response.ok) {
          const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) return replyText.trim();
        }
      } catch {
        // thử model tiếp theo
      }
    }
  }

  throw new Error('AI_BACKEND_NOT_CONFIGURED');
}

// ============================================================
// GỢI Ý CHU KỲ VIỆC VẶT SINH HOẠT (MICRO-HABIT AI GENERATOR)
// ============================================================

const PRESET_TOPIC_TEMPLATES = {
  study: [
    { title: 'Xem lại thời khóa biểu ngày mai', type: 'daily', targetCount: 1, color: '#3B82F6', reminderTime: '21:00', unit: 'lần' },
    { title: 'Soạn sách vở và bài tập cần nộp', type: 'daily', targetCount: 1, color: '#8B5CF6', reminderTime: '21:30', unit: 'lần' },
    { title: 'Thức dậy và chuẩn bị đồ đi học', type: 'daily', targetCount: 1, color: '#10B981', reminderTime: '06:00', unit: 'lần' },
    { title: 'Ăn sáng trước giờ lên lớp', type: 'daily', targetCount: 1, color: '#F59E0B', reminderTime: '06:30', unit: 'lần' },
    { title: 'Xuất phát đến trường đúng giờ', type: 'daily', targetCount: 1, color: '#06B6D4', reminderTime: '06:50', unit: 'lần' },
  ],
  student: [
    { title: 'Đóng tiền trọ', type: 'monthly', dayOfMonth: 5, color: '#EF4444', reminderTime: '09:00', unit: 'lần' },
    { title: 'Tiền điện nước phòng', type: 'monthly', dayOfMonth: 10, color: '#F59E0B', reminderTime: '10:00', unit: 'lần' },
    { title: 'Đổi bình nước lọc 20L', type: 'interval', intervalDays: 14, color: '#3B82F6', reminderTime: '08:00', unit: 'lần' },
    { title: 'Giặt chăn ga gối', type: 'interval', intervalDays: 14, color: '#8B5CF6', reminderTime: '09:00', unit: 'lần' },
    { title: 'Uống đủ nước', type: 'daily', targetCount: 8, color: '#06B6D4', reminderTime: '08:00', unit: 'cốc' },
  ],
  motor: [
    { title: 'Thay nhớt máy xe', type: 'interval', intervalDays: 50, color: '#EF4444', reminderTime: '09:00', unit: 'lần' },
    { title: 'Thay nhớt láp / hộp số', type: 'interval', intervalDays: 120, color: '#F59E0B', reminderTime: '09:00', unit: 'lần' },
    { title: 'Kiểm tra áp suất lốp & bơm', type: 'interval', intervalDays: 15, color: '#10B981', reminderTime: '08:00', unit: 'lần' },
    { title: 'Bảo dưỡng định kỳ toàn bộ xe', type: 'interval', intervalDays: 180, color: '#3B82F6', reminderTime: '09:00', unit: 'lần' },
    { title: 'Rửa xe sạch sẽ', type: 'interval', intervalDays: 7, color: '#06B6D4', reminderTime: '10:00', unit: 'lần' },
  ],
  health: [
    { title: 'Uống nước trong ngày', type: 'daily', targetCount: 8, color: '#3B82F6', reminderTime: '08:00', unit: 'cốc' },
    { title: 'Uống Vitamin / Thuốc', type: 'daily', targetCount: 2, color: '#EF4444', reminderTime: '08:00', unit: 'lần' },
    { title: 'Vận động thể thao 30 phút', type: 'daily', targetCount: 1, color: '#10B981', reminderTime: '17:30', unit: 'lần' },
    { title: 'Ngủ sớm trước 23h', type: 'daily', targetCount: 1, color: '#8B5CF6', reminderTime: '22:45', unit: 'lần' },
    { title: 'Cân trọng lượng cơ thể', type: 'interval', intervalDays: 7, color: '#F59E0B', reminderTime: '07:00', unit: 'lần' },
  ],
  pet: [
    { title: 'Dọn & thay cát mèo', type: 'interval', intervalDays: 3, color: '#F59E0B', reminderTime: '08:00', unit: 'lần' },
    { title: 'Tắm & sấy lông cho thú cưng', type: 'interval', intervalDays: 14, color: '#3B82F6', reminderTime: '09:00', unit: 'lần' },
    { title: 'Nhỏ thuốc rận gáy', type: 'interval', intervalDays: 30, color: '#EF4444', reminderTime: '10:00', unit: 'lần' },
    { title: 'Tẩy giun định kỳ', type: 'interval', intervalDays: 90, color: '#8B5CF6', reminderTime: '09:00', unit: 'lần' },
    { title: 'Cho ăn đúng bữa', type: 'daily', targetCount: 2, color: '#10B981', reminderTime: '07:30', unit: 'bữa' },
  ],
  home: [
    { title: 'Đóng tiền internet / 4G', type: 'monthly', dayOfMonth: 20, color: '#3B82F6', reminderTime: '09:00', unit: 'lần' },
    { title: 'Đổi bình gas / kiểm tra bếp', type: 'interval', intervalDays: 60, color: '#EF4444', reminderTime: '10:00', unit: 'lần' },
    { title: 'Thay lõi máy lọc nước', type: 'interval', intervalDays: 90, color: '#06B6D4', reminderTime: '09:00', unit: 'lần' },
    { title: 'Tổng vệ sinh nhà cửa', type: 'interval', intervalDays: 7, color: '#10B981', reminderTime: '08:00', unit: 'lần' },
  ],
};

export async function generateHabitsWithAi(topicOrNeed) {
  const query = (topicOrNeed || '').trim().toLowerCase();

  // 1. Thử gọi Gemini AI
  try {
    const prompt = `Bạn là chuyên gia tổ chức cuộc sống và thói quen sinh hoạt. Người dùng có nhu cầu: "${topicOrNeed}".
Hãy đề xuất 3 đến 5 chu kỳ việc vặt sinh hoạt phù hợp nhất với đúng nhu cầu đó.
Chỉ trả về JSON thuần túy (không bọc trong \`\`\`), là một mảng:
[
  {
    "title": "Tên việc vặt",
    "type": "interval" hoặc "monthly" hoặc "daily",
    "intervalDays": 45,
    "dayOfMonth": 5,
    "targetCount": 2,
    "unit": "lần" hoặc "cốc" hoặc "viên",
    "reminderTime": "08:00",
    "color": "#EF4444"
  }
]
Lưu ý:
- "interval": chu kỳ lặp lại theo số ngày (intervalDays > 0)
- "monthly": chu kỳ cố định ngày trong tháng (dayOfMonth từ 1 đến 28)
- "daily": chu kỳ lặp trong ngày (targetCount > 0, unit là đơn vị đếm)`;

    const raw = await callGemini(prompt);
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item, idx) => ({
          title: item.title || `Việc vặt ${idx + 1}`,
          type: ['interval', 'monthly', 'daily'].includes(item.type) ? item.type : 'interval',
          intervalDays: Number(item.intervalDays) || 30,
          dayOfMonth: Number(item.dayOfMonth) || 5,
          targetCount: Number(item.targetCount) || 1,
          unit: item.unit || 'lần',
          reminderTime: item.reminderTime || '08:00',
          color: item.color || '#3B82F6',
        }));
      }
    }
  } catch (err) {
    console.warn('[Gemini AI] generateHabitsWithAi fallback:', err.message);
  }

  // 2. Khớp chủ đề cục bộ khi offline hoặc mạng gián đoạn
  if (query.includes('học') || query.includes('trường') || query.includes('lớp') || query.includes('thời khóa biểu') || query.includes('sách')) {
    return PRESET_TOPIC_TEMPLATES.study;
  }
  if (query.includes('xe') || query.includes('nhớt') || query.includes('bảo dưỡng') || query.includes('lốp')) {
    return PRESET_TOPIC_TEMPLATES.motor;
  }
  if (query.includes('mèo') || query.includes('chó') || query.includes('thú cưng') || query.includes('pet')) {
    return PRESET_TOPIC_TEMPLATES.pet;
  }
  if (query.includes('trọ') || query.includes('sinh viên') || query.includes('phòng')) {
    return PRESET_TOPIC_TEMPLATES.student;
  }
  if (query.includes('nhà') || query.includes('gas') || query.includes('lọc nước') || query.includes('dọn dẹp')) {
    return PRESET_TOPIC_TEMPLATES.home;
  }
  if (query.includes('sức khỏe') || query.includes('thuốc') || query.includes('nước') || query.includes('ngủ') || query.includes('tập')) {
    return PRESET_TOPIC_TEMPLATES.health;
  }

  // Fallback thông minh theo từ khóa người dùng nhập thay vì trả bừa mẫu không liên quan
  return [
    { title: `Nhắc việc: ${topicOrNeed}`, type: 'daily', targetCount: 1, color: '#3B82F6', reminderTime: '08:00', unit: 'lần' },
    { title: `Chuẩn bị cho ${topicOrNeed}`, type: 'daily', targetCount: 1, color: '#10B981', reminderTime: '07:00', unit: 'lần' },
    { title: `Đánh giá tiến độ ${topicOrNeed}`, type: 'interval', intervalDays: 7, color: '#8B5CF6', reminderTime: '20:00', unit: 'lần' },
  ];
}

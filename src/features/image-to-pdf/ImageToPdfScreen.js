import { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  Alert,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as SecureStore from '../../utils/storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui';
import { radius, useTheme } from '../../theme';
import { useAuth } from '../auth';
import { useLanguage } from '../../context/LanguageContext';

const MAX_WIDTH = 1600;
const STORAGE_KEY = 'toolkit_pdf_history';

function formatTimestamp(isoString) {
  try {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return 'Vừa xong';
  }
}

export default function ImageToPdfScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t, isVietnamese } = useLanguage();

  // Tab: 'create' | 'history'
  const [activeTab, setActiveTab] = useState('create');

  // Trạng thái ghép ảnh
  const [images, setImages] = useState([]);
  const [pdfName, setPdfName] = useState('');
  const [loading, setLoading] = useState(false);

  // Lịch sử ghép file
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Tải lịch sử từ SecureStore khi mở màn hình
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc lịch sử PDF:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const persistHistory = async (newList) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(newList));
      setHistory(newList);
    } catch (e) {
      console.warn('Lỗi lưu lịch sử PDF:', e);
    }
  };

  const deleteHistoryItem = (id) => {
    Alert.alert('Xóa lịch sử', 'Bạn có chắc chắn muốn xóa tài liệu này khỏi lịch sử?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          const updated = history.filter((item) => item.id !== id);
          persistHistory(updated);
        },
      },
    ]);
  };

  const clearAllHistory = () => {
    if (history.length === 0) return;
    Alert.alert('Xóa toàn bộ', 'Bạn có chắc chắn muốn xóa toàn bộ lịch sử ghép PDF?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa hết',
        style: 'destructive',
        onPress: () => {
          persistHistory([]);
        },
      },
    ]);
  };

  // Mở file xem trước / in
  const handlePreviewPdf = async (item) => {
    try {
      await Print.printAsync({ uri: item.uri });
    } catch (e) {
      // Nếu in lỗi, thử mở chia sẻ
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(item.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      } else {
        Alert.alert('Thông báo', `Đường dẫn file: ${item.uri}`);
      }
    }
  };

  // Chia sẻ file
  const handleSharePdf = async (item) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(item.uri, {
          mimeType: 'application/pdf',
          UTI: 'com.adobe.pdf',
          dialogTitle: `Chia sẻ ${item.title}`,
        });
      } else {
        Alert.alert('Thông báo', `Đường dẫn file: ${item.uri}`);
      }
    } catch (e) {
      Alert.alert('Lỗi chia sẻ', e?.message || 'Không thể chia sẻ file PDF.');
    }
  };

  // 1. Chọn nhiều ảnh từ thư viện
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 0,
        quality: 1,
      });
      if (!result.canceled) {
        setImages((prev) => [...prev, ...result.assets]);
      }
    } catch (e) {
      Alert.alert('Lỗi chọn ảnh', 'Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.');
    }
  };

  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const move = (i, delta) => {
    const t = i + delta;
    if (t < 0 || t >= images.length) return;
    const next = [...images];
    [next[i], next[t]] = [next[t], next[i]];
    setImages(next);
  };

  // 2. Tạo PDF: mỗi ảnh một trang A4 & lưu lịch sử
  const createPdf = async () => {
    if (images.length === 0) {
      Alert.alert('Chưa có ảnh', 'Hãy chọn ít nhất 1 ảnh để ghép thành file PDF.');
      return;
    }

    setLoading(true);
    try {
      const pages = [];
      for (const img of images) {
        const actions = img.width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];
        const out = await ImageManipulator.manipulateAsync(img.uri, actions, {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        });
        pages.push(`<div class="page"><img src="data:image/jpeg;base64,${out.base64}" /></div>`);
      }

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              @page { margin: 0; }
              body { margin: 0; padding: 0; }
              .page {
                width: 595px; height: 842px;
                display: flex; align-items: center; justify-content: center;
                page-break-after: always;
              }
              img { max-width: 100%; max-height: 100%; object-fit: contain; }
            </style>
          </head>
          <body>${pages.join('')}</body>
        </html>`;

      const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });

      // Đặt tên tài liệu PDF
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const defaultName = `TaiLieu_${pad(now.getDate())}${pad(now.getMonth() + 1)}_${pad(now.getHours())}${pad(now.getMinutes())}.pdf`;
      const finalTitle = pdfName.trim() ? (pdfName.endsWith('.pdf') ? pdfName.trim() : `${pdfName.trim()}.pdf`) : defaultName;

      // Lưu bản ghi vào Lịch sử
      const newRecord = {
        id: String(Date.now()),
        title: finalTitle,
        pageCount: images.length,
        uri,
        firstImageUri: images[0]?.uri || null,
        createdAt: now.toISOString(),
      };

      const updatedHistory = [newRecord, ...history];
      await persistHistory(updatedHistory);

      // Thông báo và mở chia sẻ
      Alert.alert(
        'Tạo PDF thành công! 🎉',
        `Tài liệu "${finalTitle}" (${images.length} trang) đã được lưu vào Lịch sử.`,
        [
          { text: 'Xem lịch sử', onPress: () => setActiveTab('history') },
          {
            text: 'Chia sẻ ngay',
            onPress: async () => {
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
              }
            },
          },
        ]
      );

      // Dọn dẹp form
      setImages([]);
      setPdfName('');
    } catch (e) {
      Alert.alert('Lỗi tạo PDF', String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  };

  const iconBtn = { padding: 8 };

  // Render từng ảnh trong danh sách ghép
  const renderImageItem = ({ item, index }) => (
    <View
      style={[
        styles.imageRow,
        { backgroundColor: colors.card, borderColor: colors.cardBorder || colors.border },
      ]}
    >
      <Image source={{ uri: item.uri }} style={styles.thumbnail} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Trang {index + 1}</Text>
        <Text style={[styles.pageSub, { color: colors.sub }]} numberOfLines={1}>
          {item.fileName || `Ảnh ${index + 1}`}
        </Text>
      </View>
      <Pressable onPress={() => move(index, -1)} style={iconBtn} hitSlop={6} disabled={index === 0}>
        <Ionicons name="arrow-up" size={20} color={index === 0 ? colors.border : colors.sub} />
      </Pressable>
      <Pressable
        onPress={() => move(index, 1)}
        style={iconBtn}
        hitSlop={6}
        disabled={index === images.length - 1}
      >
        <Ionicons
          name="arrow-down"
          size={20}
          color={index === images.length - 1 ? colors.border : colors.sub}
        />
      </Pressable>
      <Pressable onPress={() => removeImage(index)} style={iconBtn} hitSlop={6}>
        <Ionicons name="close-circle" size={22} color={colors.danger} />
      </Pressable>
    </View>
  );

  // Render từng mục trong Lịch sử ghép PDF
  const renderHistoryItem = ({ item }) => (
    <View
      style={[
        styles.historyCard,
        { backgroundColor: colors.card, borderColor: colors.cardBorder || colors.border },
      ]}
    >
      <View style={styles.historyCardHeader}>
        <View style={[styles.pdfIconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
          <Ionicons name="document-text" size={24} color="#EF4444" />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.historyTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.historyMetaRow}>
            <View style={[styles.pagesPill, { backgroundColor: colors.primary + '1F' }]}>
              <Text style={[styles.pagesPillText, { color: colors.primary }]}>
                {item.pageCount} {isVietnamese ? 'trang' : 'pages'}
              </Text>
            </View>
            <Text style={[styles.historyDate, { color: colors.sub }]}>
              {formatTimestamp(item.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Các nút thao tác với file PDF */}
      <View style={[styles.historyActionsRow, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => handlePreviewPdf(item)}
          style={[styles.historyActionBtn, { backgroundColor: colors.bg }]}
        >
          <Ionicons name="eye-outline" size={17} color={colors.primary} />
          <Text style={[styles.historyActionText, { color: colors.primary }]}>{isVietnamese ? 'Xem / In' : 'View / Print'}</Text>
        </Pressable>

        <Pressable
          onPress={() => handleSharePdf(item)}
          style={[styles.historyActionBtn, { backgroundColor: colors.bg }]}
        >
          <Ionicons name="share-outline" size={17} color="#10B981" />
          <Text style={[styles.historyActionText, { color: '#10B981' }]}>{isVietnamese ? 'Chia sẻ' : 'Share'}</Text>
        </Pressable>

        <Pressable
          onPress={() => deleteHistoryItem(item.id)}
          style={[styles.historyActionBtn, { backgroundColor: colors.bg }]}
        >
          <Ionicons name="trash-outline" size={17} color={colors.danger} />
          <Text style={[styles.historyActionText, { color: colors.danger }]}>{isVietnamese ? 'Xóa' : 'Delete'}</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={isVietnamese ? 'Ghép ảnh PDF' : 'Image to PDF'}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
        rightAction={
          activeTab === 'history' && history.length > 0 ? (
            <Pressable onPress={clearAllHistory} hitSlop={8}>
              <Text style={{ color: colors.danger, fontWeight: '700', fontSize: 13 }}>
                {isVietnamese ? 'Xóa hết' : 'Clear All'}
              </Text>
            </Pressable>
          ) : null
        }
      />

      {/* Tab Switcher: Ghép ảnh mới vs Lịch sử đã ghép */}
      <View style={[styles.tabBarContainer, { backgroundColor: colors.card }]}>
        <Pressable
          onPress={() => setActiveTab('create')}
          style={[
            styles.tabItem,
            activeTab === 'create' && [styles.activeTabItem, { borderColor: colors.primary }],
          ]}
        >
          <Ionicons
            name="images"
            size={18}
            color={activeTab === 'create' ? colors.primary : colors.sub}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'create' ? colors.primary : colors.sub },
            ]}
          >
            {isVietnamese ? 'Ghép ảnh mới' : 'Create PDF'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('history')}
          style={[
            styles.tabItem,
            activeTab === 'history' && [styles.activeTabItem, { borderColor: colors.primary }],
          ]}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === 'history' ? colors.primary : colors.sub}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'history' ? colors.primary : colors.sub },
            ]}
          >
            {isVietnamese ? 'Lịch sử ghép' : 'PDF History'}
          </Text>
          {history.length > 0 && (
            <View style={[styles.badgeCount, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeCountText}>{history.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Nội dung Tab 1: Ghép ảnh mới */}
      {activeTab === 'create' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={images}
            keyExtractor={(item, i) => item.uri + i}
            renderItem={renderImageItem}
            ListHeaderComponent={
              images.length > 0 ? (
                <View style={[styles.inputNameBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                  <TextInput
                    value={pdfName}
                    onChangeText={setPdfName}
                    placeholder={isVietnamese ? 'Tên file PDF (tùy chọn)...' : 'PDF document title (optional)...'}
                    placeholderTextColor={colors.sub}
                    style={[styles.nameInput, { color: colors.text }]}
                  />
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '1A' }]}>
                  <Ionicons name="images-outline" size={44} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {isVietnamese ? 'Chưa chọn ảnh nào' : 'No photos selected'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.sub }]}>
                  {isVietnamese
                    ? 'Bấm nút "+ Chọn ảnh" bên dưới để tải ảnh từ thư viện'
                    : 'Tap "+ Select Photos" below to pick images from your gallery'}
                </Text>
              </View>
            }
            contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          />

          {/* Thanh nút bấm cố định phía dưới */}
          <View
            style={[
              styles.bottomBar,
              {
                paddingBottom: Math.max(insets.bottom, 16),
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={pickImages}
              disabled={loading}
              style={[styles.btnOutline, { borderColor: colors.primary }]}
            >
              <Ionicons name="add" size={20} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.btnOutlineText, { color: colors.primary }]}>
                {isVietnamese ? 'Chọn ảnh' : 'Select Photos'}
              </Text>
            </Pressable>

            <Pressable
              onPress={createPdf}
              disabled={loading || images.length === 0}
              style={[
                styles.btnPrimary,
                {
                  backgroundColor: colors.primary,
                  opacity: loading || images.length === 0 ? 0.6 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#121214" />
              ) : (
                <Text style={styles.btnPrimaryText}>
                  {isVietnamese ? `Tạo PDF (${images.length})` : `Convert to PDF (${images.length})`}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Nội dung Tab 2: Lịch sử ghép PDF */}
      {activeTab === 'history' && (
        <View style={{ flex: 1 }}>
          {historyLoading ? (
            <View style={styles.centerLoading}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.id}
              renderItem={renderHistoryItem}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                    <Ionicons name="document-text-outline" size={44} color="#EF4444" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {isVietnamese ? 'Chưa có lịch sử ghép PDF' : 'No PDF history yet'}
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.sub }]}>
                    {isVietnamese
                      ? 'Các file PDF bạn đã tạo sẽ được lưu lại đầy đủ tại đây'
                      : 'PDF files created will be safely preserved here'}
                  </Text>
                  <Pressable
                    onPress={() => setActiveTab('create')}
                    style={[styles.btnBackToCreate, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.btnBackToCreateText}>
                      {isVietnamese ? 'Ghép tài liệu ngay' : 'Create a PDF now'}
                    </Text>
                  </Pressable>
                </View>
              }
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '700',
  },
  badgeCount: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeCountText: {
    color: '#121214',
    fontSize: 11,
    fontWeight: '800',
  },
  inputNameBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    marginBottom: 14,
    height: 48,
  },
  nameInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  thumbnail: {
    width: 54,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#2A2A30',
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  pageSub: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 70,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontWeight: '700',
    fontSize: 16,
  },
  btnPrimary: {
    flex: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#121214',
    fontWeight: '800',
    fontSize: 16,
  },
  // History styles
  historyCard: {
    borderRadius: radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  pdfIconBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  pagesPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pagesPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyDate: {
    fontSize: 12,
  },
  historyActionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 6,
    gap: 6,
  },
  historyActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: radius.sm,
  },
  historyActionText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnBackToCreate: {
    marginTop: 20,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  btnBackToCreateText: {
    color: '#121214',
    fontWeight: '800',
    fontSize: 14,
  },
  centerLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
});

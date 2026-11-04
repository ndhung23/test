// src/features/snap-video/SnapVideoScreen.js
// Màn hình tải video từ 4 mạng xã hội: TikTok, YouTube, Facebook, Instagram
// Tương tự tính năng Snap Video trên phimtat.vn

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import {
  SUPPORTED_PLATFORMS,
  detectPlatform,
  isValidUrl,
  fetchDownloadLink,
  startVideoDownload,
  shareDownloadedFile,
  cleanupTempFile,
} from './videoDownloadService';

// Lịch sử tải gần đây (trong phiên)
const MAX_HISTORY = 20;

const QUALITY_OPTIONS = [
  { id: 'best', label: 'Tốt nhất ⭐' },
  { id: '1080p', label: '1080p FHD' },
  { id: '720p', label: '720p HD' },
  { id: '480p', label: '480p SD' },
  { id: '360p', label: '360p' },
];

/**
 * Gom toàn bộ chuỗi văn bản UI theo chế độ tải (video / audio)
 * Đảm bảo không bị hardcode lẫn lộn giữa Video và Audio
 */
export function getDownloadLabels(mode, platform = Platform.OS, isEn = false) {
  const isAudio = mode === 'audio';
  const mediaType = isAudio ? 'audio' : 'video';
  const MediaType = isAudio ? 'Audio' : 'Video';

  if (isEn) {
    return {
      isAudio, mediaType, MediaType,
      buttonIdle: `Download ${MediaType}`,
      buttonLoading: `Downloading ${mediaType}...`,
      analyzing: `Analyzing ${mediaType} link...`,
      downloading: `Downloading ${mediaType}...`,
      cancelBtn: 'Cancel',
      cancelledError: `Cancelled ${mediaType} download.`,
      successTitle: `Downloaded ${mediaType} successfully! 🎉`,
      successGallery: isAudio ? 'Audio saved to library.' : 'Video saved to photo library.',
      successSheet: `${MediaType} downloaded successfully. Save via share menu.`,
      notSavedYetTitle: 'Download complete, not saved',
      notSavedYetMsg: 'File downloaded. Please check permissions in Settings.',
      failTitle: `${MediaType} download failed`,
      emptyHistory: `No ${mediaType} downloaded in this session`,
    };
  }

  return {
    isAudio, mediaType, MediaType,
    buttonIdle: `Tải ${MediaType}`,
    buttonLoading: `Đang tải ${mediaType}...`,
    analyzing: `Đang phân tích link ${mediaType}...`,
    downloading: `Đang tải ${mediaType}...`,
    cancelBtn: 'Hủy tải',
    cancelledError: `Đã hủy tải ${mediaType}.`,
    successTitle: `Tải ${mediaType} thành công! 🎉`,
    successGallery: isAudio
      ? 'Audio đã được lưu vào thư viện Android.'
      : platform === 'android' ? 'Video đã được lưu vào thư viện Android.' : 'Video đã được lưu vào thư viện ảnh của bạn.',
    successSheet: `${MediaType} đã được tải về thành công. Bạn có thể lưu vào ${platform === 'android' ? 'Tải xuống hoặc ứng dụng khác' : 'Tệp'} qua menu vừa mở.`,
    notSavedYetTitle: 'Tải xong nhưng chưa lưu',
    notSavedYetMsg: isAudio
      ? platform === 'android' ? 'Audio đã tải xong nhưng chưa lưu được vào thư viện. Hãy chọn Tải xuống trong menu chia sẻ.' : 'Audio đã tải xong. Vui lòng mở Tệp để quản lý.'
      : platform === 'android' ? 'File đã tải về nhưng không thể lưu vào thư viện Android. Vui lòng kiểm tra quyền trong Cài đặt.' : 'File đã tải về thiết bị nhưng không thể lưu vào thư viện ảnh. Vui lòng kiểm tra quyền truy cập trong Cài đặt.',
    failTitle: `Tải ${mediaType} thất bại`,
    emptyHistory: `Chưa có ${mediaType} nào được tải trong phiên này`,
  };
}

export default function SnapVideoScreen({ navigation }) {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const [url, setUrl] = useState('');
  const [downloadMode, setDownloadMode] = useState('video'); // 'video' | 'audio'
  const [selectedQuality, setSelectedQuality] = useState('best'); // 'best' | '1080p' | '720p' | '480p' | '360p'
  const labels = useMemo(() => getDownloadLabels(downloadMode, Platform.OS, isEn), [downloadMode, isEn]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [history, setHistory] = useState([]);
  const [detectedPlatform, setDetectedPlatform] = useState(null);
  const inputRef = useRef(null);
  const isMountedRef = useRef(true);
  const currentAbortControllerRef = useRef(null);
  const currentDownloadHandleRef = useRef(null);
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
      }
      if (currentDownloadHandleRef.current) {
        currentDownloadHandleRef.current.cancel();
      }
    };
  }, []);

  // Cập nhật platform khi URL thay đổi
  const handleUrlChange = useCallback((text) => {
    setUrl(text);
    const platform = detectPlatform(text);
    setDetectedPlatform(platform);
  }, []);

  // {t('snapVideo.pasteBtn') ? `${t('snapVideo.pasteBtn')} (Clipboard)` : 'Dán link từ clipboard'}
  const handlePaste = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text && isValidUrl(text)) {
        handleUrlChange(text.trim());
      } else {
        Alert.alert('Không tìm thấy link', 'Clipboard không chứa link hợp lệ. Hãy sao chép link video từ ứng dụng mạng xã hội.');
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể đọc clipboard.');
    }
  }, [handleUrlChange]);

  // Hủy tải video giữa chừng
  const handleCancelDownload = useCallback(async () => {
    try {
      if (currentAbortControllerRef.current) {
        currentAbortControllerRef.current.abort();
        currentAbortControllerRef.current = null;
      }
      if (currentDownloadHandleRef.current) {
        await currentDownloadHandleRef.current.cancel();
        currentDownloadHandleRef.current = null;
      }
    } catch {
      // safe
    }
    setLoading(false);
    setStatusText('');
    setProgress(0);
    progressAnim.setValue(0);
  }, [progressAnim]);

  // Xóa link
  const handleClear = useCallback(() => {
    setUrl('');
    setDetectedPlatform(null);
    setStatusText('');
    setProgress(0);
    progressAnim.setValue(0);
  }, [progressAnim]);

  // Bắt đầu tải video
  const handleDownload = useCallback(async () => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      Alert.alert('Thiếu link', 'Vui lòng dán link video từ TikTok, YouTube, Facebook hoặc Instagram.');
      return;
    }

    if (!isValidUrl(trimmedUrl)) {
      Alert.alert('Link không hợp lệ', 'Vui lòng kiểm tra lại link video.');
      return;
    }

    const abortCtrl = new AbortController();
    currentAbortControllerRef.current = abortCtrl;
    currentDownloadHandleRef.current = null;

    setLoading(true);
    setProgress(0);
    progressAnim.setValue(0);
    setStatusText(labels.analyzing);

    const tStart = Date.now();

    try {
      // Bước 1: Lấy link tải từ API với chất lượng đã chọn (có hỗ trợ hủy)
      const downloadInfo = await fetchDownloadLink(trimmedUrl, downloadMode, selectedQuality, abortCtrl.signal);

      if (!isMountedRef.current || abortCtrl.signal.aborted) return;
      setStatusText(labels.downloading);

      // Bước 2: Tải và lưu file (với throttle progress chống giật lag UI & hỗ trợ hủy)
      let lastP = 0;
      let lastTime = 0;
      const downloadHandle = startVideoDownload(
        downloadInfo.url,
        downloadInfo.filename,
        (p) => {
          if (!isMountedRef.current || abortCtrl.signal.aborted) return;
          const now = Date.now();
          if (p === 1 || Math.abs(p - lastP) >= 0.03 || now - lastTime > 150) {
            lastP = p;
            lastTime = now;
            setProgress(p);
            progressAnim.setValue(p);
          }
        },
        downloadMode,
        downloadInfo.metadata || null
      );

      currentDownloadHandleRef.current = downloadHandle;
      const result = await downloadHandle.promise;

      if (!isMountedRef.current || abortCtrl.signal.aborted) return;

      const tEnd = Date.now();
      const duration = `${((tEnd - tStart) / 1000).toFixed(1)}s`;

      // Bước 3: Thêm vào lịch sử kèm thông tin chất lượng & thời gian tải (VIỆC 3 & 4)
      const historyItem = {
        id: Date.now().toString(),
        url: trimmedUrl,
        platform: detectedPlatform,
        mode: downloadMode,
        quality: selectedQuality,
        qualityInfo: downloadInfo.qualityInfo || (downloadMode === 'audio' ? 'Audio MP3' : `${selectedQuality}`),
        duration,
        savedToGallery: result.savedToGallery,
        sharedViaSheet: result.sharedViaSheet,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
      };

      setHistory((prev) => [historyItem, ...prev].slice(0, MAX_HISTORY));

      // Bước 4: Dọn file tạm (chỉ nếu đã lưu thành công)
      if (result.savedToGallery) {
        await cleanupTempFile(result.uri);
      }

      if (!isMountedRef.current) return;

      setStatusText('');
      setProgress(0);
      progressAnim.setValue(0);

      // Hiển thị kết quả chính xác theo mode (video / audio)
      if (result.savedToGallery) {
        Alert.alert(labels.successTitle, `${labels.successGallery}\n\n📊 ${historyItem.qualityInfo} (xong trong ${duration})`);
      } else if (result.sharedViaSheet) {
        Alert.alert(labels.successTitle, `${labels.successSheet}\n\n📊 ${historyItem.qualityInfo} (xong trong ${duration})`);
      } else {
        Alert.alert(labels.notSavedYetTitle, labels.notSavedYetMsg);
      }
    } catch (err) {
      if (!isMountedRef.current || abortCtrl.signal.aborted) return;
      setStatusText('');
      setProgress(0);
      progressAnim.setValue(0);
      if (err.message !== labels.cancelledError && err.message !== 'Đã hủy tải video.' && err.message !== 'Đã hủy tải audio.' && err.message !== 'Đã hủy thao tác.') {
        if (['SERVER_UNREACHABLE', 'SERVER_UNHEALTHY', 'SERVER_TIMEOUT', 'SERVER_NOT_CONFIGURED'].includes(err.code)) {
          Alert.alert(labels.failTitle, 'Không kết nối được máy chủ, kiểm tra mạng hoặc thử lại sau.', [
            { text: 'Thử lại', onPress: handleDownload },
            { text: 'Đóng', style: 'cancel' },
          ]);
          return;
        }
        if (err.code === 'PHOTOS_PERMISSION_DENIED') {
          Alert.alert(labels.failTitle, err.message, [
            { text: 'Chia sẻ thủ công', onPress: () => shareDownloadedFile(err.manualShareUri, 'video').catch((shareError) => Alert.alert('Không thể chia sẻ', shareError.message)) },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
            { text: 'Đóng', style: 'cancel' },
          ]);
          return;
        }
        if (detectedPlatform?.id === 'youtube') {
          Alert.alert(labels.failTitle, err.message || 'Không thể tải YouTube.', [
            { text: 'Thử chất lượng thấp hơn', onPress: () => { setSelectedQuality('360p'); setStatusText('Đã chọn 360p. Nhấn Tải video để thử lại.'); } },
            { text: 'Đóng', style: 'cancel' },
          ]);
          return;
        }
        if (err.code) {
          Alert.alert(labels.failTitle, err.message || 'Không thể tải nội dung.', [
            { text: 'Sao chép chi tiết', onPress: () => Clipboard.setStringAsync(`Nền tảng: ${detectedPlatform?.name || 'Không rõ'}\nMã lỗi: ${err.code}\n${err.message || ''}`) },
            { text: 'Đóng', style: 'cancel' },
          ]);
          return;
        }
        Alert.alert(
          labels.failTitle,
          err.message || 'Đã xảy ra lỗi. Vui lòng kiểm tra link và thử lại.'
        );
      }
    } finally {
      currentAbortControllerRef.current = null;
      currentDownloadHandleRef.current = null;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [url, downloadMode, selectedQuality, detectedPlatform, progressAnim, labels]);

  // Render platform chip
  const renderPlatformChip = useCallback(({ item }) => (
    <View style={[styles.platformChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Ionicons name={item.icon} size={16} color={item.color} />
      <Text style={[styles.platformChipText, { color: colors.sub }]}>{item.name}</Text>
    </View>
  ), [colors]);

  // Render lịch sử tải (Hiển thị chi tiết chất lượng, dung lượng và thời gian tải thật)
  const renderHistoryItem = useCallback(({ item }) => (
    <View style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.historyIconCircle, { backgroundColor: item.platform?.color || colors.primary + '20' }]}>
        <Ionicons
          name={item.platform?.icon || 'download'}
          size={18}
          color="#FFFFFF"
        />
      </View>
      <View style={styles.historyInfo}>
        <View style={styles.historyTitleRow}>
          <Text style={[styles.historyPlatform, { color: colors.text }]} numberOfLines={1}>
            {item.platform?.name || 'Media'} • {item.mode === 'audio' ? '🎵 Audio' : '🎬 Video'}
          </Text>
          <Ionicons
            name={item.savedToGallery || item.sharedViaSheet ? 'checkmark-circle' : 'alert-circle'}
            size={16}
            color={item.savedToGallery || item.sharedViaSheet ? colors.success : colors.danger}
          />
        </View>
        <Text style={[styles.historyUrl, { color: colors.sub }]} numberOfLines={1}>
          {item.url}
        </Text>
        <View style={styles.historyDetailsRow}>
          {item.qualityInfo ? (
            <View style={[styles.historyQualityBadge, { backgroundColor: colors.cardElevated }]}>
              <Text style={[styles.historyQualityBadgeText, { color: colors.sub }]} numberOfLines={1}>
                {item.qualityInfo}
              </Text>
            </View>
          ) : null}
          {item.duration ? <Text style={[styles.historyDuration, { color: colors.sub }]}>⏱ {item.duration}</Text> : null}
          <Text style={[styles.historyTime, { color: colors.sub }]}>{item.timestamp}</Text>
        </View>
      </View>
    </View>
  ), [colors]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title="Snap Video"
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderHistoryItem}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        ListHeaderComponent={
          <>
            {/* Banner giới thiệu */}
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={[styles.heroIconCircle, { backgroundColor: '#FF2D55' }]}>
                <Ionicons name="download" size={32} color="#FFFFFF" />
              </View>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Tải video không logo</Text>
              <Text style={[styles.heroDesc, { color: colors.sub }]}>
                Dán link video từ TikTok, YouTube, Facebook hoặc Instagram và tải về máy nhanh chóng, không dính watermark.
              </Text>
            </View>

            {/* Danh sách nền tảng hỗ trợ */}
            <FlatList
              data={SUPPORTED_PLATFORMS}
              keyExtractor={(item) => item.id}
              renderItem={renderPlatformChip}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.platformList}
            />

            {/* Input URL */}
            <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Link video</Text>

              <View style={[
                styles.inputRow,
                {
                  borderColor: detectedPlatform ? detectedPlatform.color : colors.border,
                  backgroundColor: colors.bg,
                },
              ]}>
                {detectedPlatform && (
                  <Ionicons
                    name={detectedPlatform.icon}
                    size={20}
                    color={detectedPlatform.color}
                    style={styles.inputPlatformIcon}
                  />
                )}
                <TextInput
                  ref={inputRef}
                  style={[styles.input, { color: colors.text }]}
                  value={url}
                  onChangeText={handleUrlChange}
                  placeholder={t('snapVideo.inputPlaceholder') || 'Dán link video vào đây...'}
                  placeholderTextColor={colors.sub}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleDownload}
                  editable={!loading}
                  accessibilityLabel="Link video"
                />
                {url.length > 0 && !loading && (
                  <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={20} color={colors.sub} />
                  </Pressable>
                )}
              </View>

              {/* Nút Dán link */}
              <Pressable
                onPress={handlePaste}
                disabled={loading}
                style={[styles.pasteBtn, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}
              >
                <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
                <Text style={[styles.pasteBtnText, { color: colors.primary }]}>Dán link từ clipboard</Text>
              </Pressable>

              {/* Chọn chế độ tải: Video / Audio */}
              <View style={styles.modeRow}>
                <Pressable
                  onPress={() => setDownloadMode('video')}
                  disabled={loading}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: downloadMode === 'video' ? '#FF2D55' : colors.cardElevated,
                      borderColor: downloadMode === 'video' ? '#FF2D55' : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="videocam"
                    size={18}
                    color={downloadMode === 'video' ? '#FFFFFF' : colors.sub}
                  />
                  <Text style={[
                    styles.modeBtnText,
                    { color: downloadMode === 'video' ? '#FFFFFF' : colors.sub },
                  ]}>
                    Video
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setDownloadMode('audio')}
                  disabled={loading}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor: downloadMode === 'audio' ? '#8B5CF6' : colors.cardElevated,
                      borderColor: downloadMode === 'audio' ? '#8B5CF6' : colors.cardBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="musical-notes"
                    size={18}
                    color={downloadMode === 'audio' ? '#FFFFFF' : colors.sub}
                  />
                  <Text style={[
                    styles.modeBtnText,
                    { color: downloadMode === 'audio' ? '#FFFFFF' : colors.sub },
                  ]}>
                    Audio
                  </Text>
                </Pressable>
              </View>

              {/* Bộ chọn chất lượng video (Tốt nhất / 1080p / 720p / 480p / 360p) - VIỆC 3 */}
              {downloadMode === 'video' && (
                <View style={styles.qualitySection}>
                  <Text style={[styles.qualityLabel, { color: colors.sub }]}>Chất lượng video:</Text>
                  <View style={styles.qualityChipsRow}>
                    {QUALITY_OPTIONS.map((opt) => {
                      const isSel = selectedQuality === opt.id;
                      return (
                        <Pressable
                          key={opt.id}
                          onPress={() => setSelectedQuality(opt.id)}
                          disabled={loading}
                          style={[
                            styles.qualityChip,
                            {
                              backgroundColor: isSel ? '#FF2D55' : colors.cardElevated,
                              borderColor: isSel ? '#FF2D55' : colors.cardBorder,
                            },
                          ]}
                        >
                          <Text style={[styles.qualityChipText, { color: isSel ? '#FFFFFF' : colors.sub }]}>
                            {opt.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

            {/* Thanh tiến trình */}
            {loading && (
              <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.progressHeader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.progressText, { color: colors.text }]}>{statusText}</Text>
                </View>
                <View style={[styles.progressBarBg, { backgroundColor: colors.bg }]}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      { width: progressWidth, backgroundColor: '#FF2D55' },
                    ]}
                  />
                </View>
                {progress > 0 && (
                  <Text style={[styles.progressPercent, { color: colors.sub }]}>
                    {Math.round(progress * 100)}%
                  </Text>
                )}
              </View>
            )}

            {/* Nút Tải / Hủy Tải */}
            {loading ? (
              <View style={styles.loadingActionRow}>
                <View style={[styles.downloadBtnLoading, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}>
                  <ActivityIndicator size="small" color="#FF2D55" />
                  <Text style={[styles.downloadBtnLoadingText, { color: colors.text }]} numberOfLines={1}>
                    {statusText || labels.buttonLoading}
                  </Text>
                </View>

                <Pressable
                  onPress={handleCancelDownload}
                  style={styles.cancelDownloadBtn}
                >
                  <Ionicons name="close-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.cancelDownloadBtnText}>{labels.cancelBtn}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleDownload}
                disabled={!url.trim()}
                style={[
                  styles.downloadBtn,
                  {
                    backgroundColor: !url.trim() ? colors.cardElevated : '#FF2D55',
                    opacity: !url.trim() ? 0.5 : 1,
                  },
                ]}
              >
                <Ionicons name="download" size={22} color="#FFFFFF" />
                <Text style={styles.downloadBtnText}>
                  {labels.buttonIdle}
                </Text>
              </Pressable>
            )}

            {/* Tiêu đề lịch sử */}
            {history.length > 0 && (
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: colors.text }]}>{t('snapVideo.historyTitle') || 'Đã tải gần đây'}</Text>
                <Pressable
                  onPress={() => setHistory([])}
                  hitSlop={8}
                >
                  <Text style={[styles.historyClear, { color: colors.danger }]}>{t('snapVideo.clearHistory') || 'Xóa'}</Text>
                </Pressable>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name={labels.isAudio ? 'musical-notes-outline' : 'film-outline'} size={48} color={colors.sub} />
              <Text style={[styles.emptyText, { color: colors.sub }]}>
                {labels.emptyHistory}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Hero card
  heroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  heroDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },

  // Platform chips
  platformList: {
    paddingBottom: 16,
    gap: 8,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  platformChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Input card
  inputCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 50,
  },
  inputPlatformIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },

  // Paste button
  pasteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    gap: 8,
  },
  pasteBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Mode selector
  modeRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Quality Selector (VIỆC 3)
  qualitySection: {
    marginTop: 12,
  },
  qualityLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  qualityChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  qualityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  qualityChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Progress
  progressCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 6,
  },

  // Download button
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 20,
    gap: 10,
  },
  downloadBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  downloadBtnLoading: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    paddingHorizontal: 12,
  },
  downloadBtnLoadingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  cancelDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: 16,
    gap: 6,
  },
  cancelDownloadBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  historyClear: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  historyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyPlatform: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  historyQualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '100%',
  },
  historyQualityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    flexShrink: 1,
  },
  historyUrl: {
    fontSize: 12,
    fontWeight: '500',
  },
  historyDetailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  historyTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyDuration: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Empty state
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});


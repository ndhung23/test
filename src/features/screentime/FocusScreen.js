import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const FAVICON_ICON = require('../../../assets/favicon1.png');

const CATEGORIES = [
  { id: 'work', label: 'Làm việc', icon: '💼' },
  { id: 'study', label: 'Học tập', icon: '🎓' },
  { id: 'read', label: 'Đọc sách', icon: '📖' },
  { id: 'write', label: 'Viết', icon: '✍️' },
  { id: 'workout', label: 'Tập luyện', icon: '🏃' },
  { id: 'create', label: 'Sáng tạo', icon: '🎨' },
];

const DURATIONS = [
  { id: '10', label: '10 phút', minutes: 10 },
  { id: '20', label: '20 phút', minutes: 20 },
  { id: '30', label: '30 phút', minutes: 30 },
  { id: '60', label: '60 phút', minutes: 60 },
  { id: 'custom', label: 'Tùy chỉnh', minutes: 0 },
];

export default function FocusScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  // Trạng thái chọn danh mục & thời lượng
  const [selectedCategory, setSelectedCategory] = useState('work');
  const [selectedDurationId, setSelectedDurationId] = useState('30');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Trạng thái Timer đang chạy
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [totalTime, setTotalTime] = useState(30 * 60);

  // Modal tùy chỉnh thời gian
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customInput, setCustomInput] = useState('25');

  const timerRef = useRef(null);

  // Đếm ngược
  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsActive(false);
            Alert.alert('Hoàn thành! 🎉', 'Bạn đã hoàn thành xuất sắc phiên tập trung này!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, timeLeft]);

  const handleSelectDuration = (item) => {
    if (item.id === 'custom') {
      setCustomModalVisible(true);
    } else {
      setSelectedDurationId(item.id);
      setTimeLeft(item.minutes * 60);
      setTotalTime(item.minutes * 60);
    }
  };

  const handleApplyCustom = () => {
    const mins = parseInt(customInput, 10);
    if (isNaN(mins) || mins <= 0 || mins > 240) {
      Alert.alert('Lỗi', 'Vui lòng nhập số phút từ 1 đến 240.');
      return;
    }
    setSelectedDurationId('custom');
    setTimeLeft(mins * 60);
    setTotalTime(mins * 60);
    setCustomModalVisible(false);
  };

  const startFocusSession = () => {
    let secs = timeLeft;
    if (selectedDurationId !== 'custom') {
      const d = DURATIONS.find((x) => x.id === selectedDurationId);
      secs = (d ? d.minutes : 30) * 60;
    }
    setTimeLeft(secs);
    setTotalTime(secs);
    setIsActive(true);
    setIsPaused(false);
  };

  const stopFocusSession = () => {
    Alert.alert('Kết thúc phiên?', 'Bạn có chắc muốn dừng phiên tập trung này không?', [
      { text: 'Tiếp tục', style: 'cancel' },
      {
        text: 'Dừng',
        style: 'destructive',
        onPress: () => {
          setIsActive(false);
          setIsPaused(false);
        },
      },
    ]);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentCatObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* 1. Header chuẩn ảnh 2: "Phiên tập trung" + Loa + Settings */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>{t('statsScreen.focusTitle') || 'Phiên tập trung'}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setSoundEnabled(!soundEnabled)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons
              name={soundEnabled ? 'volume-high' : 'volume-mute'}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* NẾU ĐANG CHẠY PHIÊN TẬP TRUNG */}
      {isActive ? (
        <View style={styles.activeContainer}>
          <View style={[styles.activeMascotBadge, { backgroundColor: 'rgba(255, 208, 0, 0.1)' }]}>
            <Image source={FAVICON_ICON} style={styles.activeMascotImg} resizeMode="contain" />
          </View>

          <Text style={[styles.activeCatBadge, { color: colors.primary }]}>
            {currentCatObj.icon} {currentCatObj.label}
          </Text>

          <View style={[styles.activeTimerCircle, { borderColor: colors.primary }]}>
            <Text style={styles.activeTimerText}>{formatTime(timeLeft)}</Text>
            <Text style={[styles.activeTimerSub, { color: colors.sub }]}>
              {isPaused ? (t('common.pause') || 'Đang tạm dừng') : 'Giữ tập trung cao độ'}
            </Text>
          </View>

          <View style={styles.activeControls}>
            <Pressable
              onPress={() => setIsPaused(!isPaused)}
              style={[styles.pauseBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name={isPaused ? 'play' : 'pause'} size={24} color="#FFFFFF" />
              <Text style={styles.pauseBtnText}>{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</Text>
            </Pressable>

            <Pressable
              onPress={stopFocusSession}
              style={[styles.stopBtn, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="stop" size={22} color="#FFFFFF" />
              <Text style={styles.stopBtnText}>Kết thúc</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* NẾU CHƯA CHẠY: HIỂN THỊ GIAO DIỆN CHUẨN ẢNH 2 */
        <FlatList
          data={[]}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* 2. Mục: Danh mục */}
          <Text style={[styles.sectionLabel, { color: colors.subLight || '#CCCCCC' }]}>
            Danh mục
          </Text>

          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => setSelectedCategory(cat.id)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: isSelected ? 'rgba(255, 208, 0, 0.08)' : colors.card,
                      borderColor: isSelected ? colors.primary : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <Text style={styles.categoryEmoji}>{cat.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? colors.primary : '#FFFFFF' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* 3. Mục: Thời lượng */}
          <Text style={[styles.sectionLabel, { color: colors.subLight || '#CCCCCC', marginTop: 24 }]}>
            Thời lượng
          </Text>

          {/* Container chứa các nút thời lượng + Watermark ẩn phía sau */}
          <View style={styles.durationSectionWrapper}>
            {/* Watermark logo mờ phía sau */}
            <View style={styles.watermarkContainer} pointerEvents="none">
              <MaterialCommunityIcons
                name="target"
                size={220}
                color="rgba(255, 208, 0, 0.05)"
              />
            </View>

            <View style={styles.durationGrid}>
              {DURATIONS.map((dur) => {
                const isSelected = selectedDurationId === dur.id;
                return (
                  <Pressable
                    key={dur.id}
                    onPress={() => handleSelectDuration(dur)}
                    style={[
                      styles.durationPill,
                      {
                        backgroundColor: colors.cardElevated || '#2A2A30',
                        borderColor: isSelected ? colors.primary : 'transparent',
                        borderWidth: isSelected ? 2 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        { color: isSelected ? colors.primary : '#FFFFFF' },
                      ]}
                    >
                      {dur.id === 'custom' && selectedDurationId === 'custom'
                        ? `${Math.round(totalTime / 60)} phút`
                        : dur.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* 4. Nút bấm chính "▶ Bắt đầu tập trung" */}
          <Pressable
            onPress={startFocusSession}
            style={({ pressed }) => [
              styles.startMainBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            <Ionicons name="play" size={20} color="#121214" style={{ marginRight: 8 }} />
            <Text style={styles.startMainBtnText}>Bắt đầu tập trung</Text>
          </Pressable>

          {/* Khoảng trống để không bị Floating Tab Bar che */}
          <View style={{ height: 100 }} />
            </>
          }
          style={{ flex: 1 }}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal chỉnh thời gian tùy chỉnh */}
      <Modal visible={customModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Tùy chỉnh thời gian</Text>
            <Text style={[styles.modalDesc, { color: colors.sub }]}>
              Nhập số phút bạn muốn tập trung (1 - 240 phút)
            </Text>

            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              keyboardType="number-pad"
              maxLength={3}
              style={[
                styles.customInputBox,
                { color: colors.text, borderColor: colors.primary, backgroundColor: colors.bg },
              ]}
              autoFocus
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setCustomModalVisible(false)}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.sub, fontWeight: '700' }}>Hủy</Text>
              </Pressable>
              <Pressable
                onPress={handleApplyCustom}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#121214', fontWeight: '800' }}>Áp dụng</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  categoryCard: {
    width: '31.5%',
    height: 104,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  categoryEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  durationSectionWrapper: {
    position: 'relative',
    minHeight: 140,
    justifyContent: 'center',
  },
  watermarkContainer: {
    position: 'absolute',
    alignSelf: 'center',
    top: -20,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 6,
  },
  durationPill: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 999,
  },
  durationText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  startMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 999,
    marginTop: 34,
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  startMainBtnText: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#121214',
  },

  // Active Timer View
  activeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  activeMascotBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
  },
  activeMascotImg: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
  },
  activeCatBadge: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 24,
  },
  activeTimerCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  activeTimerText: {
    fontSize: 54,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  activeTimerSub: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 6,
  },
  activeControls: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  pauseBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    borderWidth: 1,
    gap: 8,
  },
  pauseBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  stopBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 999,
    gap: 8,
  },
  stopBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  customInputBox: {
    width: '60%',
    borderWidth: 2,
    borderRadius: 16,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 10,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 999,
    alignItems: 'center',
  },
});

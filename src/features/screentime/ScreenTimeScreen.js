// src/screens/main/ScreenTimeScreen.js
// Quản lý kiểm soát thời gian sử dụng điện thoại, tùy chỉnh số phút cảnh báo & phát Alert

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Switch,
  StyleSheet,
  TextInput,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useScreenTime } from './ScreenTimeContext';

const PRESET_INTERVALS = [30, 60, 90, 120, 180, 240];

const APPS_USAGE = [
  { id: 'fb', name: 'Facebook', usedMinutes: 65, limitMinutes: 90, icon: 'logo-facebook', color: '#1877F2' },
  { id: 'tt', name: 'TikTok', usedMinutes: 45, limitMinutes: 60, icon: 'videocam', color: '#010101' },
  { id: 'yt', name: 'YouTube', usedMinutes: 30, limitMinutes: 60, icon: 'logo-youtube', color: '#FF0000' },
  { id: 'game', name: 'Trò chơi & Game', usedMinutes: 20, limitMinutes: 45, icon: 'game-controller', color: '#10B981' },
  { id: 'web', name: 'Trình duyệt Web', usedMinutes: 15, limitMinutes: 30, icon: 'globe-outline', color: '#06B6D4' },
];

export default function ScreenTimeScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, isVietnamese } = useLanguage();

  const {
    alertLimitMinutes,
    alertEnabled,
    sessionSeconds,
    sessionMinutes,
    totalTodayMinutes,
    updateLimitMinutes,
    toggleAlertEnabled,
    resetSession,
    triggerTestAlert,
    triggerTestNotification,
  } = useScreenTime();

  // State cho ô nhập số phút cảnh báo tùy ý
  const [inputMinutes, setInputMinutes] = useState(String(alertLimitMinutes));
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setInputMinutes(String(alertLimitMinutes));
  }, [alertLimitMinutes]);

  // Format thời gian phiên hiện tại dạng 00h 00m 00s
  const formatSessionTime = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(mins)}m ${pad(secs)}s`;
  };

  // Tính phần trăm phiên dùng máy so với ngưỡng cảnh báo
  const limit = Math.max(1, alertLimitMinutes);
  const progressPercent = Math.min(100, Math.round((sessionMinutes / limit) * 100));

  // Trạng thái an toàn hay cảnh báo
  const getStatusInfo = () => {
    if (progressPercent >= 100) {
      return {
        label: isVietnamese ? 'Đã vượt ngưỡng cảnh báo!' : 'Exceeded warning limit!',
        color: '#EF4444',
        bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
        icon: 'warning',
      };
    }
    if (progressPercent >= 75) {
      return {
        label: isVietnamese ? 'Sắp đạt giới hạn sử dụng' : 'Approaching limit',
        color: '#F59E0B',
        bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
        icon: 'alert-circle',
      };
    }
    return {
      label: isVietnamese ? 'Trạng thái ổn định' : 'Safe status',
      color: '#10B981',
      bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
      icon: 'shield-checkmark',
    };
  };

  const status = getStatusInfo();

  // Xử lý lưu số phút cảnh báo mới
  const handleSaveMinutes = async (valToSave) => {
    const value = valToSave !== undefined ? valToSave : inputMinutes;
    const mins = parseInt(String(value).trim(), 10);

    if (isNaN(mins) || mins <= 0) {
      Alert.alert(
        isVietnamese ? 'Số phút không hợp lệ' : 'Invalid duration',
        isVietnamese ? 'Vui lòng nhập một số phút lớn hơn 0 (ví dụ: 180).' : 'Please enter a valid number of minutes (e.g. 180).'
      );
      return;
    }

    const success = await updateLimitMinutes(mins);
    if (success) {
      setInputMinutes(String(mins));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      Alert.alert(
        isVietnamese ? 'Đã cài đặt cảnh báo' : 'Alert Limit Set',
        isVietnamese
          ? `ToolKit sẽ bật hộp thoại Alert cảnh báo khi bạn dùng điện thoại liên tục đủ ${mins} phút (${(mins / 60).toFixed(1)} giờ).`
          : `ToolKit will alert you after ${mins} minutes of continuous screen usage.`
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title={isVietnamese ? 'Thời gian sử dụng' : 'Screen Time'}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Card 1: Đồng hồ phiên sử dụng hiện tại */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardLabel, { color: colors.sub }]}>
              {isVietnamese ? 'PHIÊN DÙNG MÁY LIÊN TỤC' : 'CURRENT SESSION'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
              <Ionicons name={status.icon} size={14} color={status.color} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <Text style={[styles.bigTimerText, { color: colors.primary }]}>
            {formatSessionTime(sessionSeconds)}
          </Text>

          {/* Thanh đo tiến trình tới ngưỡng cảnh báo */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={[styles.progressSubText, { color: colors.sub }]}>
                {isVietnamese ? `Tiến độ: ${sessionMinutes}/${alertLimitMinutes} phút` : `Progress: ${sessionMinutes}/${alertLimitMinutes} min`}
              </Text>
              <Text style={[styles.progressPercentText, { color: status.color }]}>
                {progressPercent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: isDark ? '#2D2D36' : '#E5E7EB' }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${progressPercent}%`,
                    backgroundColor: status.color,
                  },
                ]}
              />
            </View>
          </View>

          {/* Nút đặt lại phiên */}
          <View style={styles.sessionActionRow}>
            <Pressable
              onPress={resetSession}
              style={[styles.smallActionBtn, { borderColor: colors.cardBorder }]}
            >
              <Ionicons name="refresh-outline" size={15} color={colors.sub} />
              <Text style={[styles.smallActionText, { color: colors.sub }]}>
                {isVietnamese ? 'Đặt lại phiên dùng' : 'Reset session'}
              </Text>
            </Pressable>

            <Text style={[styles.todayTotalSub, { color: colors.sub }]}>
              {isVietnamese ? 'Hôm nay: ' : 'Today: '}
              <Text style={{ fontWeight: '700', color: colors.text }}>
                {Math.floor(totalTodayMinutes / 60)}h {totalTodayMinutes % 60}p
              </Text>
            </Text>
          </View>
        </View>

        {/* Card 2: Cài đặt số phút cảnh báo & Kiểm tra Alert */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.remindHeader}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                {isVietnamese ? 'Cảnh báo thời gian sử dụng' : 'Usage Time Alert'}
              </Text>
              <Text style={[styles.remindDesc, { color: colors.sub }]}>
                {isVietnamese
                  ? 'Bật Alert toàn màn hình nhắc nhở cho mắt nghỉ ngơi khi dùng máy quá lâu.'
                  : 'Trigger alert modal to rest eyes when screen time exceeds limit.'}
              </Text>
            </View>
            <Switch
              value={alertEnabled}
              onValueChange={toggleAlertEnabled}
              trackColor={{ false: '#3A3A42', true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {alertEnabled && (
            <View style={styles.configBody}>
              <View style={styles.divider} />

              <Text style={[styles.inputHeading, { color: colors.text }]}>
                {isVietnamese ? 'Nhập số phút cảnh báo mong muốn:' : 'Set warning limit (minutes):'}
              </Text>

              {/* Ô nhập số phút tùy chỉnh */}
              <View style={styles.inputRow}>
                <View style={[styles.inputBox, { backgroundColor: isDark ? '#1C1C20' : '#F9FAFB', borderColor: colors.cardBorder }]}>
                  <Ionicons name="timer-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={inputMinutes}
                    onChangeText={setInputMinutes}
                    keyboardType="number-pad"
                    placeholder="ví dụ: 180"
                    placeholderTextColor={colors.sub}
                    maxLength={4}
                  />
                  <Text style={[styles.unitText, { color: colors.sub }]}>
                    {isVietnamese ? 'phút' : 'mins'}
                  </Text>
                </View>

                <Pressable
                  onPress={() => handleSaveMinutes()}
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.primaryText || '#121214'} />
                  <Text style={[styles.saveBtnText, { color: colors.primaryText || '#121214' }]}>
                    {isVietnamese ? 'Lưu' : 'Save'}
                  </Text>
                </Pressable>
              </View>

              {/* Phím tắt số phút phổ biến (30p, 60p, 90p, 120p, 180p, 240p) */}
              <Text style={[styles.presetsTitle, { color: colors.sub }]}>
                {isVietnamese ? 'Hoặc chọn nhanh:' : 'Quick presets:'}
              </Text>
              <View style={styles.presetsGrid}>
                {PRESET_INTERVALS.map((mins) => {
                  const isSelected = alertLimitMinutes === mins;
                  return (
                    <Pressable
                      key={mins}
                      onPress={() => {
                        setInputMinutes(String(mins));
                        handleSaveMinutes(mins);
                      }}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? 'rgba(255, 208, 0, 0.15)' : isDark ? '#1C1C20' : '#F3F4F6',
                          borderColor: isSelected ? colors.primary : colors.cardBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: isSelected ? colors.primary : colors.text },
                        ]}
                      >
                        {mins} {isVietnamese ? 'phút' : 'm'}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Nút kiểm tra cảnh báo Alert ngay lập tức */}
              <View style={styles.testBtnGroup}>
                <Pressable
                  onPress={triggerTestAlert}
                  style={[styles.testAlertBtn, { backgroundColor: isDark ? '#27272A' : '#FEF3C7', borderColor: colors.primary }]}
                >
                  <Ionicons name="alert-circle-outline" size={18} color={colors.primary} />
                  <Text style={[styles.testAlertBtnText, { color: colors.primary }]}>
                    {isVietnamese ? '⚠️ Thử nghiệm hộp thoại Alert (Trong app)' : '⚠️ Test In-App Alert Popup'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => triggerTestNotification(3)}
                  style={[styles.testAlertBtn, { backgroundColor: isDark ? '#1E293B' : '#E0F2FE', borderColor: '#0284C7', marginTop: 8 }]}
                >
                  <Ionicons name="notifications-outline" size={18} color="#0284C7" />
                  <Text style={[styles.testAlertBtnText, { color: '#0284C7' }]}>
                    {isVietnamese ? '🦉 Thử nghiệm thông báo đẩy (Khi tắt app - 3s)' : '🦉 Test Push Notification (3s)'}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.duoHintBox, { backgroundColor: isDark ? '#1C1C20' : '#F9FAFB', borderColor: colors.cardBorder }]}>
                <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                <Text style={[styles.duoHintText, { color: colors.sub }]}>
                  {isVietnamese
                    ? 'ToolKit theo dõi phiên sử dụng liên tục khi bạn mở ứng dụng và sẽ cảnh báo nghỉ ngơi khi đạt ngưỡng. Khi bạn tắt ứng dụng hoặc khóa máy trên 5 phút, phiên sử dụng sẽ tự động đặt lại để không bắn thông báo làm phiền khi bạn không dùng máy.'
                    : 'ToolKit monitors active continuous screen sessions and alerts you to rest when the limit is reached. When you close the app or lock the screen for over 5 minutes, the session automatically resets to avoid disturbing you.'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Card 3: Chi tiết thời gian ứng dụng hôm nay */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {isVietnamese ? 'Chi tiết ứng dụng hôm nay' : 'App Breakdown Today'}
        </Text>

        {APPS_USAGE.map((app) => {
          const appPercent = Math.min(100, Math.round((app.usedMinutes / app.limitMinutes) * 100));
          return (
            <View
              key={app.id}
              style={[styles.appItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={[styles.appIconBox, { backgroundColor: app.color + '22' }]}>
                <Ionicons name={app.icon} size={22} color={app.color} />
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={styles.appTitleRow}>
                  <Text style={[styles.appName, { color: colors.text }]}>{app.id === 'game' ? (isVietnamese ? 'Trò chơi & Game' : 'Games') : app.id === 'web' ? (isVietnamese ? 'Trình duyệt Web' : 'Web Browser') : app.name}</Text>
                  <Text style={[styles.appDuration, { color: colors.sub }]}>
                    {app.usedMinutes}p / {app.limitMinutes}p
                  </Text>
                </View>

                <View style={[styles.appProgressBar, { backgroundColor: isDark ? '#35353E' : '#E5E7EB' }]}>
                  <View
                    style={[
                      styles.appProgressFill,
                      {
                        width: `${appPercent}%`,
                        backgroundColor: appPercent > 85 ? '#EF4444' : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          );
        })}
          </>
        }
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bigTimerText: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  progressContainer: {
    marginTop: 10,
    marginBottom: 8,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sessionActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  smallActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayTotalSub: {
    fontSize: 12,
  },
  remindHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  remindDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(150, 150, 150, 0.15)',
    marginVertical: 14,
  },
  configBody: {
    marginTop: 4,
  },
  inputHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    paddingVertical: 0,
  },
  unitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 12,
    gap: 5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  presetsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  testAlertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  testAlertBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
    marginTop: 4,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  appIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  appName: {
    fontSize: 14,
    fontWeight: '700',
  },
  appDuration: {
    fontSize: 12,
    fontWeight: '600',
  },
  appProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  appProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  testBtnGroup: {
    marginTop: 4,
    marginBottom: 12,
  },
  duoHintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  duoHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
});

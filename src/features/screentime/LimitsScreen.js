import { useState } from 'react';
import { View, Text, FlatList, Pressable, Switch, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

const INITIAL_APPS = [
  { id: 'momo', name: 'MoMo', iconBg: '#A50064', used: 5, limit: 30, enabled: true },
  { id: 'tiktok', name: 'TikTok', iconBg: '#010101', used: 22, limit: 30, enabled: true },
  { id: 'facebook', name: 'Facebook', iconBg: '#1877F2', used: 15, limit: 40, enabled: true },
  { id: 'youtube', name: 'YouTube', iconBg: '#FF0000', used: 10, limit: 45, enabled: false },
  { id: 'instagram', name: 'Instagram', iconBg: '#E1306C', used: 8, limit: 30, enabled: true },
];

export default function LimitsScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [apps, setApps] = useState(INITIAL_APPS);
  const [strictMode, setStrictMode] = useState(true);

  const toggleApp = (id) => {
    setApps((prev) =>
      prev.map((app) => (app.id === id ? { ...app, enabled: !app.enabled } : app))
    );
  };

  const addLimit = () => {
    Alert.alert('Thêm giới hạn', 'Chọn ứng dụng bạn muốn hạn chế thời gian sử dụng để giữ tập trung.');
  };

  const totalUsed = apps.reduce((sum, a) => sum + (a.enabled ? a.used : 0), 0);
  const totalLimit = apps.reduce((sum, a) => sum + (a.enabled ? a.limit : 0), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Giới hạn ứng dụng</Text>
        <Pressable
          onPress={() => navigation.navigate('Settings')}
          style={styles.iconButton}
          hitSlop={8}
        >
          <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Banner Tổng quan */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.summaryTop}>
            <View style={[styles.shieldIconWrapper, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
              <Ionicons name="shield-checkmark" size={26} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.summaryStatus}>Đang kích hoạt bảo vệ</Text>
              <Text style={[styles.summarySubtitle, { color: colors.sub }]}>
                {apps.filter((a) => a.enabled).length} ứng dụng đang được giám sát
              </Text>
            </View>
          </View>

          {/* Thanh thời gian sử dụng hôm nay */}
          <View style={styles.timeRow}>
            <Text style={[styles.timeLabel, { color: colors.sub }]}>Thời gian đã dùng hôm nay</Text>
            <Text style={[styles.timeValue, { color: colors.primary }]}>
              {totalUsed}p <Text style={{ color: colors.sub }}>/ {totalLimit}p</Text>
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(100, (totalUsed / totalLimit) * 100)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Chế độ chặn nghiêm ngặt */}
        <View style={[styles.strictCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.strictTitle}>Khóa nghiêm ngặt</Text>
            <Text style={[styles.strictDesc, { color: colors.sub }]}>
              Tự động chặn truy cập ngay khi hết thời lượng cho phép
            </Text>
          </View>
          <Switch
            value={strictMode}
            onValueChange={setStrictMode}
            trackColor={{ false: '#3A3A42', true: colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {/* Danh sách ứng dụng */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Danh sách giới hạn</Text>
          <Pressable onPress={addLimit}>
            <Text style={[styles.addText, { color: colors.primary }]}>+ Thêm app</Text>
          </Pressable>
        </View>

        {apps.map((app) => {
          const percent = Math.min(100, Math.round((app.used / app.limit) * 100));
          const isOver = app.used >= app.limit;
          return (
            <View
              key={app.id}
              style={[styles.appRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={[styles.appIcon, { backgroundColor: app.iconBg }]}>
                <Text style={styles.appIconText}>{app.name.slice(0, 2).toUpperCase()}</Text>
              </View>

              <View style={{ flex: 1, marginHorizontal: 12 }}>
                <View style={styles.appTitleRow}>
                  <Text style={styles.appName}>{app.name}</Text>
                  <Text style={[styles.appTime, { color: isOver ? colors.danger : colors.sub }]}>
                    {app.used}p / {app.limit}p
                  </Text>
                </View>

                {/* Progress bar của từng app */}
                <View style={styles.miniProgressTrack}>
                  <View
                    style={[
                      styles.miniProgressFill,
                      {
                        width: `${percent}%`,
                        backgroundColor: isOver ? colors.danger : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              <Switch
                value={app.enabled}
                onValueChange={() => toggleApp(app.id)}
                trackColor={{ false: '#3A3A42', true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          );
        })}

        <View style={{ height: 100 }} />
          </>
        }
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
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
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  summaryCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  shieldIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatus: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  summarySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#35353E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  strictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  strictTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  strictDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  addText: {
    fontSize: 14,
    fontWeight: '700',
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  appTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  appName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  appTime: {
    fontSize: 13,
    fontWeight: '600',
  },
  miniProgressTrack: {
    height: 4,
    backgroundColor: '#35353E',
    borderRadius: 2,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
});

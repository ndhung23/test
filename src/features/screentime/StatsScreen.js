import { View, Text, FlatList, Image, Pressable, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../auth';
import { Row, ScreenHeader, RoleBadge } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';

const FAVICON_ICON = require('../../../assets/favicon1.png');

const WEEK_DATA = [
  { day: 'T2', hours: 2.5, percent: 50 },
  { day: 'T3', hours: 3.8, percent: 76 },
  { day: 'T4', hours: 4.2, percent: 84 },
  { day: 'T5', hours: 5.0, percent: 100, active: true },
  { day: 'T6', hours: 3.5, percent: 70 },
  { day: 'T7', hours: 2.0, percent: 40 },
  { day: 'CN', hours: 1.5, percent: 30 },
];

export default function StatsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { t, isVietnamese } = useLanguage();

  const confirmLogout = () =>
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
      { text: t('settings.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: signOut },
    ]);

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header né tai thỏ */}
      <ScreenHeader
        title={t('statsScreen.title')}
        rightAction={
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
          </Pressable>
        }
      />

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Profile Card with favicon1.png */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.avatarCircle, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
            <Image source={FAVICON_ICON} style={styles.avatarImg} resizeMode="contain" />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={styles.userName}>{user?.name || t('statsScreen.userFallback')}</Text>
              <RoleBadge role={user?.role} />
            </View>
            <Text style={[styles.userEmail, { color: colors.sub }]}>{user?.email || 'user@example.com'}</Text>
          </View>
        </View>


        {/* Biểu đồ tập trung hàng tuần */}
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>{t('statsScreen.focusTitle')}</Text>
              <Text style={[styles.chartSub, { color: colors.sub }]}>{t('statsScreen.focusSub')}</Text>
            </View>
            <View style={[styles.badgeTrend, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="trending-up" size={14} color="#10B981" />
              <Text style={styles.badgeTrendText}>{t('statsScreen.trend')}</Text>
            </View>
          </View>

          {/* Các cột bar chart */}
          <View style={styles.barsContainer}>
            {WEEK_DATA.map((item, idx) => (
              <View key={idx} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${item.percent}%`,
                        backgroundColor: item.active ? colors.primary : '#383842',
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.barDayText,
                    { color: item.active ? colors.primary : colors.sub },
                  ]}
                >
                  {t(`statsScreen.days.${dayKeys[idx]}`) || item.day}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Các chỉ số chính */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>100</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>{t('statsScreen.healthScore')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statNum, { color: colors.primary }]}>22.5h</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>{t('statsScreen.weeklyFocus')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statNum, { color: '#F59E0B' }]}>{t('statsScreen.streakDays', { count: 5 })}</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>{t('statsScreen.streak')}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statNum, { color: '#10B981' }]}>100%</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]}>{t('statsScreen.goalAchieved')}</Text>
          </View>
        </View>

        {/* Cài đặt tài khoản & Đăng xuất */}
        <View
          style={[
            styles.settingsGroup,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Row
            icon="settings-outline"
            label={t('statsScreen.systemSettings')}
            onPress={() => navigation.navigate('Settings')}
          />
          <Row
            icon="document-text-outline"
            label={t('statsScreen.imageToPdf')}
            onPress={() => navigation.navigate('ImageToPdf')}
          />
          <Row
            icon="log-out-outline"
            label={t('statsScreen.logout')}
            onPress={confirmLogout}
            danger
          />
        </View>

        <View style={{ height: 100 }} />
          </>
        }
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
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
    paddingBottom: 14,
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  proBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  proText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#121214',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  chartCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  chartSub: {
    fontSize: 12.5,
    marginTop: 2,
  },
  badgeTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeTrendText: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 12,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 10,
  },
  barCol: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    width: 14,
    height: 90,
    backgroundColor: '#2F2F38',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 7,
  },
  barDayText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 18,
  },
  statBox: {
    width: '48%',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  settingsGroup: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
});

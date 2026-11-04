import { View, Text, FlatList, Image, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Row, ScreenHeader, RoleBadge } from '../../components/ui';
import { useTheme } from '../../theme';
import { useAuth } from '../auth';
import { useLanguage } from '../../context/LanguageContext';
import { ROLES } from '../../constants/roles';

const FAVICON_ICON = require('../../../assets/favicon1.png');

export default function SettingsScreen({ navigation }) {
  const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const { language, setLanguage, toggleLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`${t('settings.logoutConfirmTitle')}\n${t('settings.logoutConfirmMsg')}`)
        : true;
      if (ok) {
        signOut();
      }
      return;
    }

    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMsg'), [
      { text: t('settings.cancel'), style: 'cancel' },
      { text: t('settings.logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScreenHeader
        title={t('settings.title')}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Logo & App Info */}
        <View style={styles.appBadgeContainer}>
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: isDark ? 'rgba(255, 208, 0, 0.12)' : 'rgba(217, 119, 6, 0.12)',
                borderColor: isDark ? 'rgba(255, 208, 0, 0.25)' : 'rgba(217, 119, 6, 0.25)',
              },
            ]}
          >
            <Image source={FAVICON_ICON} style={styles.logoImg} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>ToolKit ✨</Text>
          <Text style={[styles.versionText, { color: colors.sub }]}>
            {t('settings.subtitle')}
          </Text>
        </View>

        {/* Thông tin tài khoản & Vai trò hiện tại */}
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.accountHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.accountName, { color: colors.text }]}>
                {user?.name || t('settings.guest')}
              </Text>
              <Text style={[styles.accountEmail, { color: colors.sub }]}>
                {user?.email || t('settings.notLoggedIn')}
              </Text>
            </View>
            {user ? (
              <RoleBadge role={user?.role} />
            ) : (
              <Pressable
                onPress={() => navigation?.navigate('Login')}
                style={[styles.loginBtnPill, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.loginBtnPillText, { color: colors.primaryText }]}>
                  {t('settings.login')}
                </Text>
              </Pressable>
            )}
          </View>

          {!user ? (
            <Row
              icon="person-add-outline"
              label={t('settings.register')}
              value={t('settings.registerBtn')}
              onPress={() => navigation?.navigate('Register')}
            />
          ) : user?.role === ROLES.ADMIN ? (
            <Row
              icon="shield-checkmark"
              label={t('settings.adminPanel')}
              value={t('settings.openNow')}
              onPress={() => {
                try {
                  navigation.navigate('AdminScreen');
                } catch {
                  navigation.navigate('DrawerAdmin');
                }
              }}
            />
          ) : (
            <View style={styles.roleNoteBox}>
              <Ionicons name="information-circle-outline" size={16} color={colors.sub} />
              <Text style={[styles.roleNoteText, { color: colors.sub }]}>
                {t('settings.roleNote')}
              </Text>
            </View>
          )}

          {user && (
            <Row
              icon="log-out-outline"
              label={t('settings.logout')}
              danger
              onPress={confirmLogout}
            />
          )}
        </View>

        {/* Cấu hình Giao diện (Sáng / Tối) & Ngôn ngữ (Tiếng Việt / English) */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          {t('settings.sectionPreferences')}
        </Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {/* Chuyển đổi Theme Sáng / Tối */}
          <View style={[styles.preferenceItem, { borderBottomColor: colors.border }]}>
            <View style={styles.preferenceItemHeader}>
              <View style={styles.preferenceItemLeft}>
                <Ionicons
                  name={isDark ? 'moon' : 'sunny'}
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <View>
                  <Text style={[styles.preferenceTitle, { color: colors.text }]}>
                    {t('settings.theme')}
                  </Text>
                  <Text style={[styles.preferenceSubtitle, { color: colors.sub }]}>
                    {isDark ? t('settings.darkThemeDesc') : t('settings.lightThemeDesc')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Segmented Switch cho Theme */}
            <View style={[styles.segmentedWrapper, { backgroundColor: isDark ? '#1C1C20' : '#E5E7EB' }]}>
              <Pressable
                onPress={() => setThemeMode('dark')}
                style={[
                  styles.segmentBtn,
                  isDark && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: isDark ? colors.cardElevated : '#FFFFFF',
                      borderColor: colors.primary,
                    },
                  ],
                ]}
              >
                <Ionicons
                  name="moon"
                  size={14}
                  color={isDark ? colors.primary : colors.sub}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color: isDark ? colors.text : colors.sub,
                      fontWeight: isDark ? '800' : '600',
                    },
                  ]}
                >
                  {t('settings.darkTheme')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setThemeMode('light')}
                style={[
                  styles.segmentBtn,
                  !isDark && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: isDark ? colors.cardElevated : '#FFFFFF',
                      borderColor: colors.primary,
                    },
                  ],
                ]}
              >
                <Ionicons
                  name="sunny"
                  size={14}
                  color={!isDark ? colors.primary : colors.sub}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color: !isDark ? colors.text : colors.sub,
                      fontWeight: !isDark ? '800' : '600',
                    },
                  ]}
                >
                  {t('settings.lightTheme')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Chuyển đổi Ngôn ngữ Tiếng Việt / Tiếng Anh */}
          <View style={styles.preferenceItem}>
            <View style={styles.preferenceItemHeader}>
              <View style={styles.preferenceItemLeft}>
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <View>
                  <Text style={[styles.preferenceTitle, { color: colors.text }]}>
                    {t('settings.language')}
                  </Text>
                  <Text style={[styles.preferenceSubtitle, { color: colors.sub }]}>
                    {language === 'vi' ? t('settings.langSelectedVi') : t('settings.langSelectedEn')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Segmented Switch cho Ngôn ngữ */}
            <View style={[styles.segmentedWrapper, { backgroundColor: isDark ? '#1C1C20' : '#E5E7EB' }]}>
              <Pressable
                onPress={() => setLanguage('vi')}
                style={[
                  styles.segmentBtn,
                  language === 'vi' && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: isDark ? colors.cardElevated : '#FFFFFF',
                      borderColor: colors.primary,
                    },
                  ],
                ]}
              >
                <Text style={{ fontSize: 13, marginRight: 6 }}>🇻🇳</Text>
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color: language === 'vi' ? colors.text : colors.sub,
                      fontWeight: language === 'vi' ? '800' : '600',
                    },
                  ]}
                >
                  Tiếng Việt
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setLanguage('en')}
                style={[
                  styles.segmentBtn,
                  language === 'en' && [
                    styles.segmentBtnActive,
                    {
                      backgroundColor: isDark ? colors.cardElevated : '#FFFFFF',
                      borderColor: colors.primary,
                    },
                  ],
                ]}
              >
                <Text style={{ fontSize: 13, marginRight: 6 }}>🇬🇧</Text>
                <Text
                  style={[
                    styles.segmentBtnText,
                    {
                      color: language === 'en' ? colors.text : colors.sub,
                      fontWeight: language === 'en' ? '800' : '600',
                    },
                  ]}
                >
                  English
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Các cài đặt hệ thống khác */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>
          {t('settings.sectionAppOptions')}
        </Text>
        <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Row icon="volume-high" label={t('settings.sound')} value={t('settings.soundValue')} />
          <Row icon="notifications" label={t('settings.reminder')} value={t('settings.reminderValue')} />
          <Row icon="shield-checkmark" label={t('settings.protection')} value={t('settings.protectionValue')} />
        </View>

        <Text style={[styles.footerText, { color: colors.sub }]}>
          {t('settings.footerNote')}
        </Text>
        <View style={{ height: 40 }} />
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
  content: {
    padding: 20,
    paddingTop: 16,
  },
  appBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
  },
  logoImg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
  },
  versionText: {
    fontSize: 13,
    marginTop: 4,
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
  },
  accountEmail: {
    fontSize: 12.5,
    marginTop: 2,
  },
  roleNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 8,
  },
  roleNoteText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  cardGroup: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  preferenceItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  preferenceItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  preferenceItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  preferenceTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  preferenceSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  segmentedWrapper: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
  },
  footerText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  loginBtnPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
});

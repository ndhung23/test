import { View, Text, Alert, FlatList, Image, StyleSheet, Platform } from 'react-native';
import { useAuth } from '../auth';
import { Row, RoleBadge } from '../../components/ui';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { ROLE_CONFIG } from '../../constants/roles';

const FAVICON_ICON = require('../../../assets/favicon1.png');

export default function AccountScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, signOut } = useAuth();

  const roleName = user?.role === 'admin'
    ? (t('roles.admin') || 'Quản trị viên')
    : user?.role === 'vip'
    ? (t('roles.vip') || 'Thành viên VIP')
    : (t('roles.free') || ROLE_CONFIG[user?.role]?.name || 'Thành viên Thường');

  const confirmLogout = () => {
    const title = t('accountScreen.logout') || 'Đăng xuất';
    const msg = t('accountScreen.logoutConfirm') || 'Bạn muốn đăng xuất khỏi tài khoản?';
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined'
        ? window.confirm(`${title}\n${msg}`)
        : true;
      if (ok) {
        signOut();
      }
      return;
    }

    Alert.alert(title, msg, [
      { text: t('common.cancel') || 'Hủy', style: 'cancel' },
      { text: t('accountScreen.logout') || 'Đăng xuất', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <FlatList
      data={[]}
      renderItem={null}
      ListHeaderComponent={
        <>
          <View style={styles.header}>
            <View style={[styles.avatarBox, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
              <Image source={FAVICON_ICON} style={styles.avatarImg} resizeMode="contain" />
            </View>
            <Text style={[styles.name, { color: colors.text }]}>{user?.name || 'ToolKit User'}</Text>
            <Text style={[styles.email, { color: colors.sub }]}>{user?.email}</Text>
            <View style={{ marginTop: 8 }}>
              <RoleBadge role={user?.role} />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Row icon="shield-checkmark-outline" label={t('accountScreen.memberTier') || 'Cấp bậc tài khoản'} value={roleName} />
            <Row icon="mail-outline" label="Email" value={user?.email} />
            <Row icon="moon-outline" label={t('settings.theme') || 'Giao diện'} value="Derot Dark" />
            <Row icon="log-out-outline" label={t('accountScreen.logout') || 'Đăng xuất'} onPress={confirmLogout} danger />
          </View>
        </>
      }
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginVertical: 24,
  },
  avatarBox: {
    width: 90,
    height: 90,
    borderRadius: 30,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
  },
  avatarImg: {
    width: 74,
    height: 74,
    borderRadius: 24,
    overflow: 'hidden',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  FlatList,
  Platform,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from './AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useSafeTop } from '../../components/ui';

const FAVICON_ICON = require('../../../assets/favicon1.png');

export default function LoginScreen({ navigation }) {
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const safeTop = useSafeTop();

  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // State tính năng Quên mật khẩu
  const [forgotModalVisible, setForgotModalVisible] = useState(false);

  const navigateToHome = () => {
    try {
      if (navigation?.canGoBack()) {
        navigation.goBack();
        return;
      }
    } catch {}
    try {
      navigation?.reset({
        index: 0,
        routes: [{ name: 'AppStack' }],
      });
      return;
    } catch {}
    try {
      navigation?.navigate('AppStack', { screen: 'Tabs', params: { screen: 'Home' } });
      return;
    } catch {}
    try {
      navigation?.navigate('Tabs', { screen: 'Home' });
      return;
    } catch {}
    try {
      navigation?.navigate('Home');
    } catch {}
  };

  const submit = async () => {
    const cleanId = email ? email.trim() : '';
    if (!cleanId) {
      setErr(isVietnamese ? 'Vui lòng nhập tên đăng nhập hoặc email.' : 'Please enter your username or email.');
      return;
    }
    if (!pw) {
      setErr(isVietnamese ? 'Vui lòng nhập mật khẩu.' : 'Please enter your password.');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      await signIn(cleanId, pw);
      navigateToHome();
    } catch (e) {
      setErr(e?.message || (isVietnamese ? 'Đăng nhập không thành công.' : 'Login failed.'));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert(
      isVietnamese ? 'Thông báo' : 'Notice',
      isVietnamese ? 'Tính năng đang phát triển' : 'Feature under development'
    );
  };

  const handleOpenForgot = () => {
    setForgotModalVisible(true);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Nút quay lại nếu đến từ màn hình khác */}
        {navigation?.canGoBack() && (
          <View style={styles.topNavRow}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={[styles.backBtnPill, { borderColor: colors.border }]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={[styles.backBtnText, { color: colors.primary }]}>{t('auth.back')}</Text>
            </Pressable>
          </View>
        )}
        {/* Logo & Mascot Area */}
        <View style={styles.topSection}>
          <View style={[styles.mascotBadge, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
            <Image source={FAVICON_ICON} style={styles.mascotImg} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>
            ToolKit <Text style={{ fontSize: 24 }}>✨</Text>
          </Text>
          <Text style={[styles.appTagline, { color: colors.sub }]}>
            {t('auth.loginSubtitle')}
          </Text>
        </View>

        {/* Form Container */}
        <View
          style={[
            styles.cardForm,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.text }]}>{t('auth.loginTitle')}</Text>

          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="person-outline" size={20} color={colors.sub} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={t('auth.usernameOrEmail')}
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={[styles.inputField, { color: colors.text }]}
            />
          </View>

          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.sub} />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.sub}
              secureTextEntry={!show}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submit}
              style={[styles.inputField, { color: colors.text }]}
            />
            <Pressable onPress={() => setShow(!show)} hitSlop={10}>
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.sub} />
            </Pressable>
          </View>

          {/* Gợi ý tài khoản thử nghiệm nhanh */}
          <View style={styles.quickAccountsRow}>
            <Text style={[styles.quickAccountsLabel, { color: colors.sub }]}>
              {isVietnamese ? 'Tài khoản thử nghiệm:' : 'Demo accounts:'}
            </Text>
            <View style={styles.quickPillsWrap}>
              <Pressable
                onPress={() => {
                  setEmail('admin');
                  setPw('1');
                  setErr('');
                }}
                style={[styles.quickPill, { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
              >
                <Text style={[styles.quickPillText, { color: '#EF4444' }]}>🛡️ Admin (admin/1)</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setEmail('vip');
                  setPw('123456');
                  setErr('');
                }}
                style={[styles.quickPill, { borderColor: colors.primary, backgroundColor: 'rgba(255, 208, 0, 0.1)' }]}
              >
                <Text style={[styles.quickPillText, { color: colors.primary }]}>👑 VIP (vip/123456)</Text>
              </Pressable>
            </View>
          </View>

          {/* Nút Quên mật khẩu */}
          <View style={styles.forgotPassRow}>
            <Pressable onPress={handleOpenForgot} hitSlop={8}>
              <Text style={[styles.forgotPassText, { color: colors.primary }]}>{t('auth.forgotPassword')}</Text>
            </Pressable>
          </View>

          {!!err && <Text style={[styles.errorText, { color: colors.danger }]}>{err}</Text>}

          {/* Nút Đăng nhập */}
          <Pressable
            onPress={submit}
            disabled={busy}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: pressed || busy ? 0.85 : 1,
              },
            ]}
          >
            {busy ? (
              <ActivityIndicator color="#121214" />
            ) : (
              <Text style={styles.submitBtnText}>{t('auth.loginNow')}</Text>
            )}
          </Pressable>

          {/* Đường phân cách */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.sub }]}>{t('auth.orDivider')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Nút Đăng nhập bằng Google */}
          <Pressable
            onPress={handleGoogleLogin}
            disabled={busy}
            style={({ pressed }) => [
              styles.googleBtn,
              {
                backgroundColor: '#FFFFFF',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View style={styles.googleBtnContent}>
              <Ionicons name="logo-google" size={19} color="#EA4335" />
              <Text style={styles.googleBtnText}>{t('auth.loginWithGoogle')}</Text>
            </View>
          </Pressable>

          {/* Chuyển sang màn hình Đăng ký */}
          <View style={styles.bottomSwitchRow}>
            <Text style={{ color: colors.sub, fontSize: 14 }}>{t('auth.dontHaveAccount')} </Text>
            <Pressable onPress={() => navigation?.navigate('Register')} hitSlop={8}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>{t('auth.registerNow')}</Text>
            </Pressable>
          </View>
        </View>
          </>
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop + 16 }]}
        showsVerticalScrollIndicator={false}
      />

      {/* Modal Quên Mật Khẩu */}
      <ForgotPasswordModal
        visible={forgotModalVisible}
        onClose={() => setForgotModalVisible(false)}
        initialIdentifier={email.trim()}
        onSuccessLogin={(newId, newPassword) => {
          setEmail(newId);
          setPw(newPassword);
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  topSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  mascotBadge: {
    width: 104,
    height: 104,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.2)',
  },
  mascotImg: {
    width: 86,
    height: 86,
    borderRadius: 26,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 14.5,
    marginTop: 6,
    textAlign: 'center',
  },
  cardForm: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  formTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 20,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputField: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 10,
    fontSize: 15,
  },
  forgotPassRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 10,
  },
  quickAccountsRow: {
    marginBottom: 14,
  },
  quickAccountsLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    marginBottom: 6,
  },
  quickPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  forgotPassText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorText: {
    marginBottom: 12,
    fontSize: 13,
  },
  submitBtn: {
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#121214',
    fontSize: 16,
    fontWeight: '800',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 0.8,
  },
  googleBtn: {
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
  topNavRow: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 208, 0, 0.08)',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  bottomSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  switchLink: {
    fontWeight: '800',
    fontSize: 14,
  },
});

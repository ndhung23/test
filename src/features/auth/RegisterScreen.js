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
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useSafeTop } from '../../components/ui';

const FAVICON_ICON = require('../../../assets/favicon1.png');

export default function RegisterScreen({ navigation }) {
  const { colors } = useTheme();
  const { signUp } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const safeTop = useSafeTop();

  const [username, setUsername] = useState('');
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

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

  const handleRegister = async () => {
    setErr('');
    const cleanUser = username.trim();

    if (!cleanUser) {
      setErr(isVietnamese ? 'Vui lòng nhập tên đăng nhập.' : 'Please enter a username.');
      return;
    }
    if (cleanUser.length < 3) {
      setErr(isVietnamese ? 'Tên đăng nhập phải có ít nhất 3 ký tự.' : 'Username must be at least 3 characters.');
      return;
    }
    if (!pw || pw.length < 6) {
      setErr(isVietnamese ? 'Mật khẩu phải có độ dài tối thiểu từ 6 ký tự trở lên.' : 'Password must be at least 6 characters.');
      return;
    }
    if (pw !== confirmPw) {
      setErr(isVietnamese ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await signUp(cleanUser, pw);
      // Đăng ký xong tự động đăng nhập và chuyển thẳng về Trang chủ (Home)
      navigateToHome();
    } catch (e) {
      setErr(e?.message || (isVietnamese ? 'Đăng ký không thành công. Vui lòng thử lại.' : 'Registration failed. Please try again.'));
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={[]}
        renderItem={null}
        style={{ flex: 1 }}
        ListHeaderComponent={
          <>
            {/* Thanh điều hướng quay lại */}
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

        {/* Logo & Mascot */}
        <View style={styles.topSection}>
          <View style={[styles.mascotBadge, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
            <Image source={FAVICON_ICON} style={styles.mascotImg} resizeMode="contain" />
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>
            ToolKit <Text style={{ fontSize: 24 }}>✨</Text>
          </Text>
          <Text style={[styles.appTagline, { color: colors.sub }]}>
            {t('auth.registerSubtitle')}
          </Text>
        </View>

        {/* Form Container */}
        <View
          style={[
            styles.cardForm,
            { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.formTitle, { color: colors.text }]}>{t('auth.registerTitle')}</Text>

          {/* Tên đăng nhập */}
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="person-outline" size={20} color={colors.sub} />
            <TextInput
              disableFullscreenUI={true}
              value={username}
              onChangeText={setUsername}
              placeholder={t('auth.usernameOrEmail')}
              placeholderTextColor={colors.sub}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={[styles.inputField, { color: colors.text }]}
            />
          </View>

          {/* Mật khẩu */}
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.sub} />
            <TextInput
              disableFullscreenUI={true}
              value={pw}
              onChangeText={setPw}
              placeholder={t('auth.password')}
              placeholderTextColor={colors.sub}
              secureTextEntry={!showPw}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              style={[styles.inputField, { color: colors.text }]}
            />
            <Pressable onPress={() => setShowPw(!showPw)} hitSlop={10}>
              <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.sub} />
            </Pressable>
          </View>

          {/* Xác nhận mật khẩu */}
          <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg }]}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.sub} />
            <TextInput
              disableFullscreenUI={true}
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder={t('auth.confirmPassword')}
              placeholderTextColor={colors.sub}
              secureTextEntry={!showConfirmPw}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              style={[styles.inputField, { color: colors.text }]}
            />
            <Pressable onPress={() => setShowConfirmPw(!showConfirmPw)} hitSlop={10}>
              <Ionicons
                name={showConfirmPw ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.sub}
              />
            </Pressable>
          </View>

          {!!err && <Text style={[styles.errorText, { color: colors.danger }]}>{err}</Text>}

          {/* Nút Đăng ký */}
          <Pressable
            onPress={handleRegister}
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
              <Text style={styles.submitBtnText}>{t('auth.registerNow')}</Text>
            )}
          </Pressable>

          {/* Đường phân cách */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.sub }]}>{t('auth.orDivider')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Nút Đăng ký nhanh với Google */}
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

          {/* Chuyển sang màn hình Đăng nhập */}
          <View style={styles.bottomSwitchRow}>
            <Text style={{ color: colors.sub, fontSize: 14 }}>{t('auth.haveAccount')} </Text>
            <Pressable onPress={() => navigation?.navigate('Login')} hitSlop={8}>
              <Text style={[styles.switchLink, { color: colors.primary }]}>{t('auth.loginNow')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
          </>
        }
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop + 16 }]}
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  topSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  mascotBadge: {
    width: 76,
    height: 76,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
  },
  mascotImg: {
    width: 60,
    height: 60,
    borderRadius: 18,
    overflow: 'hidden',
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  cardForm: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 18,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  inputField: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#121214',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    fontSize: 12,
    fontWeight: '700',
    marginHorizontal: 12,
    letterSpacing: 0.8,
  },
  googleBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  googleBtnText: {
    color: '#3C4043',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
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

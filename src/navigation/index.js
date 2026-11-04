import { View, Text, Pressable, ActivityIndicator, Alert, Image, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';

import { useAuth } from '../features/auth/AuthContext';
import LoginScreen from '../features/auth/LoginScreen';
import RegisterScreen from '../features/auth/RegisterScreen';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../theme';
// Màn hình theo các features tính năng chuẩn (1 feature = 1 folder)
import { HomeScreen, ToolsScreen } from '../features/home';
import { ScreenTimeScreen, StatsScreen } from '../features/screentime';
import { FapExamScreen } from '../features/fap';
import { ImageToPdfScreen } from '../features/image-to-pdf';
import { CleanPhotosScreen } from '../features/clean-photos';
import { FbMultiScreen } from '../features/multi';
import { AiReplyScreen } from '../features/ai-reply';
import { SnapVideoScreen } from '../features/snap-video';
import { MicroHabitScreen } from '../features/micro-habit';
import { SettingsScreen } from '../features/settings';
import { AdminScreen } from '../features/admin';
import FloatingTabBar from '../components/FloatingTabBar';
import { RoleBadge } from '../components/ui';
import { ROLES } from '../constants/roles';

const FAVICON_ICON = require('../../assets/favicon1.png');

const AuthStackNav = createNativeStackNavigator();
const AppStackNav = createNativeStackNavigator();
const TabNav = createBottomTabNavigator();
const DrawerNav = createDrawerNavigator();

/* ---------- 1. AUTH STACK (Chưa đăng nhập) ---------- */
function AuthStack() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false }}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
    </AuthStackNav.Navigator>
  );
}

/* ---------- 2. TAB (4 tab nổi) ---------- */
function Tabs() {
  const { t } = useLanguage();
  return (
    <TabNav.Navigator
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <TabNav.Screen name="Home" component={HomeScreen} options={{ title: t('nav.home') }} />
      <TabNav.Screen name="ScreenTime" component={ScreenTimeScreen} options={{ title: t('tools.screentime.shortTitle') }} />
      <TabNav.Screen name="Tools" component={ToolsScreen} options={{ title: t('nav.tools') }} />
      <TabNav.Screen name="Stats" component={StatsScreen} options={{ title: t('nav.stats') }} />
    </TabNav.Navigator>
  );
}

/* ---------- 3. APP STACK (Tab + các tính năng chi tiết) ---------- */
function AppStack() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <AppStackNav.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <AppStackNav.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <AppStackNav.Screen
        name="FapExam"
        component={FapExamScreen}
        options={{ title: t('tools.fap_exam.title') }}
      />
      <AppStackNav.Screen
        name="ImageToPdf"
        component={ImageToPdfScreen}
        options={{ title: t('tools.pdf.title') }}
      />
      <AppStackNav.Screen
        name="ScreenTime"
        component={ScreenTimeScreen}
        options={{ title: t('tools.screentime.title') }}
      />
      <AppStackNav.Screen
        name="CleanPhotos"
        component={CleanPhotosScreen}
        options={{ title: t('tools.clean_photos.title') }}
      />
      <AppStackNav.Screen
        name="FbMulti"
        component={FbMultiScreen}
        options={{ title: t('tools.fb_multi.title') }}
      />
      <AppStackNav.Screen
        name="AiReply"
        component={AiReplyScreen}
        options={{ title: t('tools.ai_reply.title') }}
      />
      <AppStackNav.Screen
        name="SnapVideo"
        component={SnapVideoScreen}
        options={{ title: t('tools.snap_video.title') }}
      />
      <AppStackNav.Screen
        name="MicroHabit"
        component={MicroHabitScreen}
        options={{ title: t('tools.micro_habit.title') }}
      />
      <AppStackNav.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <AppStackNav.Screen
        name="AdminScreen"
        component={AdminScreen}
        options={{ title: t('nav.admin') }}
      />
      <AppStackNav.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: t('nav.login'), headerShown: false }}
      />
      <AppStackNav.Screen
        name="Register"
        component={RegisterScreen}
        options={{ title: t('nav.register'), headerShown: false }}
      />
    </AppStackNav.Navigator>
  );
}

/* ---------- 4. DRAWER (Menu mở rộng) ---------- */
function CustomDrawer(props) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const { t, isVietnamese } = useLanguage();

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
      <View
        style={{
          padding: 20,
          paddingTop: 60,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            overflow: 'hidden',
            backgroundColor: 'rgba(255, 208, 0, 0.12)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderWidth: 1,
            borderColor: 'rgba(255, 208, 0, 0.25)',
          }}
        >
          <Image
            source={FAVICON_ICON}
            style={{ width: 52, height: 52, borderRadius: 16, overflow: 'hidden' }}
            resizeMode="contain"
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>
            {user?.name || t('settings.guest')}
          </Text>
          {user ? (
            <RoleBadge role={user?.role} />
          ) : (
            <Pressable
              onPress={() => props.navigation.navigate('Login')}
              style={{
                backgroundColor: 'rgba(255, 208, 0, 0.15)',
                borderColor: '#FFD000',
                borderWidth: 1,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#FFD000', fontSize: 11, fontWeight: '800' }}>
                {isVietnamese ? 'ĐĂNG NHẬP' : 'SIGN IN'}
              </Text>
            </Pressable>
          )}
        </View>
        <Text style={{ color: colors.sub, marginTop: 4, fontSize: 13 }}>
          {user?.email || (isVietnamese ? 'Đăng nhập để trải nghiệm đầy đủ tính năng VIP' : 'Sign in to unlock all VIP features')}
        </Text>
      </View>

      <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 8 }}>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      {user ? (
        <Pressable
          onPress={confirmLogout}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={{ marginLeft: 12, color: colors.danger, fontWeight: '700', fontSize: 15 }}>
            {t('settings.logout')}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => props.navigation.navigate('Login')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 20,
            paddingBottom: 40,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <Ionicons name="log-in-outline" size={22} color={colors.primary} />
          <Text style={{ marginLeft: 12, color: colors.primary, fontWeight: '800', fontSize: 15 }}>
            {t('nav.login')} / {t('nav.register')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function AppDrawer() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.role === ROLES.ADMIN;

  return (
    <DrawerNav.Navigator
      drawerContent={(props) => <CustomDrawer {...props} />}
      screenOptions={{
        drawerActiveTintColor: '#121214',
        drawerActiveBackgroundColor: colors.primary,
        drawerInactiveTintColor: colors.text,
        drawerLabelStyle: { fontWeight: '700', marginLeft: -8 },
        drawerItemStyle: { borderRadius: 14, marginHorizontal: 12, overflow: 'hidden' },
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
      }}
    >
      <DrawerNav.Screen
        name="AppStack"
        component={AppStack}
        options={{
          headerShown: false,
          title: t('nav.homeTitle'),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      {isAdmin && (
        <DrawerNav.Screen
          name="DrawerAdmin"
          component={AdminScreen}
          options={{
            title: t('nav.admin'),
            drawerIcon: ({ color, size }) => (
              <Ionicons name="shield-checkmark-outline" size={size} color="#EF4444" />
            ),
          }}
        />
      )}
      <DrawerNav.Screen
        name="DrawerSettings"
        component={SettingsScreen}
        options={{
          title: t('nav.settingsDrawer'),
          drawerIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <DrawerNav.Screen
        name="Login"
        component={LoginScreen}
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
      <DrawerNav.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          drawerItemStyle: { display: 'none' },
          headerShown: false,
        }}
      />
    </DrawerNav.Navigator>
  );
}

/* ---------- 5. GỐC ---------- */
export default function RootNavigator() {
  const { loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  // Mở thẳng ứng dụng chính cho cả Khách và Người dùng đã đăng nhập
  return <AppDrawer />;
}

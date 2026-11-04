import 'react-native-gesture-handler'; // phải nằm dòng đầu tiên (cần cho Drawer)
import { Platform, Alert, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/features/auth/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ScreenTimeProvider } from './src/features/screentime/ScreenTimeContext';
import { ThemeProvider, useTheme } from './src/theme';
import RootNavigator from './src/navigation';
import AiFloatingBot from './src/components/AiFloatingBot';
import TaskSheetHost from './src/features/micro-habit/TaskSheetHost';
import { requestOpenTask } from './src/features/micro-habit/TaskSheetStore';

const navigationRef = createNavigationContainerRef();

// Polyfill Alert.alert cho React Native Web (tránh lỗi Alert rỗng không hoạt động trên trình duyệt)
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (title, message, buttons) => {
    const text = [title, message].filter(Boolean).join('\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    const cancelBtn = buttons.find((b) => b.style === 'cancel');
    const actionBtns = buttons.filter((b) => b.style !== 'cancel');

    if (actionBtns.length > 0 && cancelBtn) {
      const ok = window.confirm(text);
      if (ok) {
        actionBtns[0]?.onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
    } else if (actionBtns.length > 0) {
      window.alert(text);
      actionBtns[0]?.onPress?.();
    } else {
      window.alert(text);
    }
  };
}

function MainApp() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      primary: colors.primary,
    },
  };
  const handledNotifications = useRef(new Set());
  const [navigationReady, setNavigationReady] = useState(false);
  const openHabitFromNotification = (response) => {
    const habitId = response?.notification?.request?.content?.data?.habitId
      || response?.notification?.request?.content?.data?.taskId;
    const notificationId = response?.notification?.request?.identifier;
    if (!habitId || (notificationId && handledNotifications.current.has(notificationId))) return;
    // Do not consume a cold-start response before the navigator can receive it.
    if (!navigationRef.isReady()) return;
    if (notificationId) handledNotifications.current.add(notificationId);
    console.info('[TaskSheet]', { at: new Date().toISOString(), stage: 'notification-response', taskId: habitId, notificationId });
    requestOpenTask(habitId, response?.notification?.request?.content?.data?.test ? 'test-notification' : 'notification');
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  };
  useEffect(() => {
    Notifications.getLastNotificationResponseAsync().then(openHabitFromNotification).catch(() => {});
    const subscription = Notifications.addNotificationResponseReceivedListener(openHabitFromNotification);
    return () => subscription.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={() => {
          setNavigationReady(true);
          Notifications.getLastNotificationResponseAsync().then(openHabitFromNotification).catch(() => {});
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
        <TaskSheetHost
          navigationReady={navigationReady}
          navigateToTask={(habitId) => navigationRef.navigate('AppStack', { screen: 'MicroHabit', params: { habitId } })}
        />
      </NavigationContainer>
      <AiFloatingBot />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <ScreenTimeProvider>
              <MainApp />
            </ScreenTimeProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

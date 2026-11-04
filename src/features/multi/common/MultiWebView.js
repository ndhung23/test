import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../../theme';
import { PLATFORMS, USER_AGENTS } from './multiConstants';
import {
  generateDesktopSpoofScript,
  generateCookieInjectionScript,
  generateCleanCssScript,
} from './multiCookieManager';
import { isFacebookMessagesUrl } from '../fb/fbHelper';

const MultiWebView = forwardRef(function MultiWebView(
  { account, onRefreshSession },
  ref
) {
  const { colors } = useTheme();
  const webViewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useImperativeHandle(ref, () => ({
    reload: () => {
      setLoading(true);
      setLoadError(false);
      if (webViewRef.current) {
        webViewRef.current.reload();
      }
      if (onRefreshSession) onRefreshSession();
    },
    goBack: () => {
      if (webViewRef.current) webViewRef.current.goBack();
    },
  }));

  if (!account || !account.cookies) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
        <Image
          source={require('../../../../assets/icon_multiweb.png')}
          style={styles.emptyIcon}
          resizeMode="contain"
        />
        <Text style={[styles.emptyText, { color: colors.sub }]}>
          Vui lòng bấm nút "+" trên thanh công cụ để thêm tài khoản Zalo, Messenger, Facebook hoặc ứng dụng khác.
        </Text>
      </View>
    );
  }

  const platform = account.platform || PLATFORMS.ZALO;

  let targetUrl = 'https://chat.zalo.me/';
  let userAgent = USER_AGENTS.ZALO_DESKTOP;

  if (platform === PLATFORMS.MESSENGER) {
    targetUrl = 'https://www.messenger.com/';
    userAgent = USER_AGENTS.MESSENGER_DESKTOP;
  } else if (platform === PLATFORMS.FACEBOOK) {
    targetUrl = 'https://m.facebook.com/';
    userAgent = USER_AGENTS.FACEBOOK_MOBILE;
  } else if (platform === PLATFORMS.CUSTOM) {
    targetUrl = account.customUrl || 'https://google.com';
    userAgent = USER_AGENTS.ZALO_DESKTOP;
  }

  // Chặn hoàn toàn việc ứng dụng tự nhảy ra app ngoài (App Store / Messenger Native)
  const handleShouldStartLoad = (request) => {
    const url = (request.url || '').toLowerCase();
    if (
      url.startsWith('fb-messenger:') ||
      url.startsWith('itms-app') ||
      url.startsWith('https://apps.apple.com') ||
      url.startsWith('market:') ||
      url.startsWith('intent:') ||
      url.startsWith('zalo:')
    ) {
      return false; // Chặn không mở app ngoài
    }

    // Nếu trên Facebook mobile mà bấm vào tin nhắn -> điều hướng sang mbasic để đọc và nhắn tin mượt mà không bị ép tải app
    if (platform === PLATFORMS.FACEBOOK && isFacebookMessagesUrl(url)) {
      if (webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `window.location.href = 'https://mbasic.facebook.com/messages/'; true;`
        );
        return false;
      }
    }

    return true;
  };

  const desktopSpoofScript = generateDesktopSpoofScript(platform);
  const cookieInjectionScript = generateCookieInjectionScript(
    account.cookies,
    platform,
    account.customUrl
  );
  const beforeLoadScript = `${desktopSpoofScript}\n${cookieInjectionScript}`;
  const cleanCssScript = generateCleanCssScript(platform);

  return (
    <View style={styles.container}>
      <WebView
        key={`${account.key || account.id}_${platform}`}
        ref={webViewRef}
        source={{ uri: targetUrl }}
        injectedJavaScriptBeforeContentLoaded={beforeLoadScript}
        injectedJavaScript={cleanCssScript}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setLoadError(true);
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        scalesPageToFit={false}
        showsVerticalScrollIndicator={false}
        style={styles.webView}
        userAgent={userAgent}
      />

      {/* Thanh tiến trình loading siêu mỏng ở đỉnh WebView */}
      {loading && (
        <View style={styles.topProgressBar}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.progressBarText, { color: colors.sub }]}>
            Đang tải {account.nickname || account.name}...
          </Text>
        </View>
      )}

      {/* Báo lỗi nếu không tải được trang */}
      {loadError && (
        <View style={[styles.errorOverlay, { backgroundColor: colors.bg }]}>
          <Ionicons name="cloud-offline-outline" size={44} color="#EF4444" />
          <Text style={[styles.errorTitle, { color: colors.text }]}>Không thể kết nối</Text>
          <Text style={[styles.errorSub, { color: colors.sub }]}>
            Vui lòng kiểm tra lại kết nối mạng hoặc phiên đăng nhập của tài khoản này.
          </Text>
          <Pressable
            onPress={() => {
              setLoading(true);
              setLoadError(false);
              webViewRef.current?.reload();
            }}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="refresh" size={16} color="#121214" />
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
});

export default MultiWebView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121214',
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#121214',
  },
  topProgressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(18, 18, 20, 0.88)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    gap: 8,
    zIndex: 10,
  },
  progressBarText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
    zIndex: 20,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  errorSub: {
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 17,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    marginTop: 8,
    gap: 6,
  },
  retryBtnText: {
    color: '#121214',
    fontSize: 13,
    fontWeight: '700',
  },
});

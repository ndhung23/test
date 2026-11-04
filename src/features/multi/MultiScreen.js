import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import {
  getStoredAccounts,
  getActiveAccountId,
  setActiveAccountId,
  saveOrUpdateAccount,
  removeAccount,
  updateAccountNickname,
} from './common/multiAccountStorage';
import MultiAccountSwitcherBar from './common/MultiAccountSwitcherBar';
import MultiWebView from './common/MultiWebView';
import MultiAddAccountModal from './common/MultiAddAccountModal';

export default function MultiScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState([]);
  const [activeAccountId, setActiveId] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Ref điều khiển WebView (reload, goBack)
  const webViewRef = useRef(null);

  // Modal thêm tài khoản
  const [addModalVisible, setAddModalVisible] = useState(false);

  // Modal đổi tên gợi nhớ (nickname)
  const [renameTargetAccount, setRenameTargetAccount] = useState(null);
  const [newNickname, setNewNickname] = useState('');

  // Nạp danh sách tài khoản đã lưu
  const refreshAccounts = useCallback(async () => {
    try {
      const stored = await getStoredAccounts();
      const activeId = await getActiveAccountId();
      setAccounts(stored);

      if (stored.length > 0) {
        if (activeId && stored.some((a) => a.key === activeId || a.id === activeId)) {
          setActiveId(activeId);
        } else {
          const firstKey = stored[0].key || stored[0].id;
          setActiveId(firstKey);
          await setActiveAccountId(firstKey);
        }
      } else {
        setActiveId(null);
      }
    } catch (_e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const stored = await getStoredAccounts();
        const activeId = await getActiveAccountId();
        if (!isMounted) return;
        setAccounts(stored);

        if (stored.length > 0) {
          if (activeId && stored.some((a) => a.key === activeId || a.id === activeId)) {
            setActiveId(activeId);
          } else {
            const firstKey = stored[0].key || stored[0].id;
            setActiveId(firstKey);
            await setActiveAccountId(firstKey);
          }
        } else {
          setActiveId(null);
        }
      } catch (_e) {
        // ignore
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Xử lý chuyển đổi tài khoản 1 chạm
  const handleSwitchAccount = async (targetAccount) => {
    const key = targetAccount.key || targetAccount.id;
    if (!targetAccount || key === activeAccountId) return;
    setActiveId(key);
    await setActiveAccountId(key);
  };

  // Thêm tài khoản thành công
  const handleAccountAdded = async (newAccount) => {
    try {
      const updatedList = await saveOrUpdateAccount(newAccount);
      setAccounts(updatedList);
      const newKey = newAccount.key || `${newAccount.platform || 'messenger'}_${newAccount.id}`;
      setActiveId(newKey);
    } catch (error) {
      Alert.alert('Lỗi', error.message || 'Không thể lưu tài khoản.');
    }
  };

  // Menu quản lý tài khoản khi nhấn giữ avatar
  const handleLongPressAccount = (account) => {
    const title = account.nickname || account.name || `Tài khoản ${account.id.slice(-4)}`;
    Alert.alert(
      title,
      'Chọn thao tác bạn muốn thực hiện cho tài khoản này:',
      [
        {
          text: 'Đổi tên gợi nhớ',
          onPress: () => {
            setRenameTargetAccount(account);
            setNewNickname(account.nickname || account.name || '');
          },
        },
        {
          text: 'Đăng xuất tài khoản này',
          style: 'destructive',
          onPress: () => confirmRemoveAccount(account),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  };

  // Xác nhận đăng xuất/xóa tài khoản
  const confirmRemoveAccount = (account) => {
    const name = account.nickname || account.name || account.id;
    Alert.alert(
      'Xác nhận đăng xuất',
      `Bạn có chắc chắn muốn xóa phiên đăng nhập của "${name}" khỏi máy?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              const targetKey = account.key || account.id;
              const { accounts: updatedList, newActiveId } = await removeAccount(targetKey);
              setAccounts(updatedList);
              setActiveId(newActiveId);
            } catch (_err) {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản.');
            }
          },
        },
      ]
    );
  };

  // Lưu tên gợi nhớ
  const handleSaveRename = async () => {
    if (!renameTargetAccount) return;
    try {
      const targetKey = renameTargetAccount.key || renameTargetAccount.id;
      const updated = await updateAccountNickname(targetKey, newNickname);
      setAccounts(updated);
      setRenameTargetAccount(null);
    } catch (_e) {
      Alert.alert('Lỗi', 'Không thể cập nhật tên gợi nhớ.');
    }
  };

  const activeAccount =
    accounts.find((a) => a.key === activeAccountId || a.id === activeAccountId) || accounts[0] || null;

  if (loadingInitial) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: '#121214' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.sub }]}>{t('multiAccount.loading') || 'Đang nạp phiên đăng nhập...'}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {accounts.length === 0 ? (
        /* Màn hình giới thiệu khi chưa thêm nick */
        <View style={[styles.introContainer, { backgroundColor: colors.bg }]}>
          <View style={styles.introTopHeader}>
            <Pressable
              onPress={() => navigation?.canGoBack() && navigation.goBack()}
              style={styles.backBtnIntro}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text style={[styles.introTopTitle, { color: colors.text }]}>{t('multiAccount.title') || 'Đa tài khoản'}</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.cardIntro, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'transparent' }]}>
              <Image
                source={require('../../../assets/icon_multiweb.png')}
                style={{ width: 68, height: 68, borderRadius: 18 }}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.introTitle, { color: colors.text }]}>{t('multiAccount.introTitle') || 'Đa Tài Khoản Mạng Xã Hội'}</Text>
            <Text style={[styles.introSub, { color: colors.sub }]}>
              {t('multiAccount.introDesc') || 'Đăng nhập Zalo, Messenger, Facebook & các ứng dụng khác. Chuyển đổi 1 chạm tức thì không cần đăng xuất.'}
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Ionicons name="chatbubbles" size={17} color="#0068FF" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Hỗ trợ Zalo Web, Messenger, Facebook và thêm ứng dụng bất kỳ
                </Text>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="flash" size={17} color="#FFD000" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Chuyển nick nhanh chóng trong 0.1s lưu phiên an toàn
                </Text>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="shield-checkmark" size={17} color="#22C55E" />
                <Text style={[styles.featureText, { color: colors.text }]}>
                  Giao diện tràn viền, tối ưu hóa thao tác chạm và nhắn tin
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => setAddModalVisible(true)}
              style={[styles.startBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add-circle" size={20} color="#121214" />
              <Text style={styles.startBtnText}>{t('multiAccount.firstAccount') || 'Thêm tài khoản đầu tiên'}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        /* GIAO DIỆN FULL MÀN HÌNH: Top Bar siêu mỏng + Khung WebView tràn viền */
        <View style={styles.fullScreenContainer}>
          {/* Thanh Switcher Bar siêu mỏng tích hợp nút Back, Avatar list và nút Thêm */}
          <MultiAccountSwitcherBar
            accounts={accounts}
            activeAccountId={activeAccountId}
            onSwitchAccount={handleSwitchAccount}
            onAddAccount={() => setAddModalVisible(true)}
            onLongPressAccount={handleLongPressAccount}
            onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
            onReload={() => webViewRef.current?.reload()}
          />

          {/* Khung WebView tràn viền 100% diện tích còn lại */}
          <View style={styles.webWrapper}>
            <MultiWebView
              ref={webViewRef}
              account={activeAccount}
              onRefreshSession={refreshAccounts}
            />
          </View>
        </View>
      )}

      {/* Modal Thêm tài khoản hỗ trợ các nền tảng */}
      <MultiAddAccountModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onAccountAdded={handleAccountAdded}
        existingAccounts={accounts}
      />

      {/* Modal Đổi tên gợi nhớ */}
      <Modal
        visible={Boolean(renameTargetAccount)}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameTargetAccount(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.renameBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.renameTitle, { color: colors.text }]}>{t('multiAccount.renameTitle') || 'Đổi tên gợi nhớ'}</Text>
            <Text style={[styles.renameSub, { color: colors.sub }]}>
              {t('multiAccount.renameSub') || 'Đặt tên dễ nhớ (ví dụ: "Shop online", "Nick cá nhân", "Nick clone"): '}
            </Text>

            <TextInput
              value={newNickname}
              onChangeText={setNewNickname}
              placeholder={t('multiAccount.renameTitle') || 'Nhập tên gợi nhớ...'}
              placeholderTextColor={colors.sub}
              style={[
                styles.renameInput,
                { backgroundColor: colors.bg, borderColor: colors.cardBorder, color: colors.text },
              ]}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveRename}
            />

            <View style={styles.renameActions}>
              <Pressable
                onPress={() => setRenameTargetAccount(null)}
                style={[styles.renameBtn, { backgroundColor: colors.bg, borderColor: colors.cardBorder }]}
              >
                <Text style={{ color: colors.sub, fontWeight: '700' }}>{t('common.cancel') || 'Hủy'}</Text>
              </Pressable>

              <Pressable
                onPress={handleSaveRename}
                style={[styles.renameBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={{ color: '#121214', fontWeight: '800' }}>{t('multiAccount.saveName') || 'Lưu tên'}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#18181C',
  },
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  introContainer: {
    flex: 1,
    padding: 18,
    justifyContent: 'center',
  },
  introTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backBtnIntro: {
    padding: 4,
  },
  introTopTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  cardIntro: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 132, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  introTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  introSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  featureList: {
    width: '100%',
    gap: 10,
    marginBottom: 22,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    flex: 1,
    fontSize: 12.5,
    lineHeight: 16,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 48,
    borderRadius: 14,
    gap: 8,
  },
  startBtnText: {
    color: '#121214',
    fontSize: 14.5,
    fontWeight: '800',
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#121214',
  },
  webWrapper: {
    flex: 1,
    backgroundColor: '#121214',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  renameBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  renameTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  renameSub: {
    fontSize: 12.5,
    lineHeight: 16,
    marginBottom: 14,
  },
  renameInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 18,
  },
  renameActions: {
    flexDirection: 'row',
    gap: 10,
  },
  renameBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
});

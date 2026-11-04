import { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  Share,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from '../../utils/storage';
import {
  DerotHeader,
  FocusGauge,
  MindInsightCard,
  AchievementCard,
  ShareBanner,
  VipUpgradeModal,
} from '../../components/ui';
import DraggableGrid from '../../components/DraggableGrid';
import { TOOLS, openTool } from '../../tools';
import { useTheme } from '../../theme';
import { useAuth } from '../auth';
import { useLanguage } from '../../context/LanguageContext';
import { canAccessTool, isVip } from '../../constants/roles';

const STORAGE_TOOLS_ORDER = 'toolkit_home_tools_order';

export default function HomeScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, toolTiers } = useAuth();
  const { t, isVietnamese } = useLanguage();
  const [crownModalVisible, setCrownModalVisible] = useState(false);
  const [selectedLockedTool, setSelectedLockedTool] = useState(null);

  // Danh sách tiện ích có thể tùy biến thứ tự
  const [orderedTools, setOrderedTools] = useState(TOOLS);
  const [isReordering, setIsReordering] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const vipActive = isVip(user);
  const accessibleCount = TOOLS.filter((item) => canAccessTool(user, item, toolTiers)).length;

  // Nạp thứ tự tùy chỉnh từ SecureStore
  useEffect(() => {
    loadToolsOrder();
  }, []);

  const loadToolsOrder = async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_TOOLS_ORDER);
      if (raw) {
        const savedIds = JSON.parse(raw);
        if (Array.isArray(savedIds) && savedIds.length > 0) {
          const sorted = [];
          savedIds.forEach((id) => {
            const found = TOOLS.find((item) => item.id === id);
            if (found) sorted.push(found);
          });
          // Bổ sung những tiện ích mới nếu chưa có trong savedIds
          TOOLS.forEach((item) => {
            if (!sorted.find((s) => s.id === item.id)) {
              sorted.push(item);
            }
          });
          setOrderedTools(sorted);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc thứ tự tiện ích:', e);
    }
    setOrderedTools(TOOLS);
  };

  // Lưu thứ tự sắp xếp (hỗ trợ cả kéo thả lẫn mũi tên)
  const handleReorder = async (nextList, shouldPersist = true) => {
    setOrderedTools(nextList);
    if (shouldPersist) {
      try {
        const ids = nextList.map((t) => t.id);
        await SecureStore.setItemAsync(STORAGE_TOOLS_ORDER, JSON.stringify(ids));
      } catch (e) {
        console.warn('Lỗi lưu thứ tự tiện ích:', e);
      }
    }
  };

  // Di chuyển vị trí tiện ích
  const moveTool = async (fromIndex, delta) => {
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= orderedTools.length) return;
    const next = [...orderedTools];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    handleReorder(next, true);
  };

  // Khôi phục thứ tự mặc định của hệ thống
  const resetDefaultOrder = async () => {
    setOrderedTools(TOOLS);
    try {
      await SecureStore.deleteItemAsync(STORAGE_TOOLS_ORDER);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: isVietnamese
          ? 'Trải nghiệm trọn bộ tiện ích thông minh trên ToolKit: Ghép ảnh PDF, Thời gian dùng, Dọn ảnh rác, Đa nick Facebook, AI trả lời tin nhắn...'
          : 'Experience the smart utilities suite on ToolKit: Image to PDF, Screen Time, Clean Photos, Multi-Account FB, AI Reply Assistant...',
      });
    } catch (e) {
      // ignore
    }
  };

  const handleStatusPress = () => {
    if (vipActive) {
      Alert.alert(
        isVietnamese ? 'Hệ thống ToolKit VIP' : 'ToolKit VIP System',
        isVietnamese
          ? `Tất cả ${TOOLS.length} tiện ích đã sẵn sàng hoạt động tối ưu trên thiết bị của bạn với tư cách VIP.`
          : `All ${TOOLS.length} utilities are fully operational on your device as VIP.`,
        [{ text: isVietnamese ? 'Đồng ý' : 'OK' }]
      );
    } else {
      Alert.alert(
        isVietnamese ? 'Tài khoản Free' : 'Free Account',
        isVietnamese
          ? `Bạn đang sử dụng ${accessibleCount}/${TOOLS.length} tiện ích cơ bản. Quyền nâng cấp VIP do Quản trị viên hệ thống chỉ định.`
          : `You are accessing ${accessibleCount}/${TOOLS.length} standard utilities. VIP upgrades are granted by system administrators.`,
        [
          { text: isVietnamese ? 'Đóng' : 'Close', style: 'cancel' },
          { text: isVietnamese ? 'Xem đặc quyền VIP' : 'View VIP Privileges', onPress: () => setCrownModalVisible(true) },
        ]
      );
    }
  };

  const handleToolPress = (tool) => {
    openTool(navigation, tool, user, (lockedTool) => {
      setSelectedLockedTool(lockedTool);
      setCrownModalVisible(true);
    }, toolTiers);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* 1. Header chuẩn Derot với Logo bo tròn + Huy hiệu vai trò */}
      <DerotHeader
        title="ToolKit"
        userRole={user?.role}
        onCrownPress={() => {
          setSelectedLockedTool(null);
          setCrownModalVisible(true);
        }}
        onSettingsPress={() => navigation.navigate('Settings')}
        onLoginPress={() => navigation.navigate('Login')}
      />

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* 2. Vòng tròn hiển thị số tiện ích được phép dùng */}
            <FocusGauge
              score={`${accessibleCount}/${TOOLS.length}`}
              label={
                vipActive
                  ? (isVietnamese ? 'Tiện ích VIP sẵn sàng' : 'VIP Utilities Ready')
                  : (isVietnamese ? 'Tiện ích khả dụng' : 'Accessible Utilities')
              }
              onPress={handleStatusPress}
            />

            {/* 3. Card trợ lý ToolKit Assistant */}
            <MindInsightCard
              title={vipActive ? 'ToolKit Assistant (VIP)' : 'ToolKit Assistant'}
              desc={
                vipActive
                  ? (isVietnamese ? `Tất cả ${TOOLS.length} tiện ích thông minh đã mở khóa đầy đủ quyền hạn.` : `All ${TOOLS.length} smart tools unlocked with full privileges.`)
                  : (isVietnamese ? 'Đang dùng gói cơ bản. Nhấn vào vương miện để mở khóa toàn bộ tiện ích.' : 'Using standard tier. Tap the crown to unlock all tools.')
              }
              onPress={handleStatusPress}
            />

            {/* 4. Card tiến độ hệ thống */}
            <AchievementCard
              title={
                vipActive
                  ? (isVietnamese ? `Hệ thống VIP • ${TOOLS.length}/${TOOLS.length} hoàn thiện` : `VIP System • ${TOOLS.length}/${TOOLS.length} Ready`)
                  : (isVietnamese ? `Hệ thống • ${accessibleCount}/${TOOLS.length} khả dụng` : `System • ${accessibleCount}/${TOOLS.length} accessible`)
              }
              subtitle={
                vipActive
                  ? (isVietnamese ? 'Đầy đủ AI, Multi-FB & Quản lý tiện ích' : 'Full AI, Multi-FB & Management Tools')
                  : (isVietnamese ? 'Mở khóa đặc quyền VIP để tối ưu trải nghiệm' : 'Unlock VIP features to maximize efficiency')
              }
              progress={TOOLS.length > 0 ? accessibleCount / TOOLS.length : 0}
              onPress={() => navigation.navigate('Tools')}
            />

            {/* 5. Tiêu đề danh sách tính năng + Nút bật chế độ sắp xếp vị trí */}
            <View style={styles.sectionHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  {isVietnamese ? 'Danh sách tiện ích' : 'Utility Tools'}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: colors.sub }]}>
                  {isReordering
                    ? (isVietnamese ? 'Nhấn giữ & kéo thả để đổi vị trí, hoặc chạm ◀ ▶' : 'Hold & drag to reorder, or tap ◀ ▶')
                    : (isVietnamese ? '3 tiện ích / hàng • Nhấn giữ để kéo thả' : '3 items / row • Long-press to drag & drop')}
                </Text>
              </View>

              <Pressable
                onPress={() => setIsReordering(!isReordering)}
                style={[
                  styles.reorderToggleBtn,
                  {
                    backgroundColor: isReordering ? colors.primary : colors.card,
                    borderColor: isReordering ? colors.primary : colors.cardBorder,
                  },
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name={isReordering ? 'checkmark-circle' : 'swap-horizontal'}
                  size={16}
                  color={isReordering ? '#121214' : colors.primary}
                />
                <Text
                  style={[
                    styles.reorderToggleText,
                    { color: isReordering ? '#121214' : colors.primary },
                  ]}
                >
                  {isReordering ? (isVietnamese ? 'Xong' : 'Done') : (isVietnamese ? 'Sắp xếp' : 'Reorder')}
                </Text>
              </Pressable>
            </View>

            {/* Banner hướng dẫn nhanh khi đang bật chế độ sắp xếp */}
            {isReordering && (
              <View
                style={[
                  styles.reorderActionBar,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Ionicons name="information-circle-outline" size={17} color={colors.primary} />
                <Text style={[styles.reorderHintText, { color: colors.sub }]}>
                  {isVietnamese
                    ? 'Nhấn giữ bất kỳ ô nào rồi kéo thả sang vị trí mong muốn'
                    : 'Hold any card and drag to your desired position'}
                </Text>
                <Pressable onPress={resetDefaultOrder} hitSlop={6} style={styles.resetBtn}>
                  <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '700' }}>
                    {isVietnamese ? 'Khôi phục' : 'Reset'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* 6. Gallery lưới 3 tiện ích / 1 hàng hỗ trợ Kéo - Thả (Drag & Drop) */}
            <DraggableGrid
              items={orderedTools}
              onReorder={handleReorder}
              onToolPress={handleToolPress}
              isLockedFn={(toolItem) => !canAccessTool(user, toolItem, toolTiers)}
              isReordering={isReordering}
              setIsReordering={setIsReordering}
              onDragStart={() => setScrollEnabled(false)}
              onDragEnd={() => setScrollEnabled(true)}
            />

            {/* 7. Banner chia sẻ */}
            <ShareBanner onPress={handleShare} />

            {/* Khoảng trống để không bị che bởi Floating Tab Bar */}
            <View style={{ height: 90 }} />
          </>
        }
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      />

      {/* Modal VIP dùng chung */}
      <VipUpgradeModal
        visible={crownModalVisible}
        tool={selectedLockedTool}
        onClose={() => {
          setCrownModalVisible(false);
          setSelectedLockedTool(null);
        }}
        onLoginPress={() => navigation.navigate('Login')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  reorderToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  reorderToggleText: {
    fontSize: 13,
    fontWeight: '800',
  },
  reorderActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    gap: 8,
  },
  reorderHintText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  // Lưới 3 tiện ích / hàng
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 18,
  },
  gridItemWrapper: {
    width: '31.3%',
  },
  gridItemReordering: {
    marginBottom: 4,
  },
  gridCard: {
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    minHeight: 104,
    position: 'relative',
  },
  gridLockBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 8,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.4)',
  },
  gridIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 16,
    minHeight: 32,
  },
  arrowControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 5,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
  },
  arrowBtn: {
    padding: 4,
  },
  orderIndexText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

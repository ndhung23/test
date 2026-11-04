import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform, StatusBar, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { radius, useTheme } from '../theme';
import { ROLE_CONFIG } from '../constants/roles';
import { useAuth } from '../features/auth/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const FAVICON_ICON = require('../../assets/favicon1.png');

// Hook tiện ích né tai thỏ (Notch) & Dynamic Island của iPhone trên mọi môi trường
export function useSafeTop() {
  const insets = useSafeAreaInsets();
  // Tối thiểu 52px trên iOS để né hoàn toàn tai thỏ / Dynamic Island
  return Math.max(insets.top, Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight || 28));
}

// Huy hiệu vai trò người dùng (Free, VIP Gold, Admin)
export function RoleBadge({ role }) {
  const cfg = (role && ROLE_CONFIG[role]) || ROLE_CONFIG.free;
  return (
    <View style={[styles.roleBadgeBox, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Ionicons
        name={cfg.icon === 'crown' ? 'sparkles' : cfg.icon}
        size={11}
        color={cfg.color}
        style={{ marginRight: 4 }}
      />
      <Text style={[styles.roleBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// 1. Header chuẩn Derot (Logo favicon1.png bo tròn + chữ vàng + crown vàng + settings + Role badge)
export function DerotHeader({ title = 'ToolKit', userRole, onCrownPress, onSettingsPress, onLoginPress }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const safeTop = useSafeTop();

  return (
    <View style={[styles.headerContainer, { paddingTop: safeTop + 8 }]}>
      <View style={styles.headerLeft}>
        <View style={styles.headerLogoWrapper}>
          <Image source={FAVICON_ICON} style={styles.headerLogo} resizeMode="contain" />
        </View>
        <View>
          <Text style={[styles.headerTitle, { color: colors.primary }]}>
            {title} <Text style={styles.headerSparkle}>✨</Text>
          </Text>
          {userRole ? (
            <RoleBadge role={userRole} />
          ) : (
            <Pressable
              onPress={onLoginPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 208, 0, 0.12)',
                borderColor: 'rgba(255, 208, 0, 0.3)',
                borderWidth: 1,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 8,
                alignSelf: 'flex-start',
                marginTop: 2,
              }}
              hitSlop={6}
            >
              <Ionicons name="log-in-outline" size={11} color="#FFD000" style={{ marginRight: 3 }} />
              <Text style={{ color: '#FFD000', fontSize: 10, fontWeight: '800' }}>
                {t('ui.loginBtn', {}, 'ĐĂNG NHẬP')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.headerRight}>
        <Pressable
          onPress={onCrownPress}
          style={[styles.crownButton, { backgroundColor: colors.crownBg || colors.primary }]}
          hitSlop={8}
        >
          <MaterialCommunityIcons name="crown" size={22} color={colors.crownIcon || '#121214'} />
        </Pressable>

        <Pressable
          onPress={onSettingsPress}
          style={[styles.gearButton, { backgroundColor: colors.gearBg || '#2B2B32' }]}
          hitSlop={8}
        >
          <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

// Header dùng chung cho các màn hình chi tiết (Né tai thỏ + Nút Back/Settings)
export function ScreenHeader({ title, onBack, rightAction }) {
  const { colors } = useTheme();
  const safeTop = useSafeTop();

  const renderRight = () => {
    if (!rightAction) return null;
    if (React.isValidElement(rightAction)) {
      return rightAction;
    }
    if (typeof rightAction === 'object' && rightAction.icon && rightAction.onPress) {
      return (
        <Pressable onPress={rightAction.onPress} hitSlop={10} style={{ padding: 4 }}>
          <Ionicons name={rightAction.icon} size={24} color={colors.primary} />
        </Pressable>
      );
    }
    return null;
  };

  return (
    <View style={[styles.screenHeaderContainer, { paddingTop: safeTop + 8 }]}>
      <View style={styles.screenHeaderLeft}>
        {onBack && (
          <Pressable onPress={onBack} style={styles.backButton} hitSlop={10}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
        )}
        <Text style={[styles.screenHeaderTitle, { color: colors.primary }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.screenHeaderRight}>
        {renderRight()}
      </View>
    </View>
  );
}

// 2. Vòng tròn chỉ số tiện ích sẵn sàng (5/5 tiện ích)
export function FocusGauge({ score = '5/5', label = 'Tiện ích sẵn sàng', onPress }) {
  const { colors } = useTheme();

  return (
    <Pressable onPress={onPress} style={styles.gaugeWrapper}>
      <View style={[styles.gaugeOuterRing, { borderColor: colors.primary }]}>
        <View style={[styles.gaugeInnerCircle, { backgroundColor: colors.circleBg || '#2A2A30' }]}>
          <Text style={[styles.gaugeNumber, { color: colors.text }]}>{score}</Text>
          <Text style={[styles.gaugeLabel, { color: colors.primary }]}>{label}</Text>
        </View>
      </View>
    </Pressable>
  );
}

// 3. Card trợ lý ToolKit với Mascot favicon1.png bo tròn hoàn hảo
export function MindInsightCard({
  title = 'ToolKit Assistant',
  desc = 'Các tiện ích thông minh đã sẵn sàng phục vụ bạn.',
  onPress,
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.insightCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.insightImageContainer}>
        <Image source={FAVICON_ICON} style={styles.insightMascot} resizeMode="contain" />
      </View>
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.insightDesc, { color: colors.sub }]}>{desc}</Text>
      </View>
    </Pressable>
  );
}

// 4. Card Tiến độ tính năng
export function AchievementCard({
  title = 'Tính năng hệ thống • 8 đã sẵn sàng',
  subtitle = 'Ảnh PDF, QR, Auto Click, AI & Quản lý',
  progress = 1.0,
  onPress,
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.achievementCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.hexagonIcon}>
        <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
      </View>

      <View style={styles.achievementContent}>
        <Text style={[styles.achievementTitle, { color: colors.text }]}>{title}</Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min(100, Math.max(0, progress * 100))}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
        <Text style={[styles.achievementSubtitle, { color: colors.sub }]}>{subtitle}</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.sub} style={styles.chevron} />
    </Pressable>
  );
}

// 5. Thẻ tính năng dạng lưới (Grid Card)
export function ToolCard({ tool, onPress }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.iconBoxGrid,
          { backgroundColor: tool.color + '22' },
          tool.imageIcon && { backgroundColor: 'transparent' },
        ]}
      >
        {tool.imageIcon ? (
          <Image source={tool.imageIcon} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Ionicons name={tool.icon} size={24} color={tool.color} />
        )}
      </View>
      <Text style={[styles.toolCardTitle, { color: colors.text }]} numberOfLines={2}>
        {t(`tools.${tool.id}.shortTitle`, {}, tool.shortTitle || tool.title)}
      </Text>
      {tool.badge && (
        <View style={[styles.badgePill, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
          <Text style={[styles.badgePillText, { color: colors.primary }]}>
            {t(`tools.${tool.id}.badge`, {}, tool.badge)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// 6. Dòng tiện ích dạng danh sách (List Row) kèm trạng thái Locked
export function ToolRow({ tool, locked = false, onPress }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolRow,
        {
          backgroundColor: colors.card,
          borderColor: locked ? 'rgba(255, 208, 0, 0.35)' : colors.cardBorder,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBoxRow,
          { backgroundColor: locked ? 'rgba(255, 208, 0, 0.12)' : tool.color + '22' },
          tool.imageIcon && { backgroundColor: 'transparent' },
        ]}
      >
        {tool.imageIcon ? (
          <Image source={tool.imageIcon} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <Ionicons name={tool.icon} size={22} color={locked ? '#FFD000' : tool.color} />
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.toolRowTitle, { color: colors.text }]}>
            {t(`tools.${tool.id}.title`, {}, tool.title)}
          </Text>
        </View>
        <Text style={[styles.toolRowDesc, { color: colors.sub }]} numberOfLines={2}>
          {t(`tools.${tool.id}.desc`, {}, tool.desc)}
        </Text>
      </View>
      {locked ? (
        <View style={styles.lockedBadge}>
          <Ionicons name="lock-closed" size={12} color="#FFD000" />
          <Text style={styles.lockedBadgeText}>VIP</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.sub} />
      )}
    </Pressable>
  );
}

// Modal Mời Nâng cấp VIP chuyên nghiệp dùng chung (Hỗ trợ Khách & Thành viên)
export function VipUpgradeModal({ visible, tool, onClose, onLoginPress }) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useLanguage();
  if (!visible) return null;

  const isGuest = !user;
  const toolTitle = tool ? t(`tools.${tool.id}.title`, {}, tool.title) : '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalBox,
            { backgroundColor: colors.card, borderColor: 'rgba(255, 208, 0, 0.4)' },
          ]}
        >
          <View style={[styles.modalCrownIcon, { backgroundColor: colors.primary }]}>
            <MaterialCommunityIcons name="crown" size={34} color="#121214" />
          </View>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isGuest ? t('ui.vipModalTitleGuest') : (tool ? t('ui.vipModalTitleVip') : t('ui.vipModalTitlePrivilege'))}
          </Text>
          <Text style={[styles.modalDesc, { color: colors.sub }]}>
            {isGuest
              ? t('ui.vipModalDescGuest', { title: toolTitle || t('ui.standardAssistantTitle') })
              : (tool
                  ? t('ui.vipModalDescVip', { title: toolTitle })
                  : t('ui.vipModalDescGeneral'))}
          </Text>

          {isGuest && onLoginPress ? (
            <View style={{ width: '100%', gap: 10 }}>
              <Pressable
                onPress={() => {
                  onClose();
                  onLoginPress();
                }}
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalBtnText}>{t('ui.vipModalLoginAction')}</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.sub }]}>{t('ui.vipModalExploreAction')}</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onClose}
              style={[styles.modalBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.modalBtnText}>{t('ui.vipModalUnderstood')}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

// 7. Banner Chia sẻ ToolKit
export function ShareBanner({ onPress }) {
  const { t } = useLanguage();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
      <LinearGradient
        colors={['#FFE57F', '#FFD000', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.shareBanner}
      >
        <View style={styles.shareIconCircle}>
          <Ionicons name="sparkles" size={18} color="#FFD000" />
        </View>
        <Text style={styles.shareTitle}>{t('ui.shareBannerText')}</Text>
        <Ionicons name="chevron-forward" size={20} color="#121214" />
      </LinearGradient>
    </Pressable>
  );
}

// 8. Dòng thông tin dùng cho màn Cài đặt / Cá nhân
export function Row({ icon, label, value, onPress, danger }) {
  const { colors } = useTheme();
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.settingRow,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          opacity: pressed && onPress ? 0.8 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.primary} />
      <Text style={[styles.settingRowLabel, { color: tint }]}>{label}</Text>
      {value ? <Text style={{ color: colors.sub, fontSize: 14 }}>{value}</Text> : null}
      {onPress && !value && <Ionicons name="chevron-forward" size={16} color={colors.sub} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogoWrapper: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1E1E22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
  },
  headerLogo: {
    width: 32,
    height: 32,
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSparkle: {
    fontSize: 20,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Screen Header
  screenHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  screenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
    padding: 4,
  },
  screenHeaderTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  screenHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Gauge
  gaugeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18,
  },
  gaugeOuterRing: {
    width: 206,
    height: 206,
    borderRadius: 103,
    borderWidth: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  gaugeInnerCircle: {
    width: 178,
    height: 178,
    borderRadius: 89,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeNumber: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  gaugeLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },

  // Insight Card (Mascot bo tròn hoàn hảo)
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  insightImageContainer: {
    width: 62,
    height: 62,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 208, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.2)',
  },
  insightMascot: {
    width: 52,
    height: 52,
    borderRadius: 18,
    overflow: 'hidden',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  insightDesc: {
    fontSize: 13.5,
    lineHeight: 19,
  },

  // Achievement Card
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  hexagonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#2F2F38',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#383842',
    marginVertical: 7,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  achievementSubtitle: {
    fontSize: 12.5,
  },
  chevron: {
    marginLeft: 8,
  },

  // Tool Grid Card
  toolCard: {
    width: '48%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconBoxGrid: {
    width: 46,
    height: 46,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  toolCardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    minHeight: 40,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    marginTop: 8,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Tool List Row
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconBoxRow: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toolRowDesc: {
    fontSize: 13,
    marginTop: 3,
    lineHeight: 18,
  },

  // Share Banner
  shareBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    padding: 16,
    marginTop: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  shareIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shareTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#121214',
  },

  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingRowLabel: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    fontWeight: '500',
  },

  // Role Badge Styles
  roleBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 3,
    alignSelf: 'flex-start',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Locked Badge for ToolRow
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 208, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.3)',
    gap: 4,
  },
  lockedBadgeText: {
    color: '#FFD000',
    fontSize: 11,
    fontWeight: '800',
  },

  // Modal Vip Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  modalCrownIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  modalBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#121214',
  },
  modalBtnSecondary: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: 999,
    overflow: 'hidden',
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  modalBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
});


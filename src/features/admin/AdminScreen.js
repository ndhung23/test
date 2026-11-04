import { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, Switch, StyleSheet, Alert, ActivityIndicator, TextInput, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScreenHeader, RoleBadge } from '../../components/ui';
import { useAuth } from '../auth';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';
import { ROLES } from '../../constants/roles';
import { TOOLS } from '../../tools';
import {
  isFirebaseConfigured,
  getAllUsersFromFirestore,
  updateUserRoleInFirestore,
  getFeatureTogglesFromFirestore,
  saveFeatureToggleToFirestore,
} from '../../services/firebase';

const INITIAL_USERS = [];
const ITEMS_PER_PAGE = 10;

export default function AdminScreen({ navigation }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user, toolTiers, updateToolTier, refreshToolTiers } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tools'); // 'tools' | 'users'
  const [userSearch, setUserSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const fbConnected = isFirebaseConfigured();

  // Trạng thái bật/tắt tính năng (Feature Toggles)
  const [featureStatus, setFeatureStatus] = useState(() =>
    TOOLS.reduce((acc, t) => ({ ...acc, [t.id]: true }), {})
  );

  // Danh sách người dùng quản trị
  const [usersList, setUsersList] = useState(INITIAL_USERS);

  // Lọc danh sách người dùng theo từ khóa tìm kiếm
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return usersList;
    const q = userSearch.toLowerCase();
    return usersList.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q))
    );
  }, [usersList, userSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  // Tự động quay về trang 1 khi người dùng đổi từ khóa tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [userSearch]);

  // Điều chỉnh nếu trang hiện tại vượt quá tổng số trang
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Cắt danh sách người dùng cho trang hiện tại (10 items / trang)
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Tải dữ liệu từ Cloud Firestore khi mở màn hình
  useEffect(() => {
    (async () => {
      if (fbConnected) {
        setLoading(true);
        try {
          const [remoteUsers, remoteToggles] = await Promise.all([
            getAllUsersFromFirestore(),
            getFeatureTogglesFromFirestore(),
          ]);
          if (remoteUsers && remoteUsers.length > 0) {
            setUsersList(remoteUsers);
          }
          if (remoteToggles) {
            setFeatureStatus((prev) => ({ ...prev, ...remoteToggles }));
          }
        } catch (e) {
          console.log('[Admin] Lỗi nạp Firestore, sử dụng Fallback:', e?.message);
        } finally {
          setLoading(false);
        }
      }
    })();
  }, [fbConnected]);

  const toggleFeature = async (id) => {
    const nextVal = !featureStatus[id];
    setFeatureStatus((prev) => ({ ...prev, [id]: nextVal }));
    if (fbConnected) {
      await saveFeatureToggleToFirestore(id, nextVal);
    }
  };

  const toggleUserRole = async (userId) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (!targetUser) return;
    const nextRole = targetUser.role === ROLES.FREE ? ROLES.VIP : ROLES.FREE;

    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
    );

    if (fbConnected) {
      await updateUserRoleInFirestore(userId, nextRole);
    }
  };

  // Làm mới dữ liệu từ Cloud Firestore
  const handleRefreshCloudData = async () => {
    if (!fbConnected) {
      Alert.alert('Thông báo', 'Hệ thống đang hoạt động ở chế độ ngoại tuyến (Local).');
      return;
    }
    setLoading(true);
    try {
      const [remoteUsers, remoteToggles] = await Promise.all([
        getAllUsersFromFirestore(),
        getFeatureTogglesFromFirestore(),
        refreshToolTiers(),
      ]);
      if (remoteUsers) setUsersList(remoteUsers);
      if (remoteToggles) setFeatureStatus((prev) => ({ ...prev, ...remoteToggles }));
      Alert.alert('Đồng bộ thành công', 'Đã cập nhật danh sách người dùng và cấu hình VIP mới nhất từ Cloud Firestore.');
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể đồng bộ dữ liệu: ' + (err?.message || 'Lỗi mạng'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTier = async (toolId, currentTier) => {
    const nextTier = currentTier === 'vip' ? 'free' : 'vip';
    await updateToolTier(toolId, nextTier);
    const tool = TOOLS.find((t) => t.id === toolId);
    Alert.alert(
      'Cập nhật thành công',
      nextTier === 'vip'
        ? `Tiện ích "${tool?.title}" hiện đã được đặt thành [YÊU CẦU VIP]. Tài khoản Free sẽ bị khóa.`
        : `Tiện ích "${tool?.title}" hiện đã được mở thành [MIỄN PHÍ]. Tất cả người dùng đều có thể sử dụng.`
    );
  };

  // Bảo vệ bảo mật: Chỉ tài khoản Admin mới được vào trang này
  if (user?.role !== ROLES.ADMIN) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <ScreenHeader
          title={t('settings.admin') || 'Quản trị hệ thống'}
          onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <View style={styles.unauthorizedBox}>
          <View style={styles.unauthorizedIconCircle}>
            <Ionicons name="shield-outline" size={48} color={colors.danger} />
          </View>
          <Text style={[styles.unauthorizedTitle, { color: colors.text }]}>
            Quyền truy cập bị từ chối
          </Text>
          <Text style={[styles.unauthorizedDesc, { color: colors.sub }]}>
            Trang Quản trị hệ thống và tính năng thiết lập phân quyền chỉ dành riêng cho tài khoản Quản trị viên (Admin).
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.backBtnText}>Quay lại</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScreenHeader
        title={t('settings.admin') ? `${t('settings.admin')} (Admin)` : 'Quản trị hệ thống (Admin)'}
        onBack={navigation?.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <FlatList
        data={[]}
        renderItem={null}
        ListHeaderComponent={
          <>
            {/* Banner Admin Info & Firebase Status */}
        <View
          style={[
            styles.adminCard,
            { backgroundColor: colors.card, borderColor: 'rgba(239, 68, 68, 0.4)' },
          ]}
        >
          <View style={styles.adminCardTop}>
            <View style={styles.adminIconBox}>
              <Ionicons name="shield-checkmark" size={26} color="#EF4444" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.adminTitle}>Quyền Quản trị viên</Text>
                <RoleBadge role={user?.role} />
              </View>
              <Text style={[styles.adminDesc, { color: colors.sub }]}>
                {user?.email} • Toàn quyền cấu hình & kiểm soát ứng dụng
              </Text>

              {/* Huy hiệu trạng thái kết nối Database */}
              <View
                style={[
                  styles.dbStatusPill,
                  {
                    backgroundColor: fbConnected
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                    borderColor: fbConnected ? '#10B981' : '#F59E0B',
                  },
                ]}
              >
                <Ionicons
                  name={fbConnected ? 'cloud-done' : 'cloud-offline'}
                  size={12}
                  color={fbConnected ? '#10B981' : '#F59E0B'}
                />
                <Text
                  style={[
                    styles.dbStatusText,
                    { color: fbConnected ? '#10B981' : '#F59E0B' },
                  ]}
                >
                  {fbConnected
                    ? 'Cloud Firestore: Đã kết nối Database'
                    : 'Chế độ an toàn: Fallback Database (Local Mock)'}
                </Text>
              </View>
            </View>
          </View>

          {/* Nút bấm làm mới dữ liệu từ Firestore */}
          <Pressable
            onPress={handleRefreshCloudData}
            disabled={loading}
            style={[styles.seedCloudBtn, { backgroundColor: colors.primary }]}
          >
            {loading ? (
              <ActivityIndicator color="#121214" size="small" />
            ) : (
              <>
                <Ionicons name="sync" size={16} color="#121214" />
                <Text style={styles.seedCloudBtnText}>Làm mới danh sách từ Cloud Firestore</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Thanh chuyển phân chia Tab: Các tiện ích vs User */}
        <View
          style={[
            styles.tabSegmentContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <Pressable
            onPress={() => setActiveTab('tools')}
            style={[
              styles.tabSegmentButton,
              activeTab === 'tools' && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="construct-outline"
              size={17}
              color={activeTab === 'tools' ? '#121214' : colors.sub}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'tools' ? '#121214' : colors.sub },
              ]}
            >
              Các tiện ích ({TOOLS.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('users')}
            style={[
              styles.tabSegmentButton,
              activeTab === 'users' && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={17}
              color={activeTab === 'users' ? '#121214' : colors.sub}
            />
            <Text
              style={[
                styles.tabSegmentText,
                { color: activeTab === 'users' ? '#121214' : colors.sub },
              ]}
            >
              Quản lý User ({usersList.length})
            </Text>
          </Pressable>
        </View>

        {activeTab === 'tools' ? (
          <>
            {/* 1. Điều khiển trạng thái các tiện ích (Feature Flags) */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Trạng thái hoạt động các tiện ích
            </Text>
            <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {TOOLS.map((t, idx) => {
                const isEnabled = featureStatus[t.id];
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.toolToggleRow,
                      {
                        borderBottomWidth: idx < TOOLS.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.toolIconCircle, { backgroundColor: t.imageIcon ? 'transparent' : t.color + '22' }]}>
                      {t.imageIcon ? (
                        <Image source={t.imageIcon} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                      ) : (
                        <Ionicons name={t.icon} size={20} color={t.color} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.toolToggleName, { color: colors.text }]}>{t.title}</Text>
                      <Text style={[styles.toolToggleSub, { color: isEnabled ? '#10B981' : colors.danger }]}>
                        {isEnabled ? '● Đang hoạt động' : '○ Tạm khóa bảo trì'}
                      </Text>
                    </View>
                    <Switch
                      value={isEnabled}
                      onValueChange={() => toggleFeature(t.id)}
                      trackColor={{ false: '#3E3E42', true: colors.primary }}
                      thumbColor={isEnabled ? '#121214' : '#9E9EA7'}
                    />
                  </View>
                );
              })}
            </View>

            {/* 2. Cấu hình yêu cầu VIP cho tiện ích (VIP / Free Tier) */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                Cấu hình tiện ích VIP / Miễn phí
              </Text>
              <View style={[styles.badgePillSmall, { backgroundColor: 'rgba(255, 208, 0, 0.15)' }]}>
                <Text style={{ color: '#FFD000', fontSize: 11, fontWeight: '800' }}>RBAC TIERS</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.sub }]}>
              Chỉ định tiện ích nào yêu cầu quyền VIP mới được dùng, tiện ích nào mở miễn phí cho tất cả.
            </Text>

            <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {TOOLS.map((t, idx) => {
                const currentTier = toolTiers?.[t.id] || t.tier || 'free';
                const isVipTier = currentTier === 'vip';
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.toolTierRow,
                      {
                        borderBottomWidth: idx < TOOLS.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={[styles.toolIconCircle, { backgroundColor: t.imageIcon ? 'transparent' : t.color + '22' }]}>
                      {t.imageIcon ? (
                        <Image source={t.imageIcon} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
                      ) : (
                        <Ionicons name={t.icon} size={20} color={t.color} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.toolToggleName, { color: colors.text }]}>{t.title}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View
                          style={[
                            styles.tierBadge,
                            {
                              backgroundColor: isVipTier ? 'rgba(255, 208, 0, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                              borderColor: isVipTier ? '#FFD000' : '#10B981',
                            },
                          ]}
                        >
                          <Ionicons
                            name={isVipTier ? 'sparkles' : 'checkmark-circle'}
                            size={11}
                            color={isVipTier ? '#FFD000' : '#10B981'}
                          />
                          <Text
                            style={[
                              styles.tierBadgeText,
                              { color: isVipTier ? '#FFD000' : '#10B981' },
                            ]}
                          >
                            {isVipTier ? 'Yêu cầu VIP' : 'Miễn phí'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Nút chuyển đổi trạng thái VIP / Free */}
                    <Pressable
                      onPress={() => handleToggleTier(t.id, currentTier)}
                      style={[
                        styles.tierToggleBtn,
                        {
                          backgroundColor: isVipTier ? 'rgba(255, 208, 0, 0.18)' : colors.bg,
                          borderColor: isVipTier ? '#FFD000' : colors.cardBorder,
                        },
                      ]}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={isVipTier ? 'lock-closed' : 'lock-open-outline'}
                        size={13}
                        color={isVipTier ? '#FFD000' : colors.sub}
                      />
                      <Text
                        style={[
                          styles.tierToggleBtnText,
                          { color: isVipTier ? '#FFD000' : colors.text },
                        ]}
                      >
                        {isVipTier ? 'Đang là VIP' : 'Đang Free'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            {/* 1. Thống kê hệ thống */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tổng quan tài khoản</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.statNum, { color: colors.text }]}>{usersList.length}</Text>
                <Text style={[styles.statLabel, { color: colors.sub }]}>Tổng người dùng</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.statNum, { color: '#FFD000' }]}>
                  {usersList.filter((u) => u.role === ROLES.VIP).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.sub }]}>Thành viên VIP</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.statNum, { color: '#10B981' }]}>
                  {usersList.filter((u) => u.role === ROLES.FREE).length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.sub }]}>Người dùng Free</Text>
              </View>
            </View>

            {/* 2. Quản lý phân quyền người dùng */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
                Danh sách & Phân quyền ({filteredUsers.length})
              </Text>
              {totalPages > 1 && (
                <View style={[styles.badgePillSmall, { backgroundColor: 'rgba(255, 208, 0, 0.15)' }]}>
                  <Text style={{ color: '#FFD000', fontSize: 11, fontWeight: '800' }}>
                    Trang {currentPage}/{totalPages}
                  </Text>
                </View>
              )}
            </View>

            {/* Thanh tìm kiếm người dùng */}
            <View style={[styles.searchUserBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="search" size={16} color={colors.sub} />
              <TextInput
                placeholder="Tìm kiếm theo tên hoặc email..."
                placeholderTextColor={colors.sub}
                value={userSearch}
                onChangeText={setUserSearch}
                style={[styles.searchUserInput, { color: colors.text }]}
              />
              {userSearch.length > 0 && (
                <Pressable onPress={() => setUserSearch('')} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={colors.sub} />
                </Pressable>
              )}
            </View>

            <View style={[styles.cardGroup, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              {paginatedUsers.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Ionicons name="people-outline" size={32} color={colors.sub} />
                  <Text style={{ color: colors.sub, marginTop: 8, fontSize: 13 }}>
                    {userSearch.length > 0
                      ? 'Không tìm thấy người dùng phù hợp với từ khóa.'
                      : 'Chưa có tài khoản nào trong danh sách.'}
                  </Text>
                </View>
              ) : (
                paginatedUsers.map((u, idx) => (
                  <View
                    key={u.id || u.uid || idx}
                    style={[
                      styles.userRow,
                      {
                        borderBottomWidth: idx < paginatedUsers.length - 1 ? 1 : 0,
                        borderBottomColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.userAvatar}>
                      <Ionicons name="person-circle" size={38} color={colors.sub} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.userName, { color: colors.text }]}>{u.name || 'Người dùng'}</Text>
                      <Text style={[styles.userEmail, { color: colors.sub }]}>{u.email}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <RoleBadge role={u.role} />
                      {u.role !== ROLES.ADMIN && (
                        <Pressable
                          onPress={() => toggleUserRole(u.id || u.uid)}
                          style={styles.roleActionBtn}
                          hitSlop={6}
                        >
                          <Text style={styles.roleActionBtnText}>
                            {u.role === ROLES.FREE ? 'Cấp VIP' : 'Hạ Free'}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Điều hướng phân trang (10 items / trang) */}
            {totalPages > 1 && (
              <View style={styles.paginationRow}>
                <Pressable
                  onPress={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={[
                    styles.pageNavBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      opacity: currentPage === 1 ? 0.35 : 1,
                    },
                  ]}
                  hitSlop={8}
                >
                  <Ionicons name="chevron-back" size={16} color={colors.text} />
                  <Text style={[styles.pageNavText, { color: colors.text }]}>Trang trước</Text>
                </Pressable>

                <View style={styles.pageInfoBox}>
                  <Text style={[styles.pageInfoText, { color: colors.text }]}>
                    Trang <Text style={{ color: colors.primary, fontWeight: '800' }}>{currentPage}</Text> / {totalPages}
                  </Text>
                  <Text style={[styles.pageSubText, { color: colors.sub }]}>
                    ({(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} trong {filteredUsers.length} user)
                  </Text>
                </View>

                <Pressable
                  onPress={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={[
                    styles.pageNavBtn,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.cardBorder,
                      opacity: currentPage === totalPages ? 0.35 : 1,
                    },
                  ]}
                  hitSlop={8}
                >
                  <Text style={[styles.pageNavText, { color: colors.text }]}>Trang sau</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.text} />
                </Pressable>
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
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
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  adminCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    marginBottom: 20,
    overflow: 'hidden',
  },
  adminCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adminIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  adminDesc: {
    fontSize: 12.5,
    marginTop: 4,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
    overflow: 'hidden',
  },
  statNum: {
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  cardGroup: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  toolToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  toolIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toolToggleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  toolToggleSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  userAvatar: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  roleActionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#26262C',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#383842',
  },
  roleActionBtnText: {
    fontSize: 11,
    color: '#FFD000',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    marginBottom: 12,
    lineHeight: 18,
  },
  badgePillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  toolTierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  tierToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  tierToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dbStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dbStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seedCloudBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
    overflow: 'hidden',
  },
  seedCloudBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#121214',
  },
  unauthorizedBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  unauthorizedIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  unauthorizedDesc: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
  },
  backBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    color: '#121214',
    fontSize: 14,
    fontWeight: '700',
  },
  tabSegmentContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tabSegmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabSegmentText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  searchUserBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
    gap: 8,
  },
  searchUserInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingHorizontal: 2,
  },
  pageNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pageNavText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pageInfoBox: {
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageSubText: {
    fontSize: 11,
    marginTop: 2,
  },
});



import { useState } from 'react';
import { View, TextInput, FlatList, Text, StyleSheet, Pressable, Image } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ToolRow, ScreenHeader, VipUpgradeModal } from '../../components/ui';
import { TOOLS, openTool } from '../../tools';
import { useTheme } from '../../theme';
import { useAuth } from '../auth';
import { useLanguage } from '../../context/LanguageContext';
import { canAccessTool } from '../../constants/roles';

export default function ToolsScreen({ navigation }) {
  const { colors } = useTheme();
  const { user, toolTiers } = useAuth();
  const { t } = useLanguage();
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  const query = q.trim().toLowerCase();
  const data = TOOLS.filter((item) => {
    if (!query) return true;
    const titleVi = (item.title || '').toLowerCase();
    const descVi = (item.desc || '').toLowerCase();
    const titleTrans = t(`tools.${item.id}.title`, {}, '').toLowerCase();
    const descTrans = t(`tools.${item.id}.desc`, {}, '').toLowerCase();
    return (
      titleVi.includes(query) ||
      descVi.includes(query) ||
      titleTrans.includes(query) ||
      descTrans.includes(query)
    );
  });

  const handleToolPress = (tool) => {
    openTool(navigation, tool, user, (lockedTool) => {
      setSelectedTool(lockedTool);
      setUpgradeModalVisible(true);
    }, toolTiers);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      {/* Header né tai thỏ iPhone */}
      <ScreenHeader
        title={t('toolsScreen.title')}
        rightAction={
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            style={styles.iconButton}
            hitSlop={8}
          >
            <Ionicons name="settings-sharp" size={20} color="#FFFFFF" />
          </Pressable>
        }
      />

      {/* Featured Banner: Chuyển ảnh thành PDF */}
      <Pressable
        onPress={() => navigation.navigate('ImageToPdf')}
        style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.primary }]}
      >
        <View style={styles.featuredLeft}>
          <View style={[styles.featuredIcon, { backgroundColor: 'transparent' }]}>
            <Image
              source={require('../../../assets/icon_pdf.png')}
              style={{ width: '100%', height: '100%', borderRadius: 14 }}
              resizeMode="cover"
            />
          </View>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={styles.tagHot}>
              <Text style={styles.tagHotText}>{t('toolsScreen.featuredBadge')}</Text>
            </View>
            <Text style={styles.featuredTitle}>{t('toolsScreen.featuredTitle')}</Text>
            <Text style={[styles.featuredSubtitle, { color: colors.sub }]}>
              {t('toolsScreen.featuredDesc')}
            </Text>
          </View>
        </View>

        <View style={[styles.featuredAction, { backgroundColor: colors.primary }]}>
          <Text style={styles.featuredActionText}>{t('toolsScreen.featuredAction')}</Text>
          <Ionicons name="arrow-forward" size={16} color="#121214" />
        </View>
      </Pressable>

      {/* Thanh tìm kiếm */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.cardBorder,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={focused ? colors.primary : colors.sub} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('toolsScreen.searchPlaceholder', { count: TOOLS.length })}
          placeholderTextColor={colors.sub}
          style={[styles.searchInput, { color: colors.text }]}
        />
        {q.length > 0 && (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.sub} />
          </Pressable>
        )}
      </View>

      {/* Danh sách tiện ích kèm trạng thái khóa */}
      <FlatList
        data={data}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isLocked = !canAccessTool(user, item, toolTiers);
          return (
            <ToolRow
              tool={item}
              locked={isLocked}
              onPress={() => handleToolPress(item)}
            />
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.sub} />
            <Text style={[styles.emptyText, { color: colors.sub }]}>
              {t('toolsScreen.empty')}
            </Text>
          </View>
        }
        ListFooterComponent={<View style={{ height: 100 }} />}
      />

      <VipUpgradeModal
        visible={upgradeModalVisible}
        tool={selectedTool}
        onClose={() => {
          setUpgradeModalVisible(false);
          setSelectedTool(null);
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#26262C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  featuredCard: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  featuredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featuredIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tagHot: {
    alignSelf: 'flex-start',
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
    overflow: 'hidden',
  },
  tagHotText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  featuredTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  featuredSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  featuredAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 6,
    overflow: 'hidden',
  },
  featuredActionText: {
    color: '#121214',
    fontSize: 14,
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    paddingLeft: 10,
    fontSize: 15,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
  },
});

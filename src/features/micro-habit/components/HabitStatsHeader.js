import React from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { styles } from '../microHabitStyles';

export default function HabitStatsHeader({
  colors,
  t,
  stats,
  activeStatusFilter,
  setActiveStatusFilter,
  searchInput,
  setSearchInput,
  activeFilter,
  setActiveFilter,
  filterTabs,
  hasActiveFilters,
  clearFilters,
  filteredHabitsCount,
  debouncedSearch,
  onOpenDebugNotifs,
  onOpenAiModal,
  onOpenAddModal,
}) {
  return (
    <>
      {/* Thẻ Thống kê Tổng quan */}
      <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.statsHeader}>
          <View style={styles.statsActionsRow}>
            <Pressable
              onPress={onOpenDebugNotifs}
              style={[styles.debugNotifTopBtn, { backgroundColor: colors.cardElevated, borderColor: colors.cardBorder }]}
              accessibilityLabel="Kiểm tra lịch báo hệ điều hành"
            >
              <Ionicons name="notifications-outline" size={13} color={colors.sub} />
            </Pressable>
            <Pressable
              onPress={onOpenAiModal}
              style={[styles.aiSuggestTopBtn, { backgroundColor: '#7C3AED' }]}
            >
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
              <Text style={styles.aiSuggestTopBtnText}>{t('microHabit.aiSuggest') || 'AI Gợi ý'}</Text>
            </Pressable>
            <Pressable
              onPress={onOpenAddModal}
              style={[styles.addTopBtn, { backgroundColor: '#10B981' }]}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addTopBtnText}>{t('microHabit.addHabit') || 'Thêm việc'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveStatusFilter((current) => current === 'overdue' ? null : 'overdue')}
            style={[styles.statBox, { backgroundColor: activeStatusFilter === 'overdue' ? 'rgba(239, 68, 68, 0.24)' : 'rgba(239, 68, 68, 0.1)', borderColor: activeStatusFilter === 'overdue' ? '#EF4444' : 'transparent' }]}
          >
            <Text style={[styles.statNumber, { color: '#EF4444' }]}>{stats.overdue}</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]} numberOfLines={1} adjustsFontSizeToFit>{t('microHabit.urgent') || 'Quá hạn'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveStatusFilter((current) => current === 'warning' ? null : 'warning')}
            style={[styles.statBox, { backgroundColor: activeStatusFilter === 'warning' ? 'rgba(245, 158, 11, 0.24)' : 'rgba(245, 158, 11, 0.1)', borderColor: activeStatusFilter === 'warning' ? '#F59E0B' : 'transparent' }]}
          >
            <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{stats.warning}</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]} numberOfLines={1} adjustsFontSizeToFit>{t('microHabit.dueSoon') || 'Sắp đến hạn'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveStatusFilter((current) => current === 'safe' ? null : 'safe')}
            style={[styles.statBox, { backgroundColor: activeStatusFilter === 'safe' ? 'rgba(16, 185, 129, 0.24)' : 'rgba(16, 185, 129, 0.1)', borderColor: activeStatusFilter === 'safe' ? '#10B981' : 'transparent' }]}
          >
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{stats.safe}</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]} numberOfLines={1} adjustsFontSizeToFit>{t('microHabit.safe') || 'Chưa đến hạn'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => setActiveStatusFilter((current) => current === 'completed' ? null : 'completed')}
            style={[styles.statBox, { backgroundColor: activeStatusFilter === 'completed' ? 'rgba(99, 102, 241, 0.24)' : colors.cardElevated, borderColor: activeStatusFilter === 'completed' ? '#818CF8' : 'transparent' }]}
          >
            <Text style={[styles.statNumber, { color: '#A5B4FC' }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.sub }]} numberOfLines={1} adjustsFontSizeToFit>{t('microHabit.todayDone') || 'Đã xong'}</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <Ionicons name="search-outline" size={19} color={colors.sub} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder={t('microHabit.searchPlaceholder') || 'Tìm kiếm việc vặt...'}
          placeholderTextColor={colors.sub}
          style={[styles.searchInput, { color: colors.text }]}
          returnKeyType="search"
          accessibilityLabel="Tìm tên việc hoặc danh mục"
        />
        {searchInput ? <Pressable onPress={() => setSearchInput('')} hitSlop={8}><Ionicons name="close-circle" size={19} color={colors.sub} /></Pressable> : null}
      </View>

      {/* Bộ lọc Tab */}
      <View style={styles.filterRow}>
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveFilter(tab.id)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isActive ? '#10B981' : colors.card,
                  borderColor: isActive ? '#10B981' : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? '#FFFFFF' : colors.sub },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hasActiveFilters ? (
        <View style={styles.filterSummaryRow}>
          <Text style={[styles.filterSummaryText, { color: colors.sub }]} numberOfLines={1}>
            {[
              activeStatusFilter === 'overdue' ? 'Quá hạn' : activeStatusFilter === 'warning' ? 'Sắp đến hạn' : activeStatusFilter === 'safe' ? 'Chưa đến hạn' : null,
              activeFilter !== 'all' ? filterTabs.find((tab) => tab.id === activeFilter)?.label : null,
              debouncedSearch ? `“${debouncedSearch}”` : null,
              `${filteredHabitsCount} việc`
            ].filter(Boolean).join(' · ')}
          </Text>
          <Pressable onPress={clearFilters} hitSlop={8}><Text style={{ color: colors.primary, fontWeight: '800' }}>{t('microHabit.clearFilter') || 'Xóa lọc'}</Text></Pressable>
        </View>
      ) : null}
    </>
  );
}

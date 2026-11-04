// src/features/fap/FapGradeView.js
// Giao diện Bảng điểm Sinh viên FAP - GPA kỳ, danh sách môn học & điểm thành phần

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeTop } from '../../../components/ui';
import {
  GRADE_STATUS,
  calculateGpaSummary,
} from './fapGradeHelper';

export default function FapGradeView({
  grades = [],
  colors,
  onSyncGrades,
  onSimulateGradeUpdate,
  headerComponent = null,
}) {
  const safeTop = useSafeTop();
  const insets = useSafeAreaInsets();
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const summary = calculateGpaSummary(grades);

  // Lọc môn học theo tab đã chọn
  const filteredGrades = grades.filter((g) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'IN_PROGRESS') {
      return g.status === GRADE_STATUS.IN_PROGRESS || g.averageMark === null;
    }
    if (filterStatus === 'PASSED') {
      return g.status === GRADE_STATUS.PASSED;
    }
    if (filterStatus === 'FAILED') {
      return g.status === GRADE_STATUS.FAILED;
    }
    return true;
  });

  const handleOpenDetail = (course) => {
    setSelectedCourse(course);
    setDetailModalVisible(true);
  };

  const getStatusBadge = (status, avg) => {
    if (status === GRADE_STATUS.PASSED || (avg !== null && Number(avg) >= 5.0)) {
      return {
        label: 'Qua môn',
        bg: 'rgba(16, 185, 129, 0.14)',
        border: '#10B981',
        text: '#10B981',
        icon: 'checkmark-circle-outline',
      };
    }
    if (status === GRADE_STATUS.FAILED || (avg !== null && Number(avg) < 5.0)) {
      return {
        label: 'Học lại',
        bg: 'rgba(239, 68, 68, 0.14)',
        border: '#EF4444',
        text: '#EF4444',
        icon: 'close-circle-outline',
      };
    }
    return {
      label: 'Đang học',
      bg: 'rgba(245, 158, 11, 0.14)',
      border: '#F59E0B',
      text: '#F59E0B',
      icon: 'hourglass-outline',
    };
  };

  const renderGradeCard = ({ item }) => {
    const badge = getStatusBadge(item.status, item.averageMark);
    const avgNum = item.averageMark !== null && item.averageMark !== undefined ? Number(item.averageMark) : null;
    const hasComponents = Array.isArray(item.components) && item.components.length > 0;

    return (
      <Pressable
        onPress={() => handleOpenDetail(item)}
        style={({ pressed }) => [
          styles.gradeCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {/* Hàng 1: Mã môn + Số tín chỉ + Badge Trạng thái */}
        <View style={styles.cardHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <View style={[styles.codeBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.codeBadgeText}>{item.subjectCode}</Text>
            </View>
            <Text style={[styles.creditsText, { color: colors.sub }]}>
              {item.credits || 3} Tín chỉ
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Ionicons name={badge.icon} size={12} color={badge.text} />
            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Hàng 2: Tên môn */}
        <Text style={[styles.subjectName, { color: colors.text }]} numberOfLines={2}>
          {item.subjectName || item.subjectCode}
        </Text>

        {/* Hàng 3: Điểm trung bình môn & Số đầu điểm thành phần */}
        <View style={[styles.scoreRow, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={styles.avgBox}>
            <Text style={[styles.avgLabel, { color: colors.sub }]}>Điểm TB Môn:</Text>
            <Text
              style={[
                styles.avgValue,
                { color: avgNum === null ? colors.sub : avgNum >= 5.0 ? '#10B981' : '#EF4444' },
              ]}
            >
              {avgNum !== null ? avgNum.toFixed(1) : 'Chưa có'}
            </Text>
          </View>

          <View style={styles.componentCountWrap}>
            <Text style={[styles.componentCountText, { color: colors.sub }]}>
              {hasComponents ? `${item.components.length} đầu điểm` : 'Xem chi tiết'}
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.sub} />
          </View>
        </View>
      </Pressable>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContainer}>
      {headerComponent}

      {/* 1. Thẻ tổng quan GPA & Tín chỉ */}
      <View style={[styles.gpaHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.gpaHeroTop}>
          <View>
            <Text style={[styles.gpaHeroSub, { color: colors.sub }]}>ĐIỂM TRUNG BÌNH HỌC KỲ</Text>
            <View style={styles.gpaValueRow}>
              <Text style={[styles.gpaNumber, { color: colors.primary }]}>{summary.gpa.toFixed(2)}</Text>
              <Text style={[styles.gpaMax, { color: colors.sub }]}>/ 10.0</Text>
            </View>
          </View>

          <View style={[styles.gpaTrophyWrap, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
            <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
          </View>
        </View>

        {/* 3 Chỉ số nhỏ: Tín chỉ - Môn đỗ - Môn đang học */}
        <View style={[styles.statsRow, { borderTopColor: colors.cardBorder }]}>
          <View style={styles.statCol}>
            <Text style={[styles.statColNum, { color: colors.text }]}>{summary.totalCredits}</Text>
            <Text style={[styles.statColLabel, { color: colors.sub }]}>Tín chỉ</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statColNum, { color: '#10B981' }]}>{summary.passedCount}</Text>
            <Text style={[styles.statColLabel, { color: colors.sub }]}>Đã qua</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.cardBorder }]} />

          <View style={styles.statCol}>
            <Text style={[styles.statColNum, { color: '#F59E0B' }]}>{summary.inProgressCount}</Text>
            <Text style={[styles.statColLabel, { color: colors.sub }]}>Đang học</Text>
          </View>
        </View>
      </View>

      {/* 2. Thanh hành động Đồng bộ FAP & Test thông báo */}
      <View style={styles.actionRow}>
        <Pressable
          onPress={onSyncGrades}
          style={[styles.syncActionBtn, { backgroundColor: '#8B5CF6' }]}
        >
          <Ionicons name="cloud-download-outline" size={15} color="#FFFFFF" />
          <Text style={styles.syncActionBtnText}>Đồng bộ FAP (Report/Grade)</Text>
        </Pressable>

        {onSimulateGradeUpdate && (
          <Pressable
            onPress={onSimulateGradeUpdate}
            style={[styles.simulateActionBtn, { borderColor: colors.cardBorder }]}
          >
            <Ionicons name="notifications-outline" size={14} color={colors.sub} />
            <Text style={[styles.simulateActionBtnText, { color: colors.sub }]}>Thử báo điểm</Text>
          </Pressable>
        )}
      </View>

      {/* 3. Bộ lọc trạng thái môn */}
      <View style={styles.filterChipRow}>
        {[
          { key: 'ALL', label: `Tất cả (${grades.length})` },
          { key: 'IN_PROGRESS', label: `Đang học (${summary.inProgressCount})` },
          { key: 'PASSED', label: `Đã qua (${summary.passedCount})` },
          { key: 'FAILED', label: `Học lại (${summary.failedCount})` },
        ].map((f) => {
          const isActive = filterStatus === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilterStatus(f.key)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primary : colors.card,
                  borderColor: isActive ? colors.primary : colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: isActive ? '#121214' : colors.text, fontWeight: isActive ? '800' : '600' },
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGrades}
        keyExtractor={(item, index) => item.id || item.subjectCode || String(index)}
        renderItem={renderGradeCard}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="school-outline" size={40} color={colors.sub} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có dữ liệu Bảng điểm</Text>
            <Text style={[styles.emptySub, { color: colors.sub }]}>
              Nhấn nút bên dưới để mở WebView cổng FAP và tự động lấy toàn bộ bảng điểm học kỳ của bạn!
            </Text>
            <Pressable
              onPress={onSyncGrades}
              style={[styles.emptySyncBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="refresh" size={16} color="#121214" />
              <Text style={styles.emptySyncBtnText}>Cào Bảng điểm từ FAP ngay</Text>
            </Pressable>
          </View>
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom + 30, 60) }]}
        keyboardShouldPersistTaps="handled"
      />

      {/* MODAL XEM CHI TIẾT ĐẦU ĐIỂM THÀNH PHẦN */}
      <Modal
        visible={detailModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.cardBorder,
                paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 12 : (safeTop > 0 ? safeTop : 16),
              },
            ]}
          >
            {/* Header Modal */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.modalSubjectCode, { color: colors.primary }]}>
                    {selectedCourse?.subjectCode}
                  </Text>
                  <Text style={[styles.modalTerm, { color: colors.sub }]}>
                    {selectedCourse?.term || 'Học kỳ này'}
                  </Text>
                </View>
                <Text style={[styles.modalSubjectName, { color: colors.text }]} numberOfLines={2}>
                  {selectedCourse?.subjectName}
                </Text>
              </View>

              <Pressable
                onPress={() => setDetailModalVisible(false)}
                style={[styles.closeBtn, { backgroundColor: colors.bg }]}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Bảng điểm thành phần qua FlatList (tuân thủ cấm ScrollView) */}
            <FlatList
              data={selectedCourse?.components || []}
              keyExtractor={(item, idx) => `${item.name}_${idx}`}
              renderItem={({ item, index }) => (
                <View
                  style={[
                    styles.compRow,
                    {
                      backgroundColor: index % 2 === 0 ? colors.bg : 'transparent',
                      borderBottomColor: colors.cardBorder,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.compName, { color: colors.text }]}>{item.name}</Text>
                    {item.comment ? (
                      <Text style={[styles.compComment, { color: colors.sub }]}>{item.comment}</Text>
                    ) : null}
                  </View>

                  <View style={styles.compWeightWrap}>
                    <Text style={[styles.compWeight, { color: colors.sub }]}>{item.weight || '-'}</Text>
                  </View>

                  <View style={styles.compScoreWrap}>
                    <Text
                      style={[
                        styles.compScore,
                        {
                          color:
                            item.value === null
                              ? colors.sub
                              : Number(item.value) >= 5.0
                              ? '#10B981'
                              : '#EF4444',
                        },
                      ]}
                    >
                      {item.value !== null && item.value !== undefined ? item.value : '-'}
                    </Text>
                  </View>
                </View>
              )}
              ListHeaderComponent={
                <View style={[styles.compTableHeader, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Text style={[styles.compThCol, { flex: 1, color: colors.sub }]}>Đầu điểm</Text>
                  <Text style={[styles.compThCol, { width: 65, textAlign: 'center', color: colors.sub }]}>Trọng số</Text>
                  <Text style={[styles.compThCol, { width: 55, textAlign: 'right', color: colors.sub }]}>Điểm</Text>
                </View>
              }
              ListFooterComponent={
                <View style={[styles.detailFooter, { borderTopColor: colors.cardBorder }]}>
                  <View style={styles.detailAvgRow}>
                    <Text style={[styles.detailAvgLabel, { color: colors.text }]}>Điểm Tổng Kết Môn:</Text>
                    <Text
                      style={[
                        styles.detailAvgNum,
                        {
                          color:
                            selectedCourse?.averageMark === null
                              ? colors.sub
                              : Number(selectedCourse?.averageMark) >= 5.0
                              ? '#10B981'
                              : '#EF4444',
                        },
                      ]}
                    >
                      {selectedCourse?.averageMark !== null && selectedCourse?.averageMark !== undefined
                        ? Number(selectedCourse.averageMark).toFixed(1)
                        : 'Chưa có'}
                    </Text>
                  </View>
                  <Text style={[styles.detailLastSync, { color: colors.sub }]}>
                    Cập nhật lần cuối: {selectedCourse?.lastUpdated || 'Vừa xong'}
                  </Text>
                </View>
              }
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom + 20, 36) }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 14, paddingBottom: 40, gap: 10 },
  headerContainer: { gap: 12, marginBottom: 4 },
  gpaHeroCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  gpaHeroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gpaHeroSub: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  gpaValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  gpaNumber: { fontSize: 32, fontWeight: '900' },
  gpaMax: { fontSize: 14, fontWeight: '700' },
  gpaTrophyWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1 },
  statCol: { flex: 1, alignItems: 'center' },
  statColNum: { fontSize: 16, fontWeight: '900' },
  statColLabel: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  statDivider: { width: 1, height: 24 },
  actionRow: { flexDirection: 'row', gap: 8 },
  syncActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  syncActionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12.5 },
  simulateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  simulateActionBtnText: { fontSize: 11.5, fontWeight: '700' },
  filterChipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  filterChipText: { fontSize: 11.5 },
  gradeCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  codeBadgeText: { color: '#121214', fontWeight: '900', fontSize: 12 },
  creditsText: { fontSize: 11.5, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  subjectName: { fontSize: 13.5, fontWeight: '700', lineHeight: 18 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderRadius: 8, borderWidth: 1 },
  avgBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avgLabel: { fontSize: 12, fontWeight: '600' },
  avgValue: { fontSize: 15, fontWeight: '900' },
  componentCountWrap: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  componentCountText: { fontSize: 11.5, fontWeight: '600' },
  emptyBox: { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 10, marginTop: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  emptySub: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
  emptySyncBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 4 },
  emptySyncBtnText: { color: '#121214', fontWeight: '800', fontSize: 12.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, maxHeight: '82%', gap: 12 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 14, gap: 10 },
  modalSubjectCode: { fontSize: 16, fontWeight: '900' },
  modalTerm: { fontSize: 12, fontWeight: '600' },
  modalSubjectName: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compTableHeader: { flexDirection: 'row', padding: 8, borderRadius: 6, borderWidth: 1, marginBottom: 4 },
  compThCol: { fontSize: 11, fontWeight: '700' },
  compRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 1 },
  compName: { fontSize: 12.5, fontWeight: '700' },
  compComment: { fontSize: 11, marginTop: 1 },
  compWeightWrap: { width: 65, alignItems: 'center' },
  compWeight: { fontSize: 12, fontWeight: '600' },
  compScoreWrap: { width: 55, alignItems: 'flex-end' },
  compScore: { fontSize: 14, fontWeight: '900' },
  detailFooter: { paddingTop: 14, marginTop: 10, borderTopWidth: 1, gap: 4 },
  detailAvgRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailAvgLabel: { fontSize: 14, fontWeight: '800' },
  detailAvgNum: { fontSize: 18, fontWeight: '900' },
  detailLastSync: { fontSize: 11, textAlign: 'right' },
});

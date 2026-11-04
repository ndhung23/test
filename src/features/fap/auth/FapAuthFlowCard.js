// src/screens/tools/fap/FapAuthFlowCard.js
// Thẻ Đăng nhập Cổng FAP Thật (fap.fpt.edu.vn) - Không mock data, kết nối trực tiếp qua WebView

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Linking,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function FapAuthFlowCard({ colors, onOpenWebView, onOpenPasteModal }) {
  const handleOpenBrowser = () => {
    Linking.openURL('https://fap.fpt.edu.vn/ExamSchedule');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Thanh URL biểu tượng bảo mật của trường */}
      <View style={[styles.urlBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
        <Ionicons name="lock-closed" size={13} color="#10B981" />
        <Text style={[styles.urlText, { color: colors.sub }]} numberOfLines={1}>
          https://fap.fpt.edu.vn (Cổng thông tin đào tạo FPT)
        </Text>
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>OFFICIAL</Text>
        </View>
      </View>

      {/* Banner FPT Education */}
      <View style={styles.contentWrap}>
        <View style={styles.fptBrandRow}>
          <View style={[styles.fptBadge, { backgroundColor: '#F37021' }]}>
            <Text style={styles.fptBadgeText}>FPT</Text>
          </View>
          <Text style={styles.fptBrandTitle}>TRƯỜNG ĐẠI HỌC FPT</Text>
        </View>

        <Text style={[styles.mainTitle, { color: colors.text }]}>
          Đăng nhập Tài khoản FAP
        </Text>
        <Text style={[styles.subTitle, { color: colors.sub }]}>
          Đăng nhập trực tiếp bằng email trường cấp (@fpt.edu.vn) hoặc tài khoản FeID thông qua cửa sổ WebView bảo mật để tự động lấy dữ liệu học tập thực tế của bạn:
        </Text>

        {/* 3 tính năng cốt lõi */}
        <View style={styles.featureBox}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="calendar" size={16} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureHeading, { color: colors.text }]}>
                Lịch thi chuẩn thực tế
              </Text>
              <Text style={[styles.featureDesc, { color: colors.sub }]}>
                Tự động cào từ <Text style={{ color: '#3B82F6', fontWeight: '700' }}>fap.fpt.edu.vn/ExamSchedule</Text> và hẹn giờ nhắc nhở trước khi vào phòng thi.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="time" size={16} color="#EAB308" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureHeading, { color: colors.text }]}>
                Thời khóa biểu tuần
              </Text>
              <Text style={[styles.featureDesc, { color: colors.sub }]}>
                Tự động cào từ <Text style={{ color: '#EAB308', fontWeight: '700' }}>fap.fpt.edu.vn/WeeklyTimetable</Text> để theo dõi các ca học theo Slot.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featureHeading, { color: colors.text }]}>
                Cảnh báo Vắng mặt (Absent Alert)
              </Text>
              <Text style={[styles.featureDesc, { color: colors.sub }]}>
                Tự động phát chuông & gửi thông báo đúng <Text style={{ color: '#EF4444', fontWeight: '800' }}>Cuối slot + 10 phút</Text> nếu ca học bị đánh Absent.
              </Text>
            </View>
          </View>
        </View>

        {/* Nút Đăng nhập FAP thật qua WebView */}
        <Pressable
          onPress={onOpenWebView}
          style={[styles.primaryLoginBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="log-in-outline" size={19} color="#121214" />
          <Text style={styles.primaryLoginText}>
            🔐 Đăng nhập FAP thật qua WebView
          </Text>
        </Pressable>

        {/* Nút Dán dữ liệu thủ công / Mở trình duyệt ngoài */}
        <View style={styles.secondaryActionsRow}>
          <Pressable
            onPress={onOpenPasteModal}
            style={[styles.secondaryBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
          >
            <Ionicons name="clipboard-outline" size={15} color={colors.text} />
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Dán dữ liệu</Text>
          </Pressable>

          <Pressable
            onPress={handleOpenBrowser}
            style={[styles.secondaryBtn, { borderColor: colors.cardBorder, backgroundColor: colors.bg }]}
          >
            <Ionicons name="globe-outline" size={15} color="#3B82F6" />
            <Text style={[styles.secondaryBtnText, { color: '#3B82F6' }]}>Web FAP</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  urlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 11.5,
    fontFamily: 'monospace',
  },
  liveTag: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  contentWrap: {
    padding: 16,
    gap: 12,
  },
  fptBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fptBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
  fptBrandTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0066B3',
    letterSpacing: 0.5,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  subTitle: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  featureBox: {
    gap: 10,
    marginVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureHeading: {
    fontSize: 13,
    fontWeight: '800',
  },
  featureDesc: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  primaryLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryLoginText: {
    color: '#121214',
    fontSize: 13.5,
    fontWeight: '900',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

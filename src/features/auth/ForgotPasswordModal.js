import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from './AuthContext';

function ForgotPasswordModalContent({
  onClose,
  initialIdentifier = '',
  onSuccessLogin,
}) {
  const { colors } = useTheme();
  const { requestPasswordResetOtp, verifyOtpAndResetPassword } = useAuth();
  const { isVietnamese } = useLanguage();

  // Các bước: 'email' (Nhập email) -> 'otp' (Nhập OTP & Mật khẩu mới) -> 'success' (Thành công)
  const [step, setStep] = useState('email');
  const [identifier, setIdentifier] = useState(initialIdentifier || '');
  const [otpInput, setOtpInput] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [demoOtpHint, setDemoOtpHint] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 phút = 300s

  // Đồng hồ đếm ngược 5 phút khi ở bước OTP
  useEffect(() => {
    let timer = null;
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Bước 1: Gửi mã xác thực OTP về email
  const handleRequestOtp = async () => {
    const clean = identifier.trim();
    if (!clean) {
      setError(
        isVietnamese
          ? 'Vui lòng nhập địa chỉ email hoặc tên đăng nhập.'
          : 'Please enter your email or username.'
      );
      return;
    }

    setError('');
    setBusy(true);
    try {
      const res = await requestPasswordResetOtp(clean);
      setTargetEmail(res.email || clean);
      setDemoOtpHint(res.otp || '');
      setOtpInput('');
      setNewPw('');
      setConfirmPw('');
      setCountdown(300);
      setStep('otp');
    } catch (err) {
      setError(err?.message || (isVietnamese ? 'Không thể gửi mã OTP lúc này.' : 'Failed to send OTP.'));
    } finally {
      setBusy(false);
    }
  };

  // Bước 2: Xác thực mã OTP và đặt mật khẩu mới
  const handleVerifyOtp = async () => {
    const cleanOtp = otpInput.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError(
        isVietnamese
          ? 'Vui lòng nhập đúng 6 chữ số mã OTP.'
          : 'Please enter the 6-digit OTP code.'
      );
      return;
    }
    if (!newPw || newPw.length < 6) {
      setError(
        isVietnamese
          ? 'Mật khẩu mới phải có ít nhất 6 ký tự.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }
    if (newPw !== confirmPw) {
      setError(
        isVietnamese
          ? 'Mật khẩu xác nhận không khớp.'
          : 'Confirm password does not match.'
      );
      return;
    }

    setError('');
    setBusy(true);
    try {
      await verifyOtpAndResetPassword(identifier.trim(), cleanOtp, newPw);
      if (onSuccessLogin) {
        onSuccessLogin(identifier.trim(), newPw);
      }
      setStep('success');
    } catch (err) {
      setError(err?.message || (isVietnamese ? 'Xác thực OTP thất bại.' : 'OTP verification failed.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalOverlay}
    >
      <View
        style={[
          styles.modalCard,
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
        ]}
      >
        {step === 'success' ? (
          /* TRẠNG THÁI 3: ĐẶT LẠI MẬT KHẨU THÀNH CÔNG */
          <>
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="checkmark-circle-outline" size={42} color="#10B981" />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isVietnamese ? 'Đặt lại mật khẩu thành công!' : 'Password Reset Successful!'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.sub }]}>
              {isVietnamese
                ? `Mật khẩu mới cho tài khoản "${identifier}" đã được cập nhật thành công. Bạn có thể đăng nhập ngay.`
                : `Password for account "${identifier}" has been updated successfully.`}
            </Text>

            <Pressable
              onPress={onClose}
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
            >
              <Text style={styles.modalSubmitBtnText}>
                {isVietnamese ? 'Đăng nhập ngay' : 'Log In Now'}
              </Text>
            </Pressable>
          </>
        ) : step === 'otp' ? (
          /* TRẠNG THÁI 2: NHẬP MÃ OTP & MẬT KHẨU MỚI */
          <>
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isVietnamese ? 'Nhập mã OTP & Mật khẩu mới' : 'Enter OTP & New Password'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.sub }]}>
              {isVietnamese
                ? 'Hệ thống đã gửi mã xác thực 6 số đến email:'
                : 'We have sent a 6-digit OTP code to:'}
            </Text>
            <Text style={[styles.sentEmailHighlight, { color: colors.primary }]}>
              {targetEmail || identifier}
            </Text>

            {/* Hint mã OTP thử nghiệm nhanh */}
            {!!demoOtpHint && (
              <View style={styles.demoOtpPill}>
                <Ionicons name="mail-unread-outline" size={15} color="#FFD000" />
                <Text style={styles.demoOtpText}>
                  {isVietnamese ? `Mã OTP xác thực: ${demoOtpHint}` : `OTP Code: ${demoOtpHint}`}
                </Text>
              </View>
            )}

            {/* Ô nhập mã OTP 6 số */}
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg, width: '100%', marginBottom: 10, marginTop: 6 }]}>
              <Ionicons name="keypad-outline" size={20} color={colors.sub} />
              <TextInput
                value={otpInput}
                onChangeText={setOtpInput}
                placeholder={isVietnamese ? 'Nhập mã 6 chữ số' : 'Enter 6-digit code'}
                placeholderTextColor={colors.sub}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
                style={[styles.inputField, { color: colors.text, letterSpacing: 4, fontWeight: '700' }]}
              />
            </View>

            {/* Ô nhập mật khẩu mới */}
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg, width: '100%', marginBottom: 10 }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.sub} />
              <TextInput
                value={newPw}
                onChangeText={setNewPw}
                placeholder={isVietnamese ? 'Mật khẩu mới (tối thiểu 6 ký tự)' : 'New password (min 6 chars)'}
                placeholderTextColor={colors.sub}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                style={[styles.inputField, { color: colors.text }]}
              />
              <Pressable onPress={() => setShowPw((prev) => !prev)} hitSlop={10}>
                <Ionicons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.sub}
                />
              </Pressable>
            </View>

            {/* Ô xác nhận mật khẩu mới */}
            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg, width: '100%', marginBottom: 10 }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.sub} />
              <TextInput
                value={confirmPw}
                onChangeText={setConfirmPw}
                placeholder={isVietnamese ? 'Xác nhận lại mật khẩu mới' : 'Confirm new password'}
                placeholderTextColor={colors.sub}
                secureTextEntry={!showPw}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleVerifyOtp}
                style={[styles.inputField, { color: colors.text }]}
              />
            </View>

            {/* Đồng hồ đếm ngược 5 phút */}
            <View style={styles.countdownRow}>
              <Ionicons
                name={countdown > 0 ? 'time-outline' : 'alert-circle-outline'}
                size={14}
                color={countdown > 0 ? colors.sub : colors.danger}
              />
              <Text style={{ fontSize: 12.5, color: countdown > 0 ? colors.sub : colors.danger }}>
                {countdown > 0
                  ? `${isVietnamese ? 'Hiệu lực mã:' : 'Expires in:'} ${formatCountdown(countdown)}`
                  : (isVietnamese ? 'Mã OTP đã hết hạn.' : 'OTP has expired.')}
              </Text>
            </View>

            {!!error && (
              <Text style={[styles.errorText, { color: colors.danger, width: '100%', textAlign: 'center' }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleVerifyOtp}
              disabled={busy}
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
            >
              {busy ? (
                <ActivityIndicator color="#121214" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {isVietnamese ? 'Xác nhận đặt lại mật khẩu' : 'Confirm & Reset Password'}
                </Text>
              )}
            </Pressable>

            {/* Gửi lại mã OTP nếu hết hạn */}
            <Pressable
              onPress={handleRequestOtp}
              disabled={busy}
              style={{ marginTop: 12, paddingVertical: 4 }}
              hitSlop={8}
            >
              <Text style={{ color: colors.sub, fontSize: 13, textDecorationLine: 'underline' }}>
                {isVietnamese ? 'Chưa nhận được? Gửi lại mã OTP' : 'Didn’t receive? Resend OTP'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setStep('email')}
              style={styles.modalCancelBtn}
              hitSlop={8}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.sub }]}>
                {isVietnamese ? 'Đổi email khác' : 'Change email'}
              </Text>
            </Pressable>
          </>
        ) : (
          /* TRẠNG THÁI 1: NHẬP EMAIL / TÊN ĐĂNG NHẬP */
          <>
            <View style={[styles.modalIconCircle, { backgroundColor: 'rgba(255, 208, 0, 0.12)' }]}>
              <Ionicons name="mail-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isVietnamese ? 'Quên mật khẩu' : 'Forgot Password'}
            </Text>
            <Text style={[styles.modalDesc, { color: colors.sub }]}>
              {isVietnamese
                ? 'Nhập địa chỉ email tài khoản của bạn. Hệ thống sẽ gửi mã OTP 6 số đến hộp thư để bạn đặt lại mật khẩu mới.'
                : 'Enter your account email. We will send a 6-digit OTP code to your inbox to reset your password.'}
            </Text>

            {/* Thông báo thời hạn 5 phút */}
            <View style={styles.expireNoticePill}>
              <Ionicons name="time-outline" size={15} color="#FFD000" />
              <Text style={styles.expireNoticeText}>
                {isVietnamese
                  ? 'Mã OTP xác thực có hiệu lực trong vòng 5 phút.'
                  : 'OTP code is valid for 5 minutes.'}
              </Text>
            </View>

            <View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.bg, width: '100%', marginTop: 14 }]}>
              <Ionicons name="mail-outline" size={20} color={colors.sub} />
              <TextInput
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={isVietnamese ? 'Nhập email tài khoản' : 'Enter account email'}
                placeholderTextColor={colors.sub}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={handleRequestOtp}
                style={[styles.inputField, { color: colors.text }]}
              />
            </View>

            {!!error && (
              <Text style={[styles.errorText, { color: colors.danger, width: '100%', textAlign: 'center' }]}>
                {error}
              </Text>
            )}

            <Pressable
              onPress={handleRequestOtp}
              disabled={busy}
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
            >
              {busy ? (
                <ActivityIndicator color="#121214" size="small" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {isVietnamese ? 'Gửi mã xác thực OTP' : 'Send OTP Code'}
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={onClose}
              style={styles.modalCancelBtn}
              hitSlop={8}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.sub }]}>
                {isVietnamese ? 'Quay lại đăng nhập' : 'Back to Login'}
              </Text>
            </Pressable>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ForgotPasswordModal({
  visible,
  onClose,
  initialIdentifier = '',
  onSuccessLogin,
}) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <ForgotPasswordModalContent
        onClose={onClose}
        initialIdentifier={initialIdentifier}
        onSuccessLogin={onSuccessLogin}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  expireNoticePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 208, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
    marginBottom: 6,
  },
  expireNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD000',
  },
  demoOtpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 208, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.35)',
    marginVertical: 6,
  },
  demoOtpText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD000',
    letterSpacing: 0.5,
  },
  sentEmailHighlight: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  modalSubmitBtn: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSubmitBtnText: {
    color: '#121214',
    fontSize: 15,
    fontWeight: '800',
  },
  modalCancelBtn: {
    marginTop: 14,
    paddingVertical: 6,
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  inputField: {
    flex: 1,
    paddingVertical: 13,
    paddingLeft: 10,
    fontSize: 15,
  },
  errorText: {
    marginBottom: 8,
    fontSize: 13,
  },
});

// src/screens/tools/fap/FapExamFormModal.js
// Modal Thêm / Chỉnh sửa ca thi hoặc Dán dữ liệu bảng Lịch thi trực tiếp từ fap.fpt.edu.vn/ExamSchedule

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { parseFapExamScheduleRaw, parseFapStudentInfo } from './fapExamHelper';
import { parseWeeklyTimetableRawText } from '../attend/fapAttendanceHelper';

export function FapExamFormModal({
  visible,
  onClose,
  colors,
  editingExam,
  onSaveExam,
  onImportExams,
  onImportTimetable,
  onImportCourse,
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('manual'); // 'manual' | 'import'
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [examForm, setExamForm] = useState('Practical_Exam (PEA client)');
  const [examType, setExamType] = useState('PE');
  const [customMins, setCustomMins] = useState('');
  const [rawPasteText, setRawPasteText] = useState('');

  useEffect(() => {
    if (editingExam) {
      setMode('manual');
      setSubjectCode(editingExam.subjectCode || '');
      setSubjectName(editingExam.subjectName || '');
      setDate(editingExam.date || '');
      setTime(editingExam.time || '');
      setRoom(editingExam.room || '');
      setExamForm(editingExam.examForm || 'Practical_Exam (PEA client)');
      setExamType(editingExam.examType || 'PE');
      setCustomMins(
        editingExam.customReminderMinutes !== null && editingExam.customReminderMinutes !== undefined
          ? String(editingExam.customReminderMinutes)
          : ''
      );
    } else {
      setSubjectCode('');
      setSubjectName('');
      setDate('08/11/2026');
      setTime('10h00-12h00');
      setRoom('BE-212');
      setExamForm('Practical_Exam (PEA client)');
      setExamType('PE');
      setCustomMins('');
    }
  }, [editingExam, visible]);

  const fillQuickDemoExam = () => {
    const now = new Date();
    const target = new Date(now.getTime() + 2 * 60 * 1000);
    const end = new Date(target.getTime() + 90 * 60 * 1000);
    const pad = (n) => String(n).padStart(2, '0');
    const dateStr = `${pad(target.getDate())}/${pad(target.getMonth() + 1)}/${target.getFullYear()}`;
    const timeStr = `${pad(target.getHours())}h${pad(target.getMinutes())}-${pad(end.getHours())}h${pad(end.getMinutes())}`;

    setSubjectCode('MMA301');
    setSubjectName('Multiplatform Mobile App Development (Ca thi Demo)');
    setDate(dateStr);
    setTime(timeStr);
    setRoom('BE-212');
    setExamType('PE');
    setCustomMins('1');
  };

  const handleSaveManual = () => {
    if (!subjectCode.trim() || !date.trim() || !time.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập đầy đủ Mã môn, Ngày thi (DD/MM/YYYY) và Giờ thi.');
      return;
    }

    const parsedCustom = customMins.trim() !== '' ? Math.max(1, parseInt(customMins, 10) || 15) : null;

    onSaveExam({
      id: editingExam ? editingExam.id : `exam_${Date.now()}`,
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim() || 'Môn thi Đại học FPT',
      date: date.trim(),
      time: time.trim(),
      room: room.trim() || 'BE-212',
      examForm: examForm.trim() || 'Practical_Exam (PEA client)',
      examType: examType.trim().toUpperCase() || 'PE',
      publishDate: editingExam?.publishDate || '',
      note: editingExam?.note || '',
      reminderEnabled: true,
      customReminderMinutes: parsedCustom,
      notified: false,
    });
    onClose();
  };

  const handleParseImport = (textToParse = rawPasteText) => {
    const text = (textToParse || rawPasteText).trim();

    // 1. Kiểm tra nếu là JSON xuất từ Console FAP
    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);

        // Trường hợp A: JSON Thời khóa biểu tuần [{ slot: 1, ... }]
        if (Array.isArray(parsed) && parsed.length > 0 && (parsed[0].slot !== undefined || parsed[0].subjectCode)) {
          if (onImportTimetable) {
            onImportTimetable(parsed);
            Alert.alert('Nhập TKB thành công! 🎉', `Đã nạp ${parsed.length} ca học trong tuần vào app!`);
            setRawPasteText('');
            onClose();
            return;
          }
        }

        // Trường hợp B: JSON Môn học { course: "...", sessions: [...] }
        if (parsed.sessions && Array.isArray(parsed.sessions)) {
          if (onImportCourse) {
            onImportCourse(parsed);
            Alert.alert(
              'Nhập Môn học thành công! 📚',
              `Đã nạp môn ${parsed.courseCode || parsed.course || ''} gồm ${parsed.sessions.length} buổi học cả kỳ!`
            );
            setRawPasteText('');
            onClose();
            return;
          }
        }
      } catch {}
    }

    // 2. Kiểm tra nếu là văn bản Thời khóa biểu tuần (copy từ WeekPartial hoặc bảng FAP)
    const timetableSlots = parseWeeklyTimetableRawText(text);
    const extractedUser = parseFapStudentInfo(text);
    if (timetableSlots.length > 0) {
      if (onImportTimetable) {
        onImportTimetable(timetableSlots, extractedUser);
        Alert.alert(
          'Nhập TKB thành công! 🎉',
          `Đã bóc tách thành công ${timetableSlots.length} ca học trong tuần từ văn bản FAP!`
        );
        setRawPasteText('');
        onClose();
        return;
      }
    }

    // 3. Mặc định: Bóc tách Lịch thi từ bảng FAP copy
    const extracted = parseFapExamScheduleRaw(text);
    if (extracted.length === 0) {
      Alert.alert(
        'Không tìm thấy dữ liệu',
        'Vui lòng copy bảng Lịch thi, TKB tuần hoặc dán mã JSON từ trang FAP.'
      );
      return;
    }
    onImportExams(extracted, extractedUser);
    setRawPasteText('');
    onClose();
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert('Bộ nhớ tạm trống', 'Hãy copy lịch thi hoặc TKB trên trang web FAP trước khi bấm nút này.');
        return;
      }
      setRawPasteText(text);
      const extracted = parseFapExamScheduleRaw(text);
      const extractedUser = parseFapStudentInfo(text);
      if (extracted.length > 0) {
        Alert.alert(
          'Đã tìm thấy lịch thi! 🎉',
          `Phát hiện ${extracted.length} ca thi trong bộ nhớ tạm:\n${extracted.map((e) => `• ${e.subjectCode} (${e.date} lúc ${e.time})`).join('\n')}`,
          [
            { text: 'Kiểm tra lại', style: 'cancel' },
            {
              text: 'Nạp ngay',
              style: 'default',
              onPress: () => {
                onImportExams(extracted, extractedUser);
                setRawPasteText('');
                onClose();
              },
            },
          ]
        );
        return;
      }

      const timetableSlots = parseWeeklyTimetableRawText(text);
      if (timetableSlots.length > 0) {
        Alert.alert(
          'Đã tìm thấy Thời khóa biểu! ⏰',
          `Phát hiện ${timetableSlots.length} ca học trong bộ nhớ tạm:\n${timetableSlots.slice(0, 3).map((s) => `• Ca ${s.slot} (${s.subjectCode})`).join('\n')}${timetableSlots.length > 3 ? '\n...' : ''}`,
          [
            { text: 'Kiểm tra lại', style: 'cancel' },
            {
              text: 'Nạp ngay',
              style: 'default',
              onPress: () => {
                onImportTimetable?.(timetableSlots, extractedUser);
                setRawPasteText('');
                onClose();
              },
            },
          ]
        );
        return;
      }

      Alert.alert(
        'Đã dán nội dung',
        'Đã dán văn bản từ bộ nhớ tạm vào ô bên dưới. Vui lòng kiểm tra và bấm "Bóc tách & Nhập lịch thi / TKB".'
      );
    } catch {
      Alert.alert('Thông báo', 'Không thể đọc nội dung bộ nhớ tạm.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingExam ? `Chỉnh sửa lịch thi: ${editingExam.subjectCode}` : 'Cập nhật lịch thi FAP'}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.sub} />
            </Pressable>
          </View>

          {!editingExam && (
            <View style={[styles.modeTabs, { backgroundColor: colors.bg }]}>
              <Pressable
                onPress={() => setMode('manual')}
                style={[styles.modeTabBtn, mode === 'manual' && { backgroundColor: colors.primary }]}
              >
                <Text style={{ fontWeight: '800', fontSize: 12.5, color: mode === 'manual' ? '#121214' : colors.sub }}>
                  Thêm / Tạo ca thi
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('import')}
                style={[styles.modeTabBtn, mode === 'import' && { backgroundColor: colors.primary }]}
              >
                <Text style={{ fontWeight: '800', fontSize: 12.5, color: mode === 'import' ? '#121214' : colors.sub }}>
                  Dán từ cổng FAP
                </Text>
              </Pressable>
            </View>
          )}

          <FlatList
            data={[]}
            renderItem={null}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              mode === 'manual' ? (
                <View style={{ paddingBottom: 12 }}>
                  <Pressable
                    onPress={fillQuickDemoExam}
                    style={[styles.quickDemoBanner, { backgroundColor: 'rgba(255, 208, 0, 0.14)', borderColor: colors.primary }]}
                  >
                    <Ionicons name="flash" size={16} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700', flex: 1 }}>
                      Điền nhanh ca thi cách hiện tại 2 phút (để test nhắc nhở tự động)
                    </Text>
                  </Pressable>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Mã môn (VD: SDN302)</Text>
                      <TextInput
                        value={subjectCode}
                        onChangeText={setSubjectCode}
                        placeholder="SDN302"
                        placeholderTextColor={colors.sub}
                        autoCapitalize="characters"
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                    <View style={{ width: 95 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Loại thi</Text>
                      <TextInput
                        value={examType}
                        onChangeText={setExamType}
                        placeholder="PE / FE"
                        placeholderTextColor={colors.sub}
                        autoCapitalize="characters"
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.sub }]}>Tên môn thi</Text>
                  <TextInput
                    value={subjectName}
                    onChangeText={setSubjectName}
                    placeholder="Server-Side development with NodeJS..."
                    placeholderTextColor={colors.sub}
                    style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                  />

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Ngày thi (DD/MM/YYYY)</Text>
                      <TextInput
                        value={date}
                        onChangeText={setDate}
                        placeholder="08/11/2026"
                        placeholderTextColor={colors.sub}
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Thời gian thi</Text>
                      <TextInput
                        value={time}
                        onChangeText={setTime}
                        placeholder="10h00-12h00"
                        placeholderTextColor={colors.sub}
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Phòng thi</Text>
                      <TextInput
                        value={room}
                        onChangeText={setRoom}
                        placeholder="BE-212"
                        placeholderTextColor={colors.sub}
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.sub }]}>Nhắc trước (phút riêng)</Text>
                      <TextInput
                        value={customMins}
                        onChangeText={setCustomMins}
                        placeholder="Mặc định chung"
                        placeholderTextColor={colors.sub}
                        keyboardType="numeric"
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                      />
                    </View>
                  </View>

                  <Pressable
                    onPress={handleSaveManual}
                    style={[styles.saveMainBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#121214" />
                    <Text style={styles.saveMainBtnText}>
                      {editingExam ? 'Lưu thay đổi' : 'Thêm vào lịch thi của tôi'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={{ paddingBottom: 12 }}>
                  <Pressable
                    onPress={handlePasteFromClipboard}
                    style={[styles.quickDemoBanner, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: '#3B82F6', marginBottom: 12 }]}
                  >
                    <Ionicons name="clipboard-outline" size={17} color="#3B82F6" />
                    <Text style={{ color: '#3B82F6', fontSize: 13, fontWeight: '800' }}>
                      📋 Tự động Dán từ bộ nhớ tạm (Clipboard)
                    </Text>
                  </Pressable>

                  <Text style={{ color: colors.sub, fontSize: 12.5, lineHeight: 18, marginBottom: 10 }}>
                    Hoặc copy các dòng từ trang <Text style={{ color: colors.primary, fontWeight: '700' }}>fap.fpt.edu.vn/ExamSchedule</Text> rồi dán vào ô bên dưới:
                  </Text>

                  <TextInput
                    value={rawPasteText}
                    onChangeText={setRawPasteText}
                    placeholder={'08/11/2026\t10h00-12h00\tBE-212\tSDN302 - Server-Side development with NodeJS\tPractical_Exam (PEA client)\tPE\t21/11/2026'}
                    placeholderTextColor={colors.sub}
                    multiline
                    style={[
                      styles.textInput,
                      {
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: colors.bg,
                        minHeight: 110,
                        textAlignVertical: 'top',
                      },
                    ]}
                  />

                  <Pressable
                    onPress={() =>
                      setRawPasteText(
                        '08/11/2026\t10h00-12h00\tBE-212\tSDN302 - Server-Side development with NodeJS, Express, and MongoDB\tPractical_Exam (PEA client)\tPE\t21/11/2026\n12/11/2026\t13h00-14h30\tAL-R302\tPRN231 - Building Cross-Platform Back-End Application With .NET\tMultiple_Choice (EOS client)\tFE\t25/11/2026'
                      )
                    }
                    style={{ alignSelf: 'flex-start', marginBottom: 12 }}
                  >
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                      + Chèn dữ liệu mẫu chuẩn FAP để thử nghiệm
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleParseImport}
                    style={[styles.saveMainBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="cloud-download-outline" size={18} color="#121214" />
                    <Text style={styles.saveMainBtnText}>Bóc tách & Nhập lịch thi</Text>
                  </Pressable>
                </View>
              )
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, padding: 18, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800' },
  modeTabs: { flexDirection: 'row', borderRadius: 10, padding: 3, marginBottom: 12 },
  modeTabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  quickDemoBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 5, marginTop: 6 },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13.5, marginBottom: 6 },
  saveMainBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginTop: 12 },
  saveMainBtnText: { color: '#121214', fontWeight: '800', fontSize: 14 },
});


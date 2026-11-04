import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },

  // Stats Card
  statsCard: {
    borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 14,
  },
  statsHeader: { gap: 10, marginBottom: 12 },
  statsTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsTitle: { fontSize: 14, fontWeight: '800' },
  statsActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
  aiSuggestTopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  aiSuggestTopBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  keyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  keyBtnText: {
    fontSize: 11, fontWeight: '700', color: '#7C3AED',
  },
  addTopBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8,
  },
  addTopBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1,
  },
  statNumber: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // Tabs
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  filterTab: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1,
  },
  filterTabText: { fontSize: 12, fontWeight: '700' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, minHeight: 44, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 8 },
  filterSummaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6, marginBottom: 12 },
  filterSummaryText: { flex: 1, fontSize: 12, fontWeight: '600' },

  // Habit Card
  habitCard: {
    borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitleBox: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle: { fontSize: 15, fontWeight: '800', flex: 1 },
  categoryBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  categoryBadgeText: { fontSize: 10, fontWeight: '700' },
  cardNote: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  cardHeaderBtn: { padding: 4 },

  // Card 2 Rows layout (VIỆC 2)
  cardRow1: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 8,
  },
  cardRow2: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', maxWidth: '100%', marginBottom: 10,
  },
  urgencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  urgencyDot: { width: 7, height: 7, borderRadius: 4 },
  urgencyText: { fontSize: 13, fontWeight: '800' },
  infoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1,
  },
  infoChipText: { fontSize: 12 },

  progressBarBg: {
    height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  progressBarFill: { height: '100%', borderRadius: 3 },

  actionRow: { marginTop: 2 },
  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  resetBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  dailyCounterRow: { flexDirection: 'row', gap: 8 },
  stepBtnMinus: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnPlus: {
    flex: 1, height: 44, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  stepBtnPlusText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },

  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyText: { fontSize: 14, fontWeight: '500', marginTop: 10 },
  emptyClearButton: { marginTop: 12, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },

  // Debug Notification in header (VIỆC 5)
  debugNotifTopBtn: {
    width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1,
  },
  debugNotifTopBtnText: { fontSize: 11, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', padding: 16,
  },
  modalCard: {
    borderRadius: 24, padding: 18, maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800' },
  formContainer: { paddingVertical: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 10 },
  typeSelectorRow: { flexDirection: 'row', gap: 6 },
  typeBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  typeBtnText: { fontSize: 11, fontWeight: '700' },
  input: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14,
  },
  errorText: {
    color: '#EF4444', fontSize: 11, fontWeight: '600', marginTop: 3, marginLeft: 4,
  },
  charCount: { fontSize: 11, alignSelf: 'flex-end', marginTop: 3 },
  toastPill: {
    position: 'absolute', top: 56, alignSelf: 'center', zIndex: 9999,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4, elevation: 5,
  },
  toastPillText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  // Form Selector Elements (VIỆC 1)
  formSectionBox: { marginVertical: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  customCategoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  choiceChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  presetChip: {
    paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  presetChipText: { fontSize: 12, fontWeight: '700' },

  stepperContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  stepperMiniBtn: {
    minWidth: 42, height: 40, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8,
  },
  stepperMiniBtnText: { fontSize: 13, fontWeight: '800' },
  stepperDisplay: {
    flex: 1, height: 40, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperDisplayText: { fontSize: 15, fontWeight: '800' },

  daysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  dayGridCell: {
    width: '12%', aspectRatio: 1, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  dayGridCellText: { fontSize: 12, fontWeight: '700' },

  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8,
    borderRadius: 8, borderWidth: 1, marginTop: 6,
  },
  noteBoxText: { fontSize: 11, flex: 1, lineHeight: 15 },

  // Reminder section in modal
  reminderSection: {
    borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14,
  },
  previewBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
  previewText: { fontSize: 12, fontWeight: '700', flex: 1 },
  explanationBox: {
    flexDirection: 'row', alignItems: 'center', padding: 10,
    borderRadius: 10, borderWidth: 1, marginTop: 8,
  },
  fieldSubLabel: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  reminderHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  reminderSectionTitle: { fontSize: 13, fontWeight: '800' },
  reminderBody: { marginTop: 10 },

  subPickerTitle: {
    fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 4,
  },
  timePickerBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 1.5, marginTop: 4,
  },
  timePickerVal: { fontSize: 18, fontWeight: '800' },
  timePickerSub: { fontSize: 11, marginTop: 2 },
  changeTimeBadge: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  timePickerModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 20,
  },
  timePickerModalBox: {
    width: '100%', maxWidth: 360, borderRadius: 18, padding: 20,
  },
  timePickerModalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  timePickerModalTitle: { fontSize: 16, fontWeight: '800' },
  timePickerModalDone: {
    paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 14,
  },
  timePickerModalDoneText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // Test Notification Button
  testNotifBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 10, borderWidth: 1, marginTop: 12,
  },
  testNotifBtnText: {
    color: '#10B981', fontSize: 13, fontWeight: '800',
  },

  // Debug Notification Modal Items (VIỆC 5)
  debugNotifCard: {
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8,
  },
  debugNotifTitle: { fontSize: 14, fontWeight: '800' },
  debugNotifBody: { fontSize: 12, marginTop: 2 },
  debugNotifMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  debugNotifTrigger: { fontSize: 11, fontWeight: '700' },
  debugNotifId: { fontSize: 10 },

  colorPalette: { flexDirection: 'row', gap: 8, marginVertical: 6 },
  colorCircle: { width: 28, height: 28, borderRadius: 14 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#FFFFFF' },
  saveBtn: {
    paddingVertical: 13, borderRadius: 12, alignItems: 'center', marginTop: 16,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 8, borderBottomWidth: 0.5,
  },
  historyDateText: { fontSize: 12, fontWeight: '700' },
  historyNoteText: { fontSize: 11, flex: 1, textAlign: 'right' },

  // Gemini AI Modal Styles
  aiModalCard: {
    width: '100%', maxHeight: '88%', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingTop: 16,
  },
  aiIntroText: {
    fontSize: 13, lineHeight: 18, marginBottom: 12,
  },
  aiTopicChipsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14,
  },
  aiTopicChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  aiTopicChipText: {
    fontSize: 12, fontWeight: '700',
  },
  aiInputRow: {
    flexDirection: 'row', gap: 8, marginBottom: 16,
  },
  aiCustomInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: 10, fontSize: 14,
  },
  aiGenerateBtn: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  aiResultsContainer: {
    marginTop: 6,
  },
  aiResultsTitle: {
    fontSize: 14, fontWeight: '800', marginBottom: 10,
  },
  aiSuggestionCard: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', marginBottom: 8,
  },
  aiCardColorBar: {
    width: 6,
  },
  aiCardTitle: {
    fontSize: 14, fontWeight: '800', marginBottom: 2,
  },
  aiCardSubtitle: {
    fontSize: 12, fontWeight: '500',
  },
  applyAiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 14, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 4,
  },
  applyAiBtnText: {
    color: '#FFFFFF', fontSize: 14, fontWeight: '800',
  },

  // Hộp thoại xác nhận thay đổi chưa lưu
  confirmOverlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.70)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    zIndex: 99999,
    elevation: 99999,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 16,
    elevation: 20,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  confirmDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
  },
  confirmActionCol: {
    gap: 10,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    minHeight: 48,
  },
  confirmBtnSave: {
    backgroundColor: '#10B981',
  },
  confirmBtnTextSave: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtnDiscard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  confirmBtnTextDiscard: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtnContinue: {
    borderWidth: 1,
  },
  confirmBtnTextContinue: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
    flexShrink: 1,
  },
});

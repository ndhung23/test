import { Alert } from 'react-native';
import { canAccessTool } from './constants/roles';

// Danh sách các tính năng cốt lõi của ToolKit kèm phân quyền (tier: 'free' | 'vip')
export const TOOLS = [
  {
    id: 'fap_exam',
    title: 'FPT FAP',
    shortTitle: 'FPT FAP',
    desc: 'Lịch thi, thời khóa biểu & kiểm tra điểm danh sinh viên FPT',
    icon: 'notifications',
    imageIcon: require('../assets/iconfap.png'),
    color: '#F37021',
    route: 'FapExam',
    badge: 'FPT Edu',
    tier: 'free',
  },
  {
    id: 'pdf',
    title: 'Chuyển ảnh thành PDF',
    shortTitle: 'Ghép PDF',
    desc: 'Ghép nhiều ảnh thành một file PDF chất lượng cao',
    icon: 'document-text',
    imageIcon: require('../assets/icon_pdf.png'),
    color: '#EF4444',
    route: 'ImageToPdf',
    badge: 'Sẵn sàng',
    tier: 'free',
  },
  {
    id: 'screentime',
    title: 'Nhắc nhở và theo dõi thời gian sử dụng điện thoại',
    shortTitle: 'Thời gian dùng',
    desc: 'Kiểm soát thời gian dùng màn hình & cảnh báo khi dùng quá lâu',
    icon: 'timer',
    imageIcon: require('../assets/icon_time.png'),
    color: '#8B5CF6',
    route: 'ScreenTime',
    badge: 'Bảo vệ',
    tier: 'free',
  },
  {
    id: 'clean_photos',
    title: 'Tìm và dọn ảnh trùng lặp',
    shortTitle: 'Dọn ảnh rác',
    desc: 'Quét bộ nhớ, lọc và dọn sạch các ảnh trùng lặp giải phóng dung lượng',
    icon: 'images',
    color: '#EC4899',
    route: 'CleanPhotos',
    badge: 'Dọn rác',
    tier: 'free',
  },
  {
    id: 'fb_multi',
    title: 'Đa tài khoản Zalo & Mạng xã hội',
    shortTitle: 'Đa nick Zalo',
    desc: 'Quét mã QR đăng nhập, chuyển đổi 1 chạm tức thì giữa nhiều nick Zalo, Messenger, Facebook',
    icon: 'chatbubbles',
    imageIcon: require('../assets/icon_multiweb.png'),
    color: '#0068FF',
    route: 'FbMulti',
    badge: 'Mới',
    tier: 'free',
  },
  {
    id: 'ai_reply',
    title: 'AI đọc ngữ cảnh và gợi ý trả lời tin nhắn',
    shortTitle: 'AI Trả lời tin',
    desc: 'Phân tích ngữ cảnh tin nhắn đến và gợi ý câu trả lời thông minh',
    icon: 'chatbubbles',
    color: '#FFD000',
    route: 'AiReply',
    badge: 'VIP AI',
    tier: 'vip',
  },
  {
    id: 'snap_video',
    title: 'Tải video từ mạng xã hội không logo',
    shortTitle: 'Snap Video',
    desc: 'Tải video TikTok, YouTube, Facebook, Instagram không dính watermark',
    icon: 'download',
    color: '#FF2D55',
    route: 'SnapVideo',
    badge: 'Mới',
    tier: 'free',
  },
  {
    id: 'micro_habit',
    title: 'Theo dõi việc vặt & Chu kỳ sinh hoạt',
    shortTitle: 'Chu kỳ việc vặt',
    desc: 'Bấm nút để reset vòng lặp: thay nhớt, đổi ga nước, tiền trọ, uống thuốc...',
    icon: 'repeat',
    color: '#10B981',
    route: 'MicroHabit',
    badge: 'Mới',
    tier: 'free',
  },
];

export function openTool(navigation, tool, user, onUpgradeRequired, customTiers = null) {
  if (!tool) return;

  // Kiểm tra quyền truy cập theo vai trò và cấu hình Admin
  if (!canAccessTool(user, tool, customTiers)) {
    if (typeof onUpgradeRequired === 'function') {
      onUpgradeRequired(tool);
    } else {
      if (!user) {
        Alert.alert(
          'Yêu cầu đăng nhập',
          `Tiện ích "${tool.title}" là tính năng VIP. Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục trải nghiệm.`,
          [
            { text: 'Để sau', style: 'cancel' },
            { text: 'Đăng nhập', onPress: () => navigation?.navigate('Login') },
          ]
        );
      } else {
        Alert.alert(
          'Yêu cầu VIP',
          `Tiện ích "${tool.title}" là tính năng độc quyền dành cho thành viên VIP. Vui lòng liên hệ Quản trị viên để được nâng cấp tài khoản.`,
          [{ text: 'Đóng', style: 'cancel' }]
        );
      }
    }
    return;
  }

  if (tool.route) {
    navigation.navigate(tool.route, { tool });
  }
}

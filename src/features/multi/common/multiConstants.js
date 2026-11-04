export const PLATFORMS = {
  ZALO: 'zalo',
  MESSENGER: 'messenger',
  FACEBOOK: 'facebook',
  CUSTOM: 'custom',
};

export const USER_AGENTS = {
  // User-Agent Chrome Windows 11 chuẩn tương thích 100% với Zalo Web (tránh bị Zalo chặn thiết bị lạ)
  ZALO_DESKTOP:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  // User-Agent Desktop Safari giúp mở trực tiếp https://www.messenger.com/ không bị ép tải app
  MESSENGER_DESKTOP:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15',
  // User-Agent Mobile cho lướt Facebook
  FACEBOOK_MOBILE:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

export const CUSTOM_PRESETS = [
  { name: 'Telegram', url: 'https://web.telegram.org' },
  { name: 'TikTok', url: 'https://www.tiktok.com' },
  { name: 'Instagram', url: 'https://www.instagram.com' },
  { name: 'Discord', url: 'https://discord.com/app' },
  { name: 'Twitter / X', url: 'https://x.com' },
  { name: 'Shopee', url: 'https://shopee.vn' },
];

export const PLATFORM_OPTIONS = [
  {
    id: PLATFORMS.ZALO,
    name: 'Zalo Web (Khuyên dùng)',
    desc: 'Quét QR hoặc xác nhận đăng nhập qua SĐT không cần mật khẩu',
    icon: 'chatbubbles',
    color: '#0068FF',
    badge: 'Ưu tiên',
    loginUrl: 'https://chat.zalo.me/',
  },
  {
    id: PLATFORMS.MESSENGER,
    name: 'Messenger',
    desc: 'Chuyên nhắn tin, quản lý hộp thư & chat khách hàng',
    icon: 'chatbubble-ellipses',
    color: '#0084FF',
    loginUrl: 'https://www.messenger.com/login',
  },
  {
    id: PLATFORMS.FACEBOOK,
    name: 'Facebook',
    desc: 'Lướt bảng tin, fanpage, trang cá nhân & hội nhóm',
    icon: 'logo-facebook',
    color: '#1877F2',
    loginUrl: 'https://m.facebook.com/login/?next=https%3A%2F%2Fm.facebook.com%2F',
  },
  {
    id: PLATFORMS.CUSTOM,
    name: 'Khác',
    desc: 'Thêm ứng dụng tùy ý (Telegram, TikTok, Instagram, Discord, Shopee...)',
    icon: 'globe-outline',
    color: '#10B981',
    badge: 'Tùy biến',
    loginUrl: '',
  },
];

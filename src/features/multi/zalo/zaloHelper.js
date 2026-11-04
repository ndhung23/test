import { USER_AGENTS } from '../common/multiConstants';

export const ZALO_CONSTANTS = {
  LOGIN_URL: 'https://chat.zalo.me/',
  CHAT_URL: 'https://chat.zalo.me/',
  USER_AGENT: USER_AGENTS.ZALO_DESKTOP,
  DOMAINS: ['.zalo.me', 'chat.zalo.me', 'id.zalo.me', 'zalo.me'],
};

/**
 * CSS ẩn toàn bộ banner đòi tải app PC của Zalo và tối ưu chat tràn viền
 */
export const ZALO_CLEAN_CSS = `
  /* Ẩn triệt để toàn bộ banner đòi tải app PC / app store của Zalo Web */
  .banner-download-app, .zl-banner-app, .download-app-bar, .banner-app-pc,
  div[class*="download-app"], div[class*="banner-download"],
  .popup-download-app, div[id*="download-app"], .banner-install-app,
  div[data-translate-inner="STR_DOWNLOAD_APP_PC"],
  .zl-modal__overlay:has(.zl-modal__dialog:has-text("Zalo PC")),
  div[role="dialog"]:has(a[href*="zalo.me/pc"]),
  .intro-download-pc, .download-banner {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    height: 0 !important;
    opacity: 0 !important;
  }

  /* Tối ưu hóa layout Zalo Web vừa vặn màn hình điện thoại */
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #121214 !important;
    color: #FFFFFF !important;
    overflow-x: hidden !important;
    width: 100% !important;
    height: 100% !important;
  }

  /* Tối ưu khung đăng nhập chat.zalo.me vừa vặn màn hình */
  .body-container, .wrapper-page, .login-container {
    padding: 10px 0 !important;
    margin: 0 auto !important;
    max-width: 100% !important;
  }

  /* Phóng to và căn giữa mã QR để camera điện thoại khác quét siêu nhạy */
  .qrcode-container, .qr-container, .qr-code {
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    margin: 8px auto !important;
  }

  /* Thanh điều hướng chính của Zalo */
  #main-tab, .main-tab {
    background-color: #18181C !important;
  }

  /* Khung danh sách tin nhắn */
  #conversationList, .conv-list {
    background-color: #121214 !important;
  }
`;

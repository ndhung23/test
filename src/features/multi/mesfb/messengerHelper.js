import { USER_AGENTS } from '../common/multiConstants';

export const MESSENGER_CONSTANTS = {
  HOME_URL: 'https://www.messenger.com/',
  LOGIN_URL: 'https://www.messenger.com/login',
  USER_AGENT: USER_AGENTS.MESSENGER_DESKTOP,
  DOMAINS: ['.messenger.com', 'messenger.com', '.facebook.com'],
};

/**
 * CSS ẩn màn hình chặn "Chuyển sang Messenger" và header Facebook
 */
export const MESSENGER_CLEAN_CSS = `
  /* Ẩn triệt để màn hình chặn "Chuyển sang Messenger" của Facebook */
  div[data-sigil*="upsell"], div[class*="upsell"], div[id*="upsell"],
  div[aria-label*="Messenger"], div[data-sigil*="app-upsell"],
  div[role="dialog"]:has(a[href*="messenger.com"]),
  div:has(> img[src*="messenger"]),
  div:has(> svg[aria-label*="Messenger"]),
  a[href*="fb-messenger://"], a[href*="itms-apps://"], a[href*="apps.apple.com"],
  div._8s_a, div._8s_b, div._7whw, div._8e3c, div._97w9 {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* Ẩn header Facebook rườm rà */
  header, #header, div[role="banner"], div[data-sigil="m-header"],
  #m_common_header, .m-header {
    display: none !important;
  }

  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #121214 !important;
    color: #FFFFFF !important;
    overflow-x: hidden !important;
  }
`;

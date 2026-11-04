import { USER_AGENTS } from '../common/multiConstants';

export const FB_CONSTANTS = {
  HOME_URL: 'https://m.facebook.com/',
  LOGIN_URL: 'https://m.facebook.com/login/?next=https%3A%2F%2Fm.facebook.com%2F',
  MBASIC_MESSAGES_URL: 'https://mbasic.facebook.com/messages/',
  USER_AGENT: USER_AGENTS.FACEBOOK_MOBILE,
  DOMAINS: ['.facebook.com', 'm.facebook.com', 'mbasic.facebook.com'],
};

/**
 * Kiểm tra xem URL có thuộc phần tin nhắn của Facebook không
 * @param {string} url
 * @returns {boolean}
 */
export function isFacebookMessagesUrl(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('facebook.com/messages') || lower.includes('m.facebook.com/messages');
}

/**
 * CSS ẩn header và các thành phần thừa trên Facebook mobile
 */
export const FB_CLEAN_CSS = `
  header, #header, div[role="banner"], div[data-sigil="m-header"] {
    display: none !important;
  }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    background-color: #121214 !important;
  }
`;

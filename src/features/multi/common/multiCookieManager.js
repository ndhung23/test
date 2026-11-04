import { parseAccountCookies } from './multiAccountStorage';
import { PLATFORMS, USER_AGENTS } from './multiConstants';
import { ZALO_CLEAN_CSS, ZALO_CONSTANTS } from '../zalo/zaloHelper';
import { FB_CLEAN_CSS, FB_CONSTANTS } from '../fb/fbHelper';
import { MESSENGER_CLEAN_CSS, MESSENGER_CONSTANTS } from '../mesfb/messengerHelper';

export { USER_AGENTS };

/**
 * Script spoofing môi trường Desktop chuẩn trước khi tải trang (injectedJavaScriptBeforeContentLoaded)
 * @param {string} platform
 * @returns {string}
 */
export function generateDesktopSpoofScript(platform = PLATFORMS.ZALO) {
  if (platform === PLATFORMS.ZALO) {
    return `
      (function() {
        try {
          // Spoofing chuẩn Google Chrome trên Windows 11 (môi trường được Zalo Web tối ưu nhất)
          Object.defineProperty(navigator, 'platform', {
            get: function() { return 'Win32'; },
            configurable: true
          });
          Object.defineProperty(navigator, 'vendor', {
            get: function() { return 'Google Inc.'; },
            configurable: true
          });
          // Hỗ trợ cảm ứng tự nhiên như màn hình cảm ứng Windows Touch / Surface
          Object.defineProperty(navigator, 'maxTouchPoints', {
            get: function() { return 10; },
            configurable: true
          });
          Object.defineProperty(navigator, 'webdriver', {
            get: function() { return false; },
            configurable: true
          });
          if (!window.chrome) {
            window.chrome = {
              app: { isInstalled: false },
              runtime: { id: undefined },
              loadTimes: function() {},
              csi: function() {}
            };
          }
        } catch(e) {}
      })();
      true;
    `;
  }

  return `
    (function() {
      try {
        Object.defineProperty(navigator, 'platform', {
          get: function() { return 'MacIntel'; },
          configurable: true
        });
        Object.defineProperty(navigator, 'vendor', {
          get: function() { return 'Apple Computer, Inc.'; },
          configurable: true
        });
        Object.defineProperty(navigator, 'maxTouchPoints', {
          get: function() { return 0; },
          configurable: true
        });
        Object.defineProperty(navigator, 'webdriver', {
          get: function() { return false; },
          configurable: true
        });
      } catch(e) {}
    })();
    true;
  `;
}

/**
 * Script inject cookie vào WebView trước khi load trang
 * @param {string} cookieStr
 * @param {string} platform
 * @param {string} customUrl
 * @returns {string}
 */
export function generateCookieInjectionScript(cookieStr, platform = PLATFORMS.ZALO, customUrl = '') {
  if (!cookieStr) return '';

  const parsed = parseAccountCookies(cookieStr);
  let domainList = ZALO_CONSTANTS.DOMAINS;

  if (platform === PLATFORMS.FACEBOOK) {
    domainList = FB_CONSTANTS.DOMAINS;
  } else if (platform === PLATFORMS.MESSENGER) {
    domainList = MESSENGER_CONSTANTS.DOMAINS;
  } else if (platform === PLATFORMS.CUSTOM && customUrl) {
    try {
      const match = customUrl.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/i);
      if (match && match[1]) {
        domainList = [match[1], `.${match[1]}`];
      }
    } catch (_e) {}
  }

  const cookieAssignments = Object.entries(parsed)
    .map(([key, val]) => {
      const sanitizedVal = String(val).replace(/"/g, '\\"');
      return (
        domainList
          .map(
            (d) =>
              `try { document.cookie = "${key}=${sanitizedVal}; path=/; domain=${d}; max-age=31536000; Secure"; } catch(e) {}`
          )
          .join('\n') +
        `\ntry { document.cookie = "${key}=${sanitizedVal}; path=/; max-age=31536000; Secure"; } catch(e) {}`
      );
    })
    .join('\n');

  const zpwSekVal = parsed.zpw_sek ? String(parsed.zpw_sek).replace(/"/g, '\\"') : '';
  const extraLocalStorage = zpwSekVal
    ? `try { localStorage.setItem('zpw_sek', "${zpwSekVal}"); } catch(e) {}`
    : '';

  return `
    (function() {
      try {
        ${cookieAssignments}
        ${extraLocalStorage}
      } catch(err) {}
    })();
    true;
  `;
}

/**
 * Script CSS & DOM làm sạch giao diện WebView
 * @param {string} platform
 * @returns {string}
 */
export function generateCleanCssScript(platform = PLATFORMS.ZALO) {
  let customCss = '';

  if (platform === PLATFORMS.ZALO) {
    customCss = ZALO_CLEAN_CSS;
  } else if (platform === PLATFORMS.MESSENGER) {
    customCss = MESSENGER_CLEAN_CSS;
  } else if (platform === PLATFORMS.FACEBOOK) {
    customCss = FB_CLEAN_CSS;
  } else {
    // Custom
    customCss = `
      html, body {
        overflow-x: hidden !important;
      }
    `;
  }

  const cleanCss = customCss.replace(/\s+/g, ' ');

  return `
    (function() {
      try {
        let meta = document.querySelector('meta[name="viewport"]');
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'viewport';
          document.head.appendChild(meta);
        }
        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
      } catch(e) {}

      function applyCleanStyle() {
        try {
          if (!document.getElementById('tk-multi-clean-style')) {
            const style = document.createElement('style');
            style.id = 'tk-multi-clean-style';
            style.innerHTML = "${cleanCss}";
            (document.head || document.documentElement).appendChild(style);
          }

          document.querySelectorAll('a[href*="zalo://"], a[href*="fb-messenger:"], a[href*="itms-apps:"]').forEach(function(el) {
            el.removeAttribute('href');
            el.style.display = 'none';
          });
        } catch(e) {}
      }

      applyCleanStyle();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', applyCleanStyle);
      }
      setInterval(applyCleanStyle, 1200);
    })();
    true;
  `;
}

// Alias tương thích
export const generateMessengerCleanCssScript = generateCleanCssScript;

/**
 * Script tự động bắt phiên đăng nhập
 * @param {string} platform
 * @param {string[]} existingUids
 * @returns {string}
 */
export function generateAutoDetectSessionScript(platform = PLATFORMS.ZALO, existingUids = []) {
  const existingUidsJson = JSON.stringify(existingUids);

  return `
    (function() {
      let detected = false;
      const existing = ${existingUidsJson};

      window.__tkSaveCurrentSession = function(customName) {
        try {
          const c = document.cookie || '';
          const title = document.title || customName || 'Tài khoản Web';
          const uid = 'web_' + Date.now().toString().slice(-6);
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SESSION_DETECTED',
              platform: '${PLATFORMS.CUSTOM}',
              uid: uid,
              name: customName || title,
              cookies: c,
              avatarUrl: ''
            }));
          }
        } catch(e) {}
      };

      window.__tkForceSaveZaloSession = function() {
        try {
          const cookieStr = document.cookie || '';
          const sekMatch = cookieStr.match(/zpw_sek=([^;]+)/);
          const hasValidSek = Boolean(sekMatch && sekMatch[1] && sekMatch[1].trim().length >= 8);
          const hasChatInterface = Boolean(
            document.querySelector('.nav__tabs, #conversationList, .user-profile-name, div[data-translate-inner="STR_MY_PROFILE"]')
          );

          if (!hasValidSek && !hasChatInterface) {
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'ZALO_MANUAL_SAVE_ERROR',
                message: 'Chưa phát hiện phiên đăng nhập. Vui lòng hoàn tất quét mã QR hoặc xác nhận qua SĐT trước.'
              }));
            }
            return;
          }

          let zaloName = '';
          const nameEl = document.querySelector('.user-profile-name, .nav__tabs__top__avatar, .name-container, div[data-translate-inner="STR_MY_PROFILE"]');
          if (nameEl && nameEl.innerText) {
            zaloName = nameEl.innerText.trim();
          }
          if (!zaloName) {
            const titleEl = document.querySelector('title');
            if (titleEl && titleEl.innerText && !titleEl.innerText.includes('Zalo Web') && !titleEl.innerText.includes('Đăng nhập')) {
              zaloName = titleEl.innerText.trim();
            }
          }
          if (!zaloName) {
            zaloName = 'Zalo ' + (sekMatch ? sekMatch[1].slice(0, 6) : Date.now().toString().slice(-4));
          }

          let avatar = '';
          const avatarEl = document.querySelector('.nav__tabs__top__avatar img, img[src*="avatar.zalo"], img[src*="zalo.me"]');
          if (avatarEl && avatarEl.src) {
            avatar = avatarEl.src;
          }

          let zaloId = '';
          const uidMatch = cookieStr.match(/zalo_id=([0-9a-zA-Z_]+)/) || cookieStr.match(/zpw_sek=([0-9a-zA-Z_]+)/);
          if (uidMatch && uidMatch[1]) {
            zaloId = uidMatch[1].slice(0, 16);
          } else {
            zaloId = 'zl_' + Date.now().toString().slice(-8);
          }

          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'SESSION_DETECTED',
              platform: '${PLATFORMS.ZALO}',
              uid: zaloId,
              name: zaloName,
              cookies: cookieStr,
              avatarUrl: avatar
            }));
          }
        } catch(e) {}
      };

      function checkSession() {
        if (detected) return;
        try {
          const cookieStr = document.cookie || '';

          if ('${platform}' === '${PLATFORMS.ZALO}') {
            const sekMatch = cookieStr.match(/zpw_sek=([^;]+)/);
            const hasValidSek = Boolean(sekMatch && sekMatch[1] && sekMatch[1].trim().length >= 8);
            const hasChatInterface = Boolean(
              document.querySelector('.nav__tabs, #conversationList, .user-profile-name, div[data-translate-inner="STR_MY_PROFILE"]')
            );
            const hasLoginElements = Boolean(
              document.querySelector('.qrcode-container, .login-container, .wrapper-page, .btn-confirm-login, input[type="password"]')
            );

            // TUYỆT ĐỐI CHỈ COI LÀ ĐÃ ĐĂNG NHẬP KHI: Đã có cookie auth hoặc đã hiện giao diện chat, VÀ KHÔNG CÒN GIAO DIỆN LOGIN
            const isActuallyLoggedIn = (hasValidSek || hasChatInterface) && !hasLoginElements;
            if (!isActuallyLoggedIn) {
              return; // Đang ở màn hình đăng nhập -> Tiếp tục để người dùng quét QR / nhập SĐT
            }

            let zaloName = '';
            const nameEl = document.querySelector('.user-profile-name, .nav__tabs__top__avatar, .name-container, div[data-translate-inner="STR_MY_PROFILE"]');
            if (nameEl && nameEl.innerText) {
              zaloName = nameEl.innerText.trim();
            }
            if (!zaloName) {
              const titleEl = document.querySelector('title');
              if (titleEl && titleEl.innerText && !titleEl.innerText.includes('Zalo Web') && !titleEl.innerText.includes('Đăng nhập')) {
                zaloName = titleEl.innerText.trim();
              }
            }
            if (!zaloName) {
              zaloName = 'Zalo ' + (sekMatch ? sekMatch[1].slice(0, 6) : Date.now().toString().slice(-4));
            }

            let avatar = '';
            const avatarEl = document.querySelector('.nav__tabs__top__avatar img, img[src*="avatar.zalo"], img[src*="zalo.me"]');
            if (avatarEl && avatarEl.src) {
              avatar = avatarEl.src;
            }

            let zaloId = '';
            const uidMatch = cookieStr.match(/zalo_id=([0-9a-zA-Z_]+)/) || cookieStr.match(/zpw_sek=([0-9a-zA-Z_]+)/);
            if (uidMatch && uidMatch[1]) {
              zaloId = uidMatch[1].slice(0, 16);
            } else {
              zaloId = 'zl_' + Date.now().toString().slice(-8);
            }

            if (existing.includes(zaloId)) {
              if (!window._alreadyReportedDuplicate) {
                window._alreadyReportedDuplicate = true;
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'DUPLICATE_ACCOUNT',
                    uid: zaloId
                  }));
                }
              }
              return;
            }

            detected = true;
            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'SESSION_DETECTED',
                platform: '${PLATFORMS.ZALO}',
                uid: zaloId,
                name: zaloName,
                cookies: cookieStr,
                avatarUrl: avatar
              }));
            }
          } else {
            // FACEBOOK / MESSENGER
            if (cookieStr.includes('c_user=')) {
              const match = cookieStr.match(/c_user=([0-9]+)/);
              if (match && match[1]) {
                const uid = match[1];

                if (existing.includes(uid)) {
                  if (!window._alreadyReportedDuplicate) {
                    window._alreadyReportedDuplicate = true;
                    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'DUPLICATE_ACCOUNT',
                        uid: uid
                      }));
                    }
                  }
                  return;
                }

                detected = true;
                let userName = '';
                const titleEl = document.querySelector('title');
                if (titleEl && titleEl.innerText) {
                  const t = titleEl.innerText.trim();
                  if (t && !t.toLowerCase().includes('facebook') && !t.toLowerCase().includes('đăng nhập')) {
                    userName = t;
                  }
                }
                if (!userName) {
                  userName = '${platform === PLATFORMS.MESSENGER ? 'Messenger' : 'Facebook'} ' + uid.slice(-4);
                }

                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'SESSION_DETECTED',
                    platform: '${platform}',
                    uid: uid,
                    name: userName,
                    cookies: cookieStr,
                    avatarUrl: 'https://graph.facebook.com/' + uid + '/picture?type=large'
                  }));
                }
              }
            }
          }
        } catch(e) {}
      }

      checkSession();
      setInterval(checkSession, 1200);
      window.addEventListener('load', checkSession);
    })();
    true;
  `;
}

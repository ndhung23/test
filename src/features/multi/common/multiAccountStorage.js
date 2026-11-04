import * as SecureStore from 'expo-secure-store';
import { PLATFORMS } from './multiConstants';

const STORAGE_KEYS = {
  ACCOUNTS_LIST: 'fb_multi_accounts_v2',
  ACTIVE_ACCOUNT_ID: 'fb_multi_active_id_v2',
};

/**
 * Trích xuất các key-value từ chuỗi Cookie
 * @param {string} cookieStr
 * @returns {Record<string, string>}
 */
export function parseAccountCookies(cookieStr) {
  if (!cookieStr || typeof cookieStr !== 'string') return {};
  const result = {};
  const parts = cookieStr.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      result[key] = val;
    }
  }
  return result;
}

// Giữ lại alias để tương thích
export const parseFacebookCookies = parseAccountCookies;

/**
 * Kiểm tra xem chuỗi cookie có hợp lệ hay không tùy theo nền tảng
 * @param {string} cookieStr
 * @param {string} platform
 * @returns {boolean}
 */
export function isAccountCookieValid(cookieStr, platform = PLATFORMS.ZALO) {
  if (!cookieStr || typeof cookieStr !== 'string' || cookieStr.trim().length < 3) return false;
  if (platform === PLATFORMS.CUSTOM) {
    return cookieStr.trim().length > 3;
  }
  if (platform === PLATFORMS.ZALO) {
    return cookieStr.includes('zpw_sek') || cookieStr.includes('zsession') || cookieStr.length > 20;
  }
  // Facebook & Messenger cần có c_user
  const parsed = parseAccountCookies(cookieStr);
  return Boolean(parsed.c_user && parsed.c_user.length > 4);
}

/**
 * Lấy danh sách toàn bộ tài khoản đã lưu trong SecureStore
 * @returns {Promise<Array>}
 */
export async function getStoredAccounts() {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEYS.ACCOUNTS_LIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[multiAccountStorage] getStoredAccounts error:', error);
    return [];
  }
}

/**
 * Lưu danh sách tài khoản vào SecureStore
 * @param {Array} accounts
 */
async function saveAllAccounts(accounts) {
  try {
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCOUNTS_LIST, JSON.stringify(accounts));
  } catch (error) {
    console.error('[multiAccountStorage] saveAllAccounts error:', error);
    throw error;
  }
}

/**
 * Lấy ID tài khoản đang active
 * @returns {Promise<string | null>}
 */
export async function getActiveAccountId() {
  try {
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
  } catch (error) {
    console.error('[multiAccountStorage] getActiveAccountId error:', error);
    return null;
  }
}

/**
 * Đặt ID tài khoản đang active
 * @param {string} id
 */
export async function setActiveAccountId(id) {
  try {
    if (!id) {
      await SecureStore.deleteItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
    } else {
      await SecureStore.setItemAsync(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, String(id));
    }
  } catch (error) {
    console.error('[multiAccountStorage] setActiveAccountId error:', error);
  }
}

/**
 * Thêm hoặc cập nhật một tài khoản
 * @param {Object} accountData
 * @returns {Promise<Array>}
 */
export async function saveOrUpdateAccount(accountData) {
  if (!accountData || !accountData.id || !accountData.cookies) {
    throw new Error('Thiếu thông tin tài khoản hoặc cookie phiên đăng nhập.');
  }

  const existingAccounts = await getStoredAccounts();
  const platform = accountData.platform || PLATFORMS.ZALO;

  let customDomain = '';
  if (accountData.customUrl) {
    const domainMatch = String(accountData.customUrl).match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:/\n?]+)/i);
    customDomain = domainMatch ? domainMatch[1] : '';
  }

  const uniqueKey = platform === PLATFORMS.CUSTOM
    ? `custom_${encodeURIComponent(customDomain || accountData.customName || 'app')}_${String(accountData.id).trim()}`
    : `${platform}_${String(accountData.id).trim()}`;
  const now = Date.now();

  let defaultAvatar = accountData.avatarUrl;
  if (!defaultAvatar) {
    if (platform === PLATFORMS.ZALO) {
      defaultAvatar = '';
    } else if (platform === PLATFORMS.CUSTOM) {
      defaultAvatar = customDomain ? `https://www.google.com/s2/favicons?domain=${customDomain}&sz=128` : '';
    } else {
      defaultAvatar = `https://graph.facebook.com/${accountData.id}/picture?type=large`;
    }
  }

  const defaultName = accountData.name || accountData.customName || `${platform.toUpperCase()} ${String(accountData.id).slice(-4)}`;
  const existingIndex = existingAccounts.findIndex(
    (acc) => acc.key === uniqueKey || (acc.id === String(accountData.id) && acc.platform === platform)
  );

  let updatedList;
  if (existingIndex >= 0) {
    const old = existingAccounts[existingIndex];
    const updated = {
      ...old,
      ...accountData,
      key: uniqueKey,
      id: String(accountData.id).trim(),
      platform,
      customName: accountData.customName || old.customName || '',
      customUrl: accountData.customUrl || old.customUrl || '',
      name: accountData.name || old.name,
      nickname: accountData.nickname !== undefined ? accountData.nickname : old.nickname,
      avatarUrl: defaultAvatar || old.avatarUrl,
      cookies: accountData.cookies || old.cookies,
      lastActive: now,
    };
    updatedList = [...existingAccounts];
    updatedList[existingIndex] = updated;
  } else {
    const newAccount = {
      key: uniqueKey,
      id: String(accountData.id).trim(),
      platform,
      customName: accountData.customName || '',
      customUrl: accountData.customUrl || '',
      name: defaultName,
      nickname: accountData.nickname || '',
      avatarUrl: defaultAvatar,
      cookies: accountData.cookies,
      lastActive: now,
      createdAt: now,
    };
    updatedList = [newAccount, ...existingAccounts];
  }

  await saveAllAccounts(updatedList);
  await setActiveAccountId(uniqueKey);
  return updatedList;
}

/**
 * Cập nhật tên gợi nhớ (nickname) cho tài khoản
 * @param {string} keyOrId Khóa định danh của tài khoản
 * @param {string} nickname
 */
export async function updateAccountNickname(keyOrId, nickname) {
  const accounts = await getStoredAccounts();
  const target = String(keyOrId).trim();
  const index = accounts.findIndex((a) => a.key === target || a.id === target);
  if (index >= 0) {
    accounts[index] = { ...accounts[index], nickname: nickname.trim() };
    await saveAllAccounts(accounts);
    return accounts;
  }
  return accounts;
}

/**
 * Xóa một tài khoản khỏi danh sách
 * @param {string} keyOrId
 * @returns {Promise<{ accounts: Array, newActiveId: string | null }>}
 */
export async function removeAccount(keyOrId) {
  const accounts = await getStoredAccounts();
  const target = String(keyOrId).trim();
  const filtered = accounts.filter((a) => a.key !== target && a.id !== target);
  await saveAllAccounts(filtered);

  const activeId = await getActiveAccountId();
  let newActiveId = activeId;

  if (activeId === target) {
    newActiveId = filtered.length > 0 ? (filtered[0].key || filtered[0].id) : null;
    await setActiveAccountId(newActiveId);
  }

  return { accounts: filtered, newActiveId };
}

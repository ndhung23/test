// src/utils/storage.js
// Tiện ích lưu trữ dữ liệu an toàn & đồng bộ cấu hình cho cả Mobile (SecureStore) và Web (localStorage)

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Đọc giá trị cấu hình từ bộ nhớ máy người dùng
 * @param {string} key 
 * @param {string|null} defaultValue 
 * @returns {Promise<string|null>}
 */
export async function getStoredItem(key, defaultValue = null) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : defaultValue;
      }
      return defaultValue;
    }
    const val = await SecureStore.getItemAsync(key);
    return val !== null ? val : defaultValue;
  } catch (err) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : defaultValue;
      } catch {}
    }
    return defaultValue;
  }
}

/**
 * Lưu giá trị cấu hình vào bộ nhớ máy người dùng
 * @param {string} key 
 * @param {string} value 
 * @returns {Promise<boolean>}
 */
export async function setStoredItem(key, value) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, String(value));
        return true;
      }
      return false;
    }
    await SecureStore.setItemAsync(key, String(value));
    return true;
  } catch (err) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(key, String(value));
        return true;
      } catch {}
    }
    return false;
  }
}

/**
 * Xóa mục cấu hình khỏi bộ nhớ máy người dùng
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
export async function removeStoredItem(key) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
      return false;
    }
    await SecureStore.deleteItemAsync(key);
    return true;
  } catch (err) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.removeItem(key);
        return true;
      } catch {}
    }
    return false;
  }
}

// Drop-in alias tương thích hoàn toàn với SecureStore API
export const getItemAsync = (key) => getStoredItem(key);
export const setItemAsync = (key, value) => setStoredItem(key, value);
export const deleteItemAsync = (key) => removeStoredItem(key);

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  getStoredItem,
  setStoredItem,
  removeStoredItem,
};

// src/context/LanguageContext.js
// Context quản lý ngôn ngữ (Tiếng Việt / English) và lưu trữ bền vững trên máy người dùng

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { translations } from '../i18n/translations';
import { getStoredItem, setStoredItem } from '../utils/storage';

const STORAGE_LANGUAGE_KEY = '@toolkit_language';

const LanguageContext = createContext({
  language: 'vi',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key) => key,
  isVietnamese: true,
});

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('vi');

  // Đọc cài đặt ngôn ngữ đã lưu trên thiết bị của người dùng
  useEffect(() => {
    (async () => {
      try {
        const savedLang = await getStoredItem(STORAGE_LANGUAGE_KEY, 'vi');
        if (savedLang === 'vi' || savedLang === 'en') {
          setLanguageState(savedLang);
        }
      } catch (e) {
        console.warn('[LanguageContext] Lỗi đọc ngôn ngữ từ máy:', e);
      }
    })();
  }, []);

  // Thay đổi và lưu ngôn ngữ vào máy người dùng
  const setLanguage = useCallback(async (newLang) => {
    if (newLang !== 'vi' && newLang !== 'en') return;
    setLanguageState(newLang);
    await setStoredItem(STORAGE_LANGUAGE_KEY, newLang);
  }, []);

  // Chuyển đổi qua lại giữa tiếng Việt và tiếng Anh
  const toggleLanguage = useCallback(async () => {
    const nextLang = language === 'vi' ? 'en' : 'vi';
    setLanguageState(nextLang);
    await setStoredItem(STORAGE_LANGUAGE_KEY, nextLang);
  }, [language]);

  // Hàm dịch chuỗi linh hoạt hỗ trợ nested keys (vd: 'settings.title') và tham số thay thế
  const t = useCallback(
    (key, params = {}, defaultVal = '') => {
      if (!key) return '';
      const keys = key.split('.');
      let current = translations[language];

      for (const k of keys) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          current = null;
          break;
        }
      }

      // Fallback sang Tiếng Việt nếu thiếu key ở tiếng Anh
      if (!current && language !== 'vi') {
        let fallback = translations.vi;
        for (const k of keys) {
          if (fallback && typeof fallback === 'object' && k in fallback) {
            fallback = fallback[k];
          } else {
            fallback = null;
            break;
          }
        }
        current = fallback;
      }

      if (typeof current !== 'string') {
        return defaultVal || key;
      }

      // Thay thế các tham số dạng {name} trong chuỗi
      let result = current;
      if (params && typeof params === 'object') {
        Object.entries(params).forEach(([paramKey, paramValue]) => {
          result = result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
        });
      }

      return result;
    },
    [language]
  );

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
      isVietnamese: language === 'vi',
    }),
    [language, setLanguage, toggleLanguage, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback an toàn nếu gọi ngoài Provider
    return {
      language: 'vi',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key) => key,
      isVietnamese: true,
    };
  }
  return context;
}

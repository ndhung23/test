// src/theme.js
// Hệ thống Theme (Sáng / Tối) theo phong cách Derot / ToolKit kèm lưu trữ cấu hình trên máy người dùng

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { getStoredItem, setStoredItem } from './utils/storage';

const STORAGE_THEME_KEY = '@toolkit_theme_mode';

// Bảng màu chuẩn theo phong cách Derot / ToolKit (Dark matte + Vàng rực)
export const derotDark = {
  bg: '#141416',
  card: '#222226',
  cardElevated: '#2A2A30',
  cardBorder: '#2E2E36',
  text: '#FFFFFF',
  sub: '#9E9EA7',
  subLight: '#CCCCCC',
  primary: '#FFD000',
  primaryDark: '#E6BA00',
  primaryLight: '#FFF08A',
  primaryMuted: 'rgba(255, 208, 0, 0.12)',
  primaryText: '#121214',
  border: '#2C2C34',
  borderActive: '#FFD000',
  tabBar: '#242429',
  tabBarBorder: '#32323B',
  circleBg: '#2A2A30',
  crownBg: '#FFD000',
  crownIcon: '#121214',
  gearBg: '#2B2B32',
  tagBg: '#2E2B1F',
  tagText: '#EAB308',
  danger: '#EF4444',
  success: '#10B981',
};

// Light theme tinh tế, sang trọng, tương phản cao và rõ nét
export const derotLight = {
  bg: '#F5F5F7',
  card: '#FFFFFF',
  cardElevated: '#F0F0F3',
  cardBorder: '#E5E7EB',
  text: '#111827',
  sub: '#6B7280',
  subLight: '#4B5563',
  primary: '#D97706',
  primaryDark: '#B45309',
  primaryLight: '#FEF3C7',
  primaryMuted: 'rgba(217, 119, 6, 0.12)',
  primaryText: '#FFFFFF',
  border: '#E5E7EB',
  borderActive: '#D97706',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  circleBg: '#F3F4F6',
  crownBg: '#D97706',
  crownIcon: '#FFFFFF',
  gearBg: '#E5E7EB',
  tagBg: '#FEF9C3',
  tagText: '#A16207',
  danger: '#EF4444',
  success: '#10B981',
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
};

export const ThemeContext = createContext({
  themeMode: 'dark',
  isDark: true,
  colors: derotDark,
  setThemeMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState('dark'); // 'dark' | 'light' | 'system'

  // Đọc cài đặt giao diện đã lưu từ thiết bị người dùng
  useEffect(() => {
    (async () => {
      try {
        const savedMode = await getStoredItem(STORAGE_THEME_KEY, 'dark');
        if (savedMode === 'dark' || savedMode === 'light' || savedMode === 'system') {
          setThemeModeState(savedMode);
        }
      } catch (err) {
        console.warn('[Theme] Lỗi đọc theme từ máy:', err);
      }
    })();
  }, []);

  // Thay đổi theme và lưu vào máy
  const setThemeMode = useCallback(async (newMode) => {
    if (newMode !== 'dark' && newMode !== 'light' && newMode !== 'system') return;
    setThemeModeState(newMode);
    await setStoredItem(STORAGE_THEME_KEY, newMode);
  }, []);

  // Chuyển đổi nhanh giữa Sáng và Tối
  const toggleTheme = useCallback(async () => {
    const nextMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeModeState(nextMode);
    await setStoredItem(STORAGE_THEME_KEY, nextMode);
  }, [themeMode]);

  // Tính toán trạng thái isDark dựa trên themeMode hoặc hệ điều hành
  const isDark = useMemo(() => {
    if (themeMode === 'system') {
      return systemScheme !== 'light';
    }
    return themeMode === 'dark';
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => (isDark ? derotDark : derotLight), [isDark]);

  const value = useMemo(
    () => ({
      themeMode,
      isDark,
      colors,
      setThemeMode,
      toggleTheme,
    }),
    [themeMode, isDark, colors, setThemeMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback an toàn nếu gọi ngoài ThemeProvider
    return {
      themeMode: 'dark',
      isDark: true,
      colors: derotDark,
      setThemeMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}

// src/constants/roles.js
// Định nghĩa các cấp bậc vai trò (RBAC) cho ToolKit

export const ROLES = {
  FREE: 'free',
  VIP: 'vip',
  ADMIN: 'admin',
};

// Cấu hình nhãn & màu sắc cho từng vai trò theo phong cách Derot
export const ROLE_CONFIG = {
  [ROLES.ADMIN]: {
    label: 'ADMIN',
    name: 'Quản trị viên',
    color: '#EF4444',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: 'shield-checkmark',
  },
  [ROLES.VIP]: {
    label: 'VIP GOLD',
    name: 'Thành viên VIP',
    color: '#FFD000',
    bg: 'rgba(255, 208, 0, 0.15)',
    border: 'rgba(255, 208, 0, 0.35)',
    icon: 'crown',
  },
  [ROLES.FREE]: {
    label: 'FREE',
    name: 'Thành viên Thường',
    color: '#9E9EA7',
    bg: 'rgba(255, 255, 255, 0.08)',
    border: 'rgba(255, 255, 255, 0.15)',
    icon: 'person',
  },
};

// Helper kiểm tra quyền truy cập công cụ (Hỗ trợ cấu hình động từ Admin)
export function canAccessTool(user, tool, customTiers = null) {
  if (!tool) return false;
  const currentTier = customTiers?.[tool.id] || tool.tier || 'free';
  // Nếu công cụ không yêu cầu VIP hoặc người dùng là VIP / ADMIN -> Được truy cập
  if (currentTier !== 'vip') return true;
  return user?.role === ROLES.VIP || user?.role === ROLES.ADMIN;
}

export function getToolTier(tool, customTiers = null) {
  if (!tool) return 'free';
  return customTiers?.[tool.id] || tool.tier || 'free';
}

export function isVip(user) {
  return user?.role === ROLES.VIP || user?.role === ROLES.ADMIN;
}

export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

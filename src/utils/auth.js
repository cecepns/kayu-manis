import { MENU_ITEMS } from '../constants/menuConfig';

const AUTH_KEYS = {
  isAuthenticated: 'isAuthenticated',
  userId: 'userId',
  username: 'username',
  menuPermissions: 'menuPermissions',
};

export const getMenuPermissions = () => {
  try {
    const stored = localStorage.getItem(AUTH_KEYS.menuPermissions);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const hasMenuAccess = (menuKey) => getMenuPermissions().includes(menuKey);

export const getAllowedMenuItems = () => {
  const permissions = getMenuPermissions();
  return MENU_ITEMS.filter((item) => permissions.includes(item.key));
};

export const getDefaultAppRoute = () => {
  const allowed = getAllowedMenuItems();
  return allowed[0]?.path || '/';
};

export const getMenuKeyForPath = (pathname) => {
  const item = MENU_ITEMS.find((menu) => pathname.startsWith(menu.path));
  return item?.key || null;
};

export const setAuthSession = (user) => {
  localStorage.setItem(AUTH_KEYS.isAuthenticated, 'true');
  localStorage.setItem(AUTH_KEYS.userId, String(user.id));
  localStorage.setItem(AUTH_KEYS.username, user.username);
  localStorage.setItem(AUTH_KEYS.menuPermissions, JSON.stringify(user.menu_permissions || []));
};

export const clearAuthSession = () => {
  Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key));
};

export const getStoredUserId = () => localStorage.getItem(AUTH_KEYS.userId);

export const isAuthenticated = () =>
  localStorage.getItem(AUTH_KEYS.isAuthenticated) === 'true';

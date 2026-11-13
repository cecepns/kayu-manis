import { MENU_ITEMS } from '../constants/menuConfig';

const AUTH_KEYS = {
  isAuthenticated: 'isAuthenticated',
  userId: 'userId',
  username: 'username',
  menuPermissions: 'menuPermissions',
  menuRoles: 'menuRoles',
  canViewPrice: 'canViewPrice',
  allowedFolderIds: 'allowedFolderIds',
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

export const getMenuRoles = () => {
  try {
    const stored = localStorage.getItem(AUTH_KEYS.menuRoles);
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const getMenuRole = (menuKey) => {
  const roles = getMenuRoles();
  return roles[menuKey] === 'viewer' ? 'viewer' : 'editor';
};

export const isMenuEditor = (menuKey) => {
  return hasMenuAccess(menuKey) && getMenuRole(menuKey) === 'editor';
};

export const isMenuViewer = (menuKey) => {
  return hasMenuAccess(menuKey) && getMenuRole(menuKey) === 'viewer';
};

export const canViewPrice = () => {
  const val = localStorage.getItem(AUTH_KEYS.canViewPrice);
  if (val === 'false' || val === '0') return false;
  return true;
};

export const getAllowedFolderIds = () => {
  try {
    const stored = localStorage.getItem(AUTH_KEYS.allowedFolderIds);
    if (!stored || stored === 'null' || stored === 'undefined') return null;
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((id) => Number(id)).filter((n) => !isNaN(n));
    }
    return null;
  } catch {
    return null;
  }
};

export const isFolderAllowed = (folderId) => {
  const allowed = getAllowedFolderIds();
  if (!allowed || allowed.length === 0) return true;
  if (!folderId) return false;
  return allowed.includes(Number(folderId));
};

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
  localStorage.setItem(AUTH_KEYS.menuRoles, JSON.stringify(user.menu_roles || {}));
  localStorage.setItem(
    AUTH_KEYS.canViewPrice,
    String(user.can_view_price === 0 || user.can_view_price === false ? 'false' : 'true')
  );
  localStorage.setItem(
    AUTH_KEYS.allowedFolderIds,
    JSON.stringify(user.allowed_folder_ids || null)
  );
};

export const clearAuthSession = () => {
  Object.values(AUTH_KEYS).forEach((key) => localStorage.removeItem(key));
};

export const getStoredUserId = () => localStorage.getItem(AUTH_KEYS.userId);

export const isAuthenticated = () =>
  localStorage.getItem(AUTH_KEYS.isAuthenticated) === 'true';

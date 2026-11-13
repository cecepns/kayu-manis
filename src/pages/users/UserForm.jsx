import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Edit3, Folder, DollarSign } from 'lucide-react';
import { usersAPI } from '../../utils/apiUsers';
import { foldersAPI } from '../../utils/apiFolders';
import { MENU_PERMISSION_OPTIONS } from '../../constants/menuConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableFolders, setAvailableFolders] = useState([]);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    is_active: true,
    menu_permissions: [],
    menu_roles: {},
    can_view_price: true,
    folder_access_type: 'all', // 'all' | 'custom'
    allowed_folder_ids: [],
  });

  const loadFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getFolders();
      setAvailableFolders(response.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await usersAPI.getUser(id);
      const permissions = user.menu_permissions || [];
      const roles = user.menu_roles || {};
      const menuRoles = {};
      permissions.forEach((key) => {
        menuRoles[key] = roles[key] === 'viewer' ? 'viewer' : 'editor';
      });

      const allowedFolders = Array.isArray(user.allowed_folder_ids)
        ? user.allowed_folder_ids.map(Number)
        : [];

      setFormData({
        username: user.username || '',
        password: '',
        is_active: Boolean(user.is_active),
        menu_permissions: permissions,
        menu_roles: menuRoles,
        can_view_price: user.can_view_price !== 0 && user.can_view_price !== false,
        folder_access_type: allowedFolders.length > 0 ? 'custom' : 'all',
        allowed_folder_ids: allowedFolders,
      });
    } catch (error) {
      console.error('Error loading user:', error);
      alert('Error loading user');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (isEdit) {
      loadUser();
    }
  }, [isEdit, loadUser]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' && name !== 'menu_permissions' ? checked : value,
    }));
  };

  const handlePermissionToggle = (menuKey) => {
    setFormData((prev) => {
      const hasKey = prev.menu_permissions.includes(menuKey);
      const nextPermissions = hasKey
        ? prev.menu_permissions.filter((key) => key !== menuKey)
        : [...prev.menu_permissions, menuKey];

      const nextRoles = { ...prev.menu_roles };
      if (!hasKey) {
        nextRoles[menuKey] = nextRoles[menuKey] || 'editor';
      } else {
        delete nextRoles[menuKey];
      }

      return {
        ...prev,
        menu_permissions: nextPermissions,
        menu_roles: nextRoles,
      };
    });
  };

  const handleRoleChange = (menuKey, role) => {
    setFormData((prev) => ({
      ...prev,
      menu_roles: {
        ...prev.menu_roles,
        [menuKey]: role,
      },
    }));
  };

  const handleSelectAll = () => {
    const allKeys = MENU_PERMISSION_OPTIONS.map((opt) => opt.key);
    const roles = {};
    allKeys.forEach((key) => {
      roles[key] = formData.menu_roles[key] || 'editor';
    });
    setFormData((prev) => ({
      ...prev,
      menu_permissions: allKeys,
      menu_roles: roles,
    }));
  };

  const handleClearAll = () => {
    setFormData((prev) => ({
      ...prev,
      menu_permissions: [],
      menu_roles: {},
    }));
  };

  const handleFolderToggle = (folderId) => {
    const numId = Number(folderId);
    setFormData((prev) => {
      const exists = prev.allowed_folder_ids.includes(numId);
      const nextFolders = exists
        ? prev.allowed_folder_ids.filter((id) => id !== numId)
        : [...prev.allowed_folder_ids, numId];
      return {
        ...prev,
        allowed_folder_ids: nextFolders,
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username.trim()) {
      alert('Username is required');
      return;
    }

    if (!isEdit && !formData.password.trim()) {
      alert('Password is required for new users');
      return;
    }

    if (formData.menu_permissions.length === 0) {
      alert('Select at least one menu permission');
      return;
    }

    if (
      formData.folder_access_type === 'custom' &&
      formData.allowed_folder_ids.length === 0
    ) {
      alert('Pilih minimal satu folder untuk akses terbatas, atau pilih "Semua Folder".');
      return;
    }

    const payload = {
      username: formData.username.trim(),
      menu_permissions: formData.menu_permissions,
      menu_roles: formData.menu_roles,
      can_view_price: formData.can_view_price ? 1 : 0,
      allowed_folder_ids:
        formData.folder_access_type === 'custom' && formData.allowed_folder_ids.length > 0
          ? formData.allowed_folder_ids
          : null,
      is_active: formData.is_active,
    };

    if (formData.password.trim()) {
      payload.password = formData.password;
    }

    try {
      setSaving(true);

      if (isEdit) {
        await usersAPI.updateUser(id, payload);
      } else {
        await usersAPI.createUser(payload);
      }

      navigate('/app/users');
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error?.error || error?.message || 'Error saving user';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading user..." />;
  }

  return (
    <div className="space-y-6 mb-24 max-w-4xl">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/app/users')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit User' : 'Add New User'}</h1>
          <p className="page-subtitle">
            {isEdit
              ? 'Update account, permissions, role level, and folder restriction'
              : 'Create a new user account with customized menu and folder access'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter username"
                autoComplete="username"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password {!isEdit && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required={!isEdit}
                className="input-field"
                placeholder={isEdit ? 'Leave blank to keep current password' : 'Enter password'}
                autoComplete={isEdit ? 'new-password' : 'new-password'}
              />
            </div>
            <div className="md:col-span-2 flex items-center pt-2">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700 font-medium">
                Active (user can sign in)
              </label>
            </div>
          </div>
        </div>

        {/* Menu Access & Role Level */}
        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Menu Access</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select which menus this user can see in the sidebar and choose role (Editor or Viewer)
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleSelectAll} className="btn-secondary text-sm py-1.5">
                Select all
              </button>
              <button type="button" onClick={handleClearAll} className="btn-secondary text-sm py-1.5">
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {MENU_PERMISSION_OPTIONS.map((option) => {
              const isChecked = formData.menu_permissions.includes(option.key);
              const currentRole = formData.menu_roles[option.key] || 'editor';

              return (
                <div
                  key={option.key}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isChecked
                      ? 'border-primary-300 bg-primary-50/40 shadow-xs'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start space-x-3 cursor-pointer select-none flex-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handlePermissionToggle(option.key)}
                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">
                          {option.label}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {option.description}
                        </span>
                      </span>
                    </label>

                    {/* Editor / Viewer buttons */}
                    {isChecked && (
                      <div className="inline-flex rounded-lg border border-gray-300 p-0.5 bg-white shrink-0 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleRoleChange(option.key, 'editor')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            currentRole === 'editor'
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Edit3 className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                          Editor
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRoleChange(option.key, 'viewer')}
                          className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                            currentRole === 'viewer'
                              ? 'bg-primary-600 text-white shadow-xs'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Eye className="w-3 h-3 inline-block mr-1 -mt-0.5" />
                          Viewer
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Price Visibility */}
        <div className="card">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0 mt-0.5">
              <DollarSign className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">Akses Harga (Price Visibility)</h2>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Atur apakah pengguna dapat melihat nominal harga (FOB Price & Total Price).
              </p>
              <label className="flex items-center space-x-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="can_view_price"
                  name="can_view_price"
                  checked={formData.can_view_price}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-800">
                  Izinkan melihat harga produk dan pesanan
                </span>
              </label>
              {!formData.can_view_price && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200">
                  Semua informasi FOB Price dan Total Price akan disembunyikan dari akun pengguna ini.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Folder Restriction */}
        <div className="card">
          <div className="flex items-start space-x-3 mb-4">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0 mt-0.5">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Akses Folder Produk (Folder Restriction)
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Batasi folder mana saja yang dapat dilihat dan diisi oleh pengguna (contoh: akun operator untuk folder <strong>CRAFT KM</strong>).
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-1">
            <div className="flex flex-col sm:flex-row gap-4">
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="folder_access_type"
                  value="all"
                  checked={formData.folder_access_type === 'all'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  Semua Folder (Akses Penuh)
                </span>
              </label>
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="folder_access_type"
                  value="custom"
                  checked={formData.folder_access_type === 'custom'}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-gray-900">
                  Folder Tertentu Saja (Akses Terbatas)
                </span>
              </label>
            </div>

            {formData.folder_access_type === 'custom' && (
              <div className="mt-4 p-4 rounded-lg bg-gray-50 border border-gray-200 space-y-3">
                <div className="text-xs text-gray-600 font-medium">
                  Centang folder yang diizinkan untuk akun ini:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
                  {availableFolders.map((folder) => {
                    const isSelected = formData.allowed_folder_ids.includes(Number(folder.id));
                    return (
                      <label
                        key={folder.id}
                        className={`flex items-center space-x-2.5 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary-50 border-primary-300 text-primary-900 font-medium'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleFolderToggle(folder.id)}
                          className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: folder.color || '#3B82F6' }}
                        />
                        <span className="truncate flex-1">{folder.name}</span>
                        <span className="text-xs text-gray-400">
                          ({folder.product_count || 0})
                        </span>
                      </label>
                    );
                  })}
                </div>
                <div className="text-xs text-blue-700 bg-blue-50 p-2.5 rounded-md border border-blue-200 flex items-start space-x-2">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    Pengguna dengan pembatasan ini hanya akan melihat folder yang dipilih di menu <strong>Folders</strong>, hanya melihat produk di folder tersebut pada menu <strong>Products</strong>, dan produk baru akan langsung disimpan ke folder ini.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/app/users')}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>{isEdit ? 'Update User' : 'Create User'}</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;

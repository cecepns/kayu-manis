import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usersAPI } from '../../utils/apiUsers';
import { MENU_PERMISSION_OPTIONS } from '../../constants/menuConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    is_active: true,
    menu_permissions: [],
  });

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const user = await usersAPI.getUser(id);
      setFormData({
        username: user.username || '',
        password: '',
        is_active: Boolean(user.is_active),
        menu_permissions: user.menu_permissions || [],
      });
    } catch (error) {
      console.error('Error loading user:', error);
      alert('Error loading user');
    } finally {
      setLoading(false);
    }
  }, [id]);

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
      return {
        ...prev,
        menu_permissions: hasKey
          ? prev.menu_permissions.filter((key) => key !== menuKey)
          : [...prev.menu_permissions, menuKey],
      };
    });
  };

  const handleSelectAll = () => {
    setFormData((prev) => ({
      ...prev,
      menu_permissions: MENU_PERMISSION_OPTIONS.map((opt) => opt.key),
    }));
  };

  const handleClearAll = () => {
    setFormData((prev) => ({
      ...prev,
      menu_permissions: [],
    }));
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

    const payload = {
      username: formData.username.trim(),
      menu_permissions: formData.menu_permissions,
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
    <div className="space-y-6 mb-24">
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
            {isEdit ? 'Update account and menu access' : 'Create a new user account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <div className="grid grid-cols-1 gap-4">
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
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                name="is_active"
                checked={formData.is_active}
                onChange={handleInputChange}
                className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                Active (user can sign in)
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Menu Access</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select which menus this user can see in the sidebar
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MENU_PERMISSION_OPTIONS.map((option) => (
              <label
                key={option.key}
                className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.menu_permissions.includes(option.key)
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.menu_permissions.includes(option.key)}
                  onChange={() => handlePermissionToggle(option.key)}
                  className="mt-0.5 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                  <span className="block text-xs text-gray-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6">
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

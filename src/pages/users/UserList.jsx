import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, UserCog, DollarSign, Folder } from 'lucide-react';
import { usersAPI } from '../../utils/apiUsers';
import { foldersAPI } from '../../utils/apiFolders';
import { getStoredUserId } from '../../utils/auth';
import { MENU_PERMISSION_OPTIONS } from '../../constants/menuConfig';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const permissionLabelMap = Object.fromEntries(
  MENU_PERMISSION_OPTIONS.map((opt) => [opt.key, opt.label])
);

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  const previousSearchTermRef = useRef(searchTerm);
  const currentUserId = getStoredUserId();

  const loadFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getFolders();
      setFolders(response.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getUsers(currentPage, itemsPerPage, searchTerm);
      setUsers(response.users);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleDelete = async (id) => {
    if (String(id) === String(currentUserId)) {
      alert('You cannot delete your own account while logged in.');
      return;
    }

    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(id);
        loadUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        const message =
          (typeof error === 'object' && error?.error) ||
          (typeof error === 'object' && error?.message) ||
          (typeof error === 'string' ? error : 'Error deleting user');
        alert(message);
      }
    }
  };

  const handleSearch = useCallback((search) => {
    const trimmedSearch = search.trim();
    const trimmedPrevious = (previousSearchTermRef.current || '').trim();

    if (trimmedSearch !== trimmedPrevious) {
      previousSearchTermRef.current = search;
      setSearchTerm(search);
      setCurrentPage(1);
    }
  }, []);

  const getFolderNames = (folderIds) => {
    if (!folderIds || folderIds.length === 0) return 'Semua Folder';
    const names = folderIds
      .map((id) => {
        const found = folders.find((f) => Number(f.id) === Number(id));
        return found ? found.name : `Folder #${id}`;
      })
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : 'Semua Folder';
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Users</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage accounts, role level (Editor/Viewer), and folder access
          </p>
        </div>
        <Link to="/app/users/new" className="btn-primary w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add User</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      <div className="card">
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search users by username..."
          className="flex-1"
        />
      </div>

      <div className="hidden md:block card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner text="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <UserCog className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <p className="text-gray-500 mb-4">Create a user to get started.</p>
            <Link to="/app/users/new" className="btn-primary max-w-fit mx-auto">
              <Plus className="w-4 h-4" />
              Add User
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Menu Access & Role
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Akses Folder
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lihat Harga
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => {
                    const permissions = user.menu_permissions || [];
                    const roles = user.menu_roles || {};
                    const hasFolderRestriction =
                      Array.isArray(user.allowed_folder_ids) && user.allowed_folder_ids.length > 0;
                    const canPrice = user.can_view_price !== 0 && user.can_view_price !== false;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">{user.username}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {permissions.map((key) => {
                              const role = roles[key] || 'editor';
                              const isEditor = role === 'editor';
                              return (
                                <span
                                  key={key}
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                                    isEditor
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {permissionLabelMap[key] || key}
                                  <span className="ml-1 opacity-75 font-normal">
                                    ({isEditor ? 'Editor' : 'Viewer'})
                                  </span>
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {hasFolderRestriction ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                              <Folder className="w-3 h-3 mr-1" />
                              {getFolderNames(user.allowed_folder_ids)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Semua Folder</span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          {canPrice ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <DollarSign className="w-3 h-3 mr-0.5" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                              Disembunyikan
                            </span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                              user.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Link
                            to={`/app/users/${user.id}/edit`}
                            className="text-primary-600 hover:text-primary-900 inline-flex items-center p-1"
                            title="Edit"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(user.id)}
                            disabled={String(user.id) === String(currentUserId)}
                            className="text-red-600 hover:text-red-900 inline-flex items-center p-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Mobile view */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="card py-12">
            <LoadingSpinner text="Loading users..." />
          </div>
        ) : users.length === 0 ? (
          <div className="card text-center py-12">
            <UserCog className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
            <Link to="/app/users/new" className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add User
            </Link>
          </div>
        ) : (
          <>
            {users.map((user) => {
              const permissions = user.menu_permissions || [];
              const roles = user.menu_roles || {};
              const hasFolderRestriction =
                Array.isArray(user.allowed_folder_ids) && user.allowed_folder_ids.length > 0;
              const canPrice = user.can_view_price !== 0 && user.can_view_price !== false;

              return (
                <div key={user.id} className="card space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{user.username}</h3>
                      <span
                        className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/app/users/${user.id}/edit`}
                        className="text-primary-600 hover:text-primary-900 p-1"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id)}
                        disabled={String(user.id) === String(currentUserId)}
                        className="text-red-600 hover:text-red-900 p-1 disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-gray-500 font-medium">Menu & Role:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {permissions.map((key) => {
                          const role = roles[key] || 'editor';
                          return (
                            <span
                              key={key}
                              className={`px-1.5 py-0.5 rounded border ${
                                role === 'editor'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {permissionLabelMap[key] || key} ({role})
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                      <span className="text-gray-500">Akses Folder:</span>
                      <span className="font-medium text-gray-800">
                        {hasFolderRestriction
                          ? getFolderNames(user.allowed_folder_ids)
                          : 'Semua Folder'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Lihat Harga:</span>
                      <span className="font-medium text-gray-800">
                        {canPrice ? 'Aktif' : 'Disembunyikan'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default UserList;

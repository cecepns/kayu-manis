import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, Folder } from 'lucide-react';
import { foldersAPI } from '../../utils/apiFolders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SearchBar from '../../components/common/SearchBar';

const FolderList = () => {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await foldersAPI.getFolders();
      let foldersData = response.folders || [];
      
      // Filter by search term
      if (searchTerm) {
        foldersData = foldersData.filter(folder =>
          folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (folder.description && folder.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      }
      
      setFolders(foldersData);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this folder? Products in this folder will be moved to "Uncategorized".')) {
      try {
        await foldersAPI.deleteFolder(id);
        loadFolders();
      } catch (error) {
        console.error('Error deleting folder:', error);
        
        let message = 'Error deleting folder';
        if (typeof error === 'object' && error !== null) {
          if (error.error) {
            message = error.error;
          } else if (error.message) {
            message = error.message;
          }
        } else if (typeof error === 'string') {
          message = error;
        }

        alert(message);
      }
    }
  };

  const handleSearch = useCallback((search) => {
    setSearchTerm(search);
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading folders..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Product Folders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Organize your products into folders</p>
        </div>
        <Link to="/app/folders/new" className="btn-primary w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Folder</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search */}
      <div className="card">
        <SearchBar 
          onSearch={handleSearch}
          value={searchTerm}
          placeholder="Search folders by name or description..."
          className="flex-1"
        />
      </div>

      {/* Folders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.length === 0 ? (
          <div className="col-span-full card text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No folders found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first folder.</p>
            <Link to="/app/folders/new" className="btn-primary max-w-fit mx-auto">
              <Plus className="w-4 h-4" />
              Add Folder
            </Link>
          </div>
        ) : (
          folders.map((folder) => (
            <div key={folder.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: folder.color ? `${folder.color}20` : '#E5E7EB',
                        color: folder.color || '#6B7280'
                      }}
                    >
                      <Folder className="w-5 h-5" style={{ color: folder.color || '#6B7280' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {folder.product_count || 0} {folder.product_count === 1 ? 'product' : 'products'}
                      </p>
                    </div>
                  </div>
                  {folder.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                      {folder.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <Link 
                    to={`/app/folders/${folder.id}/edit`}
                    className="text-primary-600 hover:text-primary-900 inline-flex items-center p-2"
                    title="Edit"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => handleDelete(folder.id)}
                    className="text-red-600 hover:text-red-900 inline-flex items-center p-2"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FolderList;


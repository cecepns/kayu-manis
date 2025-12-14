import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { foldersAPI } from '../../utils/apiFolders';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const FolderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6'
  });

  const loadFolder = useCallback(async () => {
    try {
      setLoading(true);
      const folder = await foldersAPI.getFolder(id);
      
      setFormData({
        name: folder.name || '',
        description: folder.description || '',
        color: folder.color || '#3B82F6'
      });
    } catch (error) {
      console.error('Error loading folder:', error);
      alert('Error loading folder');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      loadFolder();
    }
  }, [isEdit, loadFolder]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Folder name is required');
      return;
    }
    
    try {
      setSaving(true);
      
      if (isEdit) {
        await foldersAPI.updateFolder(id, formData);
      } else {
        await foldersAPI.createFolder(formData);
      }
      
      navigate('/app/folders');
    } catch (error) {
      console.error('Error saving folder:', error);
      let message = 'Error saving folder';
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
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = [
    { value: '#3B82F6', label: 'Blue' },
    { value: '#10B981', label: 'Green' },
    { value: '#F59E0B', label: 'Amber' },
    { value: '#EF4444', label: 'Red' },
    { value: '#8B5CF6', label: 'Purple' },
    { value: '#EC4899', label: 'Pink' },
    { value: '#06B6D4', label: 'Cyan' },
    { value: '#84CC16', label: 'Lime' },
    { value: '#F97316', label: 'Orange' },
    { value: '#6366F1', label: 'Indigo' },
  ];

  if (loading) {
    return <LoadingSpinner text={`Loading folder...`} />;
  }

  return (
    <div className="space-y-6 mb-24">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/app/folders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Folder' : 'Add New Folder'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update folder information' : 'Create a new folder to organize your products'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Folder Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Folder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter folder name"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="input-field"
                placeholder="Enter folder description (optional)"
              />
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                />
                <select
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="input-field flex-1"
                >
                  {colorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Choose a color to help identify this folder
              </p>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/app/folders')}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                {isEdit ? 'Update Folder' : 'Create Folder'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FolderForm;


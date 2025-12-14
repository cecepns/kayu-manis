import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { buyersAPI } from '../../utils/apiBuyers';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const BuyerForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: ''
  });

  const loadBuyer = useCallback(async () => {
    try {
      setLoading(true);
      const buyer = await buyersAPI.getBuyer(id);
      setFormData({
        name: buyer.name || '',
        address: buyer.address || ''
      });
    } catch (error) {
      console.error('Error loading buyer:', error);
      alert('Error loading buyer');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (isEdit) {
      loadBuyer();
    }
  }, [isEdit, loadBuyer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.address.trim()) {
      alert('Name and address are required');
      return;
    }
    
    try {
      setSaving(true);
      
      if (isEdit) {
        await buyersAPI.updateBuyer(id, formData);
      } else {
        await buyersAPI.createBuyer(formData);
      }
      
      navigate('/app/buyers');
    } catch (error) {
      console.error('Error saving buyer:', error);
      const errorMessage = error?.error || error?.message || 'Error saving buyer';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Loading buyer...`} />;
  }

  return (
    <div className="space-y-6 mb-24">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/app/buyers')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Buyer' : 'Add New Buyer'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update buyer information' : 'Add a new buyer to your system'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="input-field"
                placeholder="Enter buyer name"
              />
            </div>
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                rows={5}
                className="input-field"
                placeholder="Enter buyer address"
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/app/buyers')}
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
                {isEdit ? 'Update Buyer' : 'Create Buyer'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BuyerForm;




import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, X } from 'lucide-react';
import Select from 'react-select';
import { productsAPI } from '../../utils/apiProducts';
import { foldersAPI } from '../../utils/apiFolders';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ProductForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [folders, setFolders] = useState([]);

  const [formData, setFormData] = useState({
    client_code: '',
    client_barcode: '',
    client_description: '',
    km_code: '',
    description: '',
    folder_id: '',
    picture: null,
    size_width: '',
    size_depth: '',
    size_height: '',
    packing_width: '',
    packing_depth: '',
    packing_height: '',
    cbm: '',
    color: '',
    gross_weight: '',
    net_weight: '',
    total_gw: '',
    total_nw: '',
    fob_price: '',
    total_price: '',
    hs_code: ''
  });

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const product = await productsAPI.getProduct(id);
      
      // Calculate CBM from packing dimensions
      let calculatedCBM = '';
      if (product.packing_width && product.packing_depth && product.packing_height) {
        const width = parseFloat(product.packing_width) || 0;
        const depth = parseFloat(product.packing_depth) || 0;
        const height = parseFloat(product.packing_height) || 0;
        if (width > 0 && depth > 0 && height > 0) {
          calculatedCBM = ((width * depth * height) / 1000000).toFixed(4);
        }
      }

      setFormData({
        client_code: product.client_code || '',
        client_barcode: product.client_barcode || '',
        client_description: product.client_description || '',
        km_code: product.km_code || '',
        description: product.description || '',
        folder_id: product.folder_id || '',
        picture: null,
        size_width: product.size_width || '',
        size_depth: product.size_depth || '',
        size_height: product.size_height || '',
        packing_width: product.packing_width || '',
        packing_depth: product.packing_depth || '',
        packing_height: product.packing_height || '',
        cbm: calculatedCBM || product.cbm || '',
        color: product.color || '',
        gross_weight: product.gross_weight || '',
        net_weight: product.net_weight || '',
        total_gw: product.gross_weight || product.total_gw || '',
        total_nw: product.net_weight || product.total_nw || '',
        fob_price: product.fob_price || '',
        total_price: product.fob_price || product.total_price || '',
        hs_code: product.hs_code || ''
      });
      
      if (product.picture_url) {
        setImagePreview(`https://api-inventory.isavralabel.com/kayu-manis-properti${product.picture_url}`);
      }
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Error loading product');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getFolders();
      setFolders(response.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    }
  }, [isEdit, loadProduct]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updatedFormData = {
      ...formData,
      [name]: value
    };

    // Auto-calculate CBM from packing dimensions: W x D x H / 1,000,000
    if (name === 'packing_width' || name === 'packing_depth' || name === 'packing_height') {
      const width = parseFloat(name === 'packing_width' ? value : updatedFormData.packing_width) || 0;
      const depth = parseFloat(name === 'packing_depth' ? value : updatedFormData.packing_depth) || 0;
      const height = parseFloat(name === 'packing_height' ? value : updatedFormData.packing_height) || 0;
      
      if (width > 0 && depth > 0 && height > 0) {
        updatedFormData.cbm = ((width * depth * height) / 1000000).toFixed(4);
      } else {
        updatedFormData.cbm = '';
      }
    }

    // Auto-calculate total_gw from gross_weight
    if (name === 'gross_weight') {
      updatedFormData.total_gw = value || '';
    }

    // Auto-calculate total_nw from net_weight
    if (name === 'net_weight') {
      updatedFormData.total_nw = value || '';
    }

    // Auto-calculate total_price from fob_price
    if (name === 'fob_price') {
      updatedFormData.total_price = value || '';
    }

    setFormData(updatedFormData);
  };

  // Prevent scroll wheel from changing number input values
  const handleNumberInputWheel = (e) => {
    // Prevent default scroll behavior that increments/decrements the number
    e.preventDefault();
    // Blur the input to allow page scrolling
    e.target.blur();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        picture: file
      }));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      picture: null
    }));
    setImagePreview(null);
    document.getElementById('picture').value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      if (isEdit) {
        await productsAPI.updateProduct(id, formData);
      } else {
        await productsAPI.createProduct(formData);
      }
      
      navigate('/app/products');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text={`Loading product...`} />;
  }

  const HS_CODE_OPTIONS = [
    { value: '9403.60.90', label: '9403.60.90' },
    { value: '9403.91.00', label: '9403.91.00' },
    { value: '9401.69.90', label: '9401.69.90' },
    { value: '7009.92.00', label: '7009.92.00' },
    { value: '6910.90.00', label: '6910.90.00' }
  ];

  const formSections = [
    {
      title: 'Basic Information',
      fields: [
        { label: 'Client Code', name: 'client_code', type: 'text', required: false },
        { label: 'Client Barcode', name: 'client_barcode', type: 'text', required: false },
        { label: 'Client Description', name: 'client_description', type: 'textarea', required: false },
        { label: 'KM Code', name: 'km_code', type: 'text', required: true },
        { label: 'Description', name: 'description', type: 'textarea', required: false },
        { label: 'Folder', name: 'folder_id', type: 'select', options: folders.map(f => ({ value: f.id.toString(), label: f.name })), required: false },
      ]
    },
    {
      title: 'Product Image',
      fields: [
        { label: 'Picture', name: 'picture', type: 'file' }
      ]
    },
    {
      title: 'Size Specifications',
      fields: [
        { label: 'Width (cm)', name: 'size_width', type: 'number' },
        { label: 'Depth (cm)', name: 'size_depth', type: 'number' },
        { label: 'Height (cm)', name: 'size_height', type: 'number' }
      ]
    },
    {
      title: 'Packing Size',
      fields: [
        { label: 'Packing Width (cm)', name: 'packing_width', type: 'number' },
        { label: 'Packing Depth (cm)', name: 'packing_depth', type: 'number' },
        { label: 'Packing Height (cm)', name: 'packing_height', type: 'number' }
      ]
    },
    {
      title: 'Physical Properties',
      fields: [
        { label: 'CBM (Auto-calculated from packing size)', name: 'cbm', type: 'number', step: '0.01', readOnly: true },
        { label: 'Color', name: 'color', type: 'text' }
      ]
    },
    {
      title: 'Weight Specifications',
      fields: [
        { label: 'Gross Weight (Kgs)', name: 'gross_weight', type: 'number', step: '0.01' },
        { label: 'Net Weight (Kgs)', name: 'net_weight', type: 'number', step: '0.01' },
        { label: 'Total GW (Kgs) (Auto-calculated)', name: 'total_gw', type: 'number', step: '0.01', readOnly: true },
        { label: 'Total NW (Kgs) (Auto-calculated)', name: 'total_nw', type: 'number', step: '0.01', readOnly: true }
      ]
    },
    {
      title: 'Pricing',
      fields: [
        { label: 'FOB Price', name: 'fob_price', type: 'number', step: '0.01' },
        { label: 'Total Price (Auto-calculated)', name: 'total_price', type: 'number', step: '0.01', readOnly: true }
      ]
    },
    {
      title: 'Additional Information',
      fields: [
        { label: 'HS Code', name: 'hs_code', type: 'select', isReactSelect: true, options: HS_CODE_OPTIONS }
      ]
    }
  ];

  return (
    <div className="space-y-6 mb-24">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/app/products')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Product' : 'Add New Product'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update product information' : 'Add a new furniture product to your catalog'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
            
            {section.title === 'Product Image' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Image
                  </label>
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <div className="relative">
                          <img 
                            src={imagePreview}
                            alt="Product preview"
                            className="h-32 w-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-32 w-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          <Upload className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        id="picture"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="input-field"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Upload a product image (PNG, JPG, JPEG up to 5MB)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.fields.map((field, fieldIndex) => (
                  <div key={fieldIndex} className={field.type === 'textarea' ? 'md:col-span-2 lg:col-span-3' : ''}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        required={field.required}
                        rows={3}
                        className="input-field"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    ) : field.type === 'select' ? (
                      field.isReactSelect ? (
                        <Select
                          id={field.name}
                          name={field.name}
                          value={
                            field.options.find(
                              (option) => option.value === formData[field.name]
                            ) || null
                          }
                          onChange={(selectedOption) =>
                            setFormData((prev) => ({
                              ...prev,
                              [field.name]: selectedOption ? selectedOption.value : ''
                            }))
                          }
                          options={field.options}
                          isClearable
                          className="react-select-container"
                          classNamePrefix="react-select"
                          placeholder={`Select ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <select
                          id={field.name}
                          name={field.name}
                          value={formData[field.name]}
                          onChange={handleInputChange}
                          required={field.required}
                          className="input-field"
                        >
                          <option value="">None</option>
                          {field.options && field.options.map((option) =>
                            typeof option === 'string' ? (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ) : (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            )
                          )}
                        </select>
                      )
                    ) : (
                      <input
                        type={field.type}
                        id={field.name}
                        name={field.name}
                        value={formData[field.name]}
                        onChange={handleInputChange}
                        onWheel={field.type === 'number' ? handleNumberInputWheel : undefined}
                        required={field.required}
                        step={field.step}
                        readOnly={field.readOnly}
                        className={`input-field ${field.readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/app/products')}
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
                {isEdit ? 'Update Product' : 'Create Product'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
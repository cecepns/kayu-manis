import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Upload, X, Camera, Plus, Image as ImageIcon } from 'lucide-react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { productsAPI } from '../../utils/apiProducts';
import { foldersAPI } from '../../utils/apiFolders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { canViewPrice, getAllowedFolderIds, isFolderAllowed } from '../../utils/auth';

const ProductForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const getProductsListPath = useCallback(() => {
    const q = location.state?.returnToListQuery;
    if (!q) return '/app/products';
    const params = new URLSearchParams();
    if (q.page) params.set('page', String(q.page));
    if (q.folder) params.set('folder', q.folder);
    if (q.search) params.set('search', q.search);
    const query = params.toString();
    return `/app/products${query ? `?${query}` : ''}`;
  }, [location.state]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [detailPreviews, setDetailPreviews] = useState([]);
  const [folders, setFolders] = useState([]);

  const allowedFolderIds = getAllowedFolderIds();
  const hasFolderRestriction = Boolean(allowedFolderIds && allowedFolderIds.length > 0);
  const singleAllowedFolderId =
    hasFolderRestriction && allowedFolderIds.length === 1
      ? String(allowedFolderIds[0])
      : null;

  const showPrice = canViewPrice();

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
    wood_cbm: '',
    color: '',
    gross_weight: '',
    net_weight: '',
    total_gw: '',
    total_nw: '',
    currency: 'USD',
    fob_price: '',
    total_price: '',
    hs_code: '',
    detail_pictures: [],
    existing_detail_pictures: []
  });

  const applyProductToForm = useCallback((product) => {
    if (hasFolderRestriction && product.folder_id && !isFolderAllowed(product.folder_id)) {
      alert('You do not have permission to view or edit products in this folder.');
      navigate(getProductsListPath());
      return;
    }
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
      wood_cbm: product.wood_cbm || '',
      currency: product.currency || 'USD',
      fob_price: product.fob_price || '',
      total_price: product.fob_price || product.total_price || '',
      hs_code: product.hs_code || '',
      detail_pictures: [],
      existing_detail_pictures: (() => {
        if (!product.detail_pictures) return [];
        try {
          return typeof product.detail_pictures === 'string'
            ? JSON.parse(product.detail_pictures)
            : product.detail_pictures;
        } catch {
          return [];
        }
      })()
    });

    if (product.picture_url) {
      setImagePreview(`https://api-be.kayumanishomefurniture.com${product.picture_url}`);
    } else {
      setImagePreview(null);
    }

    if (product.detail_pictures) {
      try {
        const parsed = typeof product.detail_pictures === 'string'
          ? JSON.parse(product.detail_pictures)
          : product.detail_pictures;
        if (Array.isArray(parsed)) {
          setDetailPreviews(parsed.map((url) => ({
            url: `https://api-be.kayumanishomefurniture.com${url}`,
            rawUrl: url,
            isExisting: true
          })));
        } else {
          setDetailPreviews([]);
        }
      } catch {
        setDetailPreviews([]);
      }
    } else {
      setDetailPreviews([]);
    }
  }, [hasFolderRestriction, navigate, getProductsListPath]);

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const product = await productsAPI.getProduct(id);
      applyProductToForm(product);
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Error loading product');
    } finally {
      setLoading(false);
    }
  }, [id, applyProductToForm]);

  const loadProductForCopy = useCallback(async (copyFromId) => {
    try {
      setLoading(true);
      const product = await productsAPI.getProduct(copyFromId);
      applyProductToForm(product);
    } catch (error) {
      console.error('Error loading product for copy:', error);
      alert('Error loading product for copy');
    } finally {
      setLoading(false);
    }
  }, [applyProductToForm]);

  const loadFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getFolders();
      let folderList = response.folders || [];
      if (hasFolderRestriction) {
        folderList = folderList.filter((f) => isFolderAllowed(f.id));
      }
      setFolders(folderList);

      if (singleAllowedFolderId && !isEdit) {
        setFormData((prev) => ({
          ...prev,
          folder_id: prev.folder_id || singleAllowedFolderId,
        }));
      }
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, [hasFolderRestriction, singleAllowedFolderId, isEdit]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (isEdit) {
      loadProduct();
    } else if (location.state?.copyFromProductId) {
      loadProductForCopy(location.state.copyFromProductId);
    }
  }, [isEdit, loadProduct, location.state?.copyFromProductId, loadProductForCopy]);

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
      setFormData((prev) => ({
        ...prev,
        picture: file
      }));

      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({
      ...prev,
      picture: null
    }));
    setImagePreview(null);
    const picInput = document.getElementById('picture');
    if (picInput) picInput.value = '';
    const camInput = document.getElementById('camera_cover');
    if (camInput) camInput.value = '';
  };

  const handleDetailImagesChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setDetailPreviews((prev) => [
          ...prev,
          { url: ev.target.result, file, isExisting: false }
        ]);
      };
      reader.readAsDataURL(file);
    });

    setFormData((prev) => ({
      ...prev,
      detail_pictures: [...(prev.detail_pictures || []), ...files]
    }));
  };

  const removeDetailImage = (indexToRemove) => {
    const target = detailPreviews[indexToRemove];
    if (target.isExisting) {
      setFormData((prev) => ({
        ...prev,
        existing_detail_pictures: (prev.existing_detail_pictures || []).filter(
          (url) => url !== target.rawUrl
        )
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        detail_pictures: (prev.detail_pictures || []).filter(
          (f) => f !== target.file
        )
      }));
    }

    setDetailPreviews((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      const submissionData = {
        ...formData,
        existing_detail_pictures: JSON.stringify(formData.existing_detail_pictures || [])
      };
      
      if (isEdit) {
        await productsAPI.updateProduct(id, submissionData);
      } else {
        await productsAPI.createProduct(submissionData);
      }
      
      navigate(getProductsListPath());
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
    { value: '9403.60.90', label: '9403.60.90 - Wooden Furniture (Cabinet, Table, Column)' },
    { value: '9403.91.00', label: '9403.91.00 - Parts of Wooden Furniture' },
    { value: '9401.69.90', label: '9401.69.90 - Seats with Wooden Frames' },
    { value: '7009.92.00', label: '7009.92.00 - Glass Mirrors (Framed)' },
    { value: '6910.90.00', label: '6910.90.00 - Ceramic Sinks, Basins & Bathroom Fixtures' }
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
        { label: 'Folder', name: 'folder_id', type: 'select', options: folders.map(f => ({ value: f.id.toString(), label: f.name })), required: Boolean(singleAllowedFolderId), disabled: Boolean(singleAllowedFolderId) },
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
        { label: 'CBM (Auto-calculated from packing size)', name: 'cbm', type: 'number', step: '0.0001', readOnly: true },
        { label: 'Finished Volume CBM Kayu', name: 'wood_cbm', type: 'number', step: '0.0001' },
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
    ...(showPrice
      ? [
          {
            title: 'Pricing',
            fields: [
              {
                label: 'Currency',
                name: 'currency',
                type: 'select',
                options: [
                  { value: 'USD', label: 'USD ($)' },
                  { value: 'EUR', label: 'EUR (€)' },
                  { value: 'IDR', label: 'IDR (Rp)' }
                ]
              },
              { label: 'FOB Price', name: 'fob_price', type: 'number', step: '0.01' },
              {
                label: 'Total Price (Auto-calculated)',
                name: 'total_price',
                type: 'number',
                step: '0.01',
                readOnly: true,
              },
            ],
          },
        ]
      : []),
    {
      title: 'Additional Information',
      fields: [
        { label: 'HS Code', name: 'hs_code', type: 'select', isReactSelect: true, isCreatable: true, options: HS_CODE_OPTIONS }
      ]
    }
  ];

  return (
    <div className="space-y-6 mb-24">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate(getProductsListPath())}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">
            {isEdit ? 'Edit Product' : location.state?.copyFromProductId ? 'Copy Product' : 'Add New Product'}
          </h1>
          <p className="page-subtitle">
            {isEdit ? 'Update product information' : location.state?.copyFromProductId ? 'Create a new product with the same details' : 'Add a new furniture product to your catalog'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {formSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h2>
            
            {section.title === 'Product Image' ? (
              <div className="space-y-6">
                {/* 1. Cover Picture */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-900">
                      Foto Utama (Cover Picture)
                    </label>
                    <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded">
                      Template Picture Pertama = Cover
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start gap-4">
                    <div className="flex-shrink-0">
                      {imagePreview ? (
                        <div className="relative group">
                          <img 
                            src={imagePreview}
                            alt="Product preview"
                            className="h-36 w-36 object-contain bg-gray-50 rounded-lg border border-gray-300 shadow-2xs"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                            title="Hapus Cover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-36 w-36 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                          <ImageIcon className="w-8 h-8 mb-1" />
                          <span className="text-xs font-medium">Belum ada cover</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex flex-wrap gap-2">
                        <label
                          htmlFor="picture"
                          className="btn-secondary cursor-pointer text-xs py-2 px-3 inline-flex items-center"
                        >
                          <Upload className="w-3.5 h-3.5 mr-1.5" />
                          Pilih File Foto
                        </label>
                        <input
                          type="file"
                          id="picture"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />

                        <label
                          htmlFor="camera_cover"
                          className="btn-secondary cursor-pointer text-xs py-2 px-3 inline-flex items-center text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200"
                        >
                          <Camera className="w-3.5 h-3.5 mr-1.5" />
                          Ambil via Kamera
                        </label>
                        <input
                          type="file"
                          id="camera_cover"
                          accept="image/*"
                          capture="environment"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Foto autofit dan dioptimalkan otomatis. Format JPG, PNG, atau WEBP hingga 10MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Detail Pictures */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <label className="block text-sm font-semibold text-gray-900">
                        Foto-Foto Detail (Details)
                      </label>
                      <p className="text-xs text-gray-500">
                        Foto-foto berikutnya tersimpan sebagai details produk.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <label
                        htmlFor="detail_files"
                        className="btn-secondary cursor-pointer text-xs py-1.5 px-2.5 inline-flex items-center"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Tambah Foto Detail
                      </label>
                      <input
                        type="file"
                        id="detail_files"
                        accept="image/*"
                        multiple
                        onChange={handleDetailImagesChange}
                        className="hidden"
                      />

                      <label
                        htmlFor="detail_camera"
                        className="btn-secondary cursor-pointer text-xs py-1.5 px-2.5 inline-flex items-center text-primary-700 bg-primary-50 hover:bg-primary-100 border-primary-200"
                      >
                        <Camera className="w-3.5 h-3.5 mr-1" />
                        Kamera Detail
                      </label>
                      <input
                        type="file"
                        id="detail_camera"
                        accept="image/*"
                        capture="environment"
                        onChange={handleDetailImagesChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {detailPreviews.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                      {detailPreviews.map((pic, idx) => (
                        <div key={idx} className="relative group border rounded-lg p-1 bg-gray-50">
                          <img
                            src={pic.url}
                            alt={`Detail ${idx + 1}`}
                            className="h-24 w-full object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => removeDetailImage(idx)}
                            className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 shadow-sm"
                            title="Hapus foto detail"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <span className="block text-[10px] text-center text-gray-500 mt-0.5">
                            Detail #{idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 border-2 border-dashed border-gray-200 rounded-lg text-center text-xs text-gray-400 bg-gray-50/50">
                      Belum ada foto detail yang ditambahkan.
                    </div>
                  )}
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
                        field.isCreatable ? (
                          <CreatableSelect
                            id={field.name}
                            name={field.name}
                            value={
                              formData[field.name]
                                ? field.options.find(
                                    (opt) => opt.value === formData[field.name]
                                  ) || {
                                    value: formData[field.name],
                                    label: formData[field.name]
                                  }
                                : null
                            }
                            onChange={(selectedOption) =>
                              setFormData((prev) => ({
                                ...prev,
                                [field.name]: selectedOption ? selectedOption.value : ''
                              }))
                            }
                            onCreateOption={(inputValue) => {
                              const manualValue = inputValue.trim();
                              setFormData((prev) => ({
                                ...prev,
                                [field.name]: manualValue
                              }));
                            }}
                            options={field.options}
                            isClearable
                            isSearchable
                            createOptionPosition="first"
                            formatCreateLabel={(inputValue) =>
                              `Tambah HS Code: "${inputValue}"`
                            }
                            noOptionsMessage={({ inputValue }) =>
                              inputValue
                                ? 'Tidak ada HS Code, tekan Enter untuk tambah manual'
                                : 'Tidak ada opsi HS Code'
                            }
                            className="react-select-container"
                            classNamePrefix="react-select"
                            placeholder={`Select or type ${field.label.toLowerCase()}`}
                          />
                        ) : (
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
                        )
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
            onClick={() => navigate(getProductsListPath())}
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
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Package } from 'lucide-react';
import Select from 'react-select';
import { ordersAPI } from '../../utils/apiOrders';
import { productsAPI } from '../../utils/apiProducts';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const OrderForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);

  const [orderData, setOrderData] = useState({
    no_pi: '',
    buyer_name: '',
    buyer_address: '',
    currency: 'USD',
    // Manual invoice date (instead of using created_at)
    invoice_date: '',
    // Shipment info
    volume: '',
    port_loading: '',
    destination_port: '',
    // Custom columns (max 5)
    custom_columns: [],
    items: [
      {
        product_id: '',
        client_code: null,
        qty: 1,
        cbm_total: 0,
        fob_total_usd: 0,
        gross_weight_total: 0,
        net_weight_total: 0,
        total_gw_total: 0,
        custom_column_values: {}
      }
    ]
  });

  const loadProducts = useCallback(async () => {
    try {
      const response = await productsAPI.getProductsForSelect();
      setProducts(response.products || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  }, []);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const order = await ordersAPI.getOrder(id);
      setOrderData({
        no_pi: order.no_pi || '',
        buyer_name: order.buyer_name || '',
        buyer_address: order.buyer_address || '',
        currency: order.currency || 'USD',
        invoice_date: order.invoice_date ? order.invoice_date.substring(0, 10) : '',
        volume: order.volume || '',
        port_loading: order.port_loading || '',
        destination_port: order.destination_port || '',
        custom_columns: order.custom_columns ? (typeof order.custom_columns === 'string' ? JSON.parse(order.custom_columns) : order.custom_columns) : [],
        items: order.items ? order.items.map(item => ({
          ...item,
          custom_column_values: item.custom_column_values ? (typeof item.custom_column_values === 'string' ? JSON.parse(item.custom_column_values) : item.custom_column_values) : {}
        })) : []
      });
    } catch (error) {
      console.error('Error loading order:', error);
      alert('Error loading order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Transform products to react-select format
  const productOptions = useMemo(() => {
    return products.map(product => ({
      value: product.id.toString(),
      label: `${product.km_code} - ${product.description}`,
      product: product // Keep full product object for easy access
    }));
  }, [products]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    if (isEdit && id) {
      loadOrder();
    }
  }, [isEdit, id, loadOrder]);

  const handleOrderInfoChange = (e) => {
    const { name, value } = e.target;
    setOrderData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...orderData.items];
    
    // For product_id from react-select, extract the value string
    const fieldValue = field === 'product_id' && typeof value === 'object' && value !== null 
      ? value.value 
      : value;
    
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: fieldValue
    };

    // Auto-calculate when product or qty changes
    if (field === 'product_id' || field === 'qty') {
      const productId = field === 'product_id' ? fieldValue : updatedItems[index].product_id;
      const product = products.find(p => p.id === parseInt(productId));
      const qty = parseInt(updatedItems[index].qty) || 0;
      
      if (product && qty > 0 && productId) {
        // Calculate CBM:
        // 1. Prefer packing dimensions: W x D x H x QTY / 1,000,000
        // 2. Fallback to product.cbm * QTY if packing dimensions are not available
        let cbmTotal = 0;

        if (product.packing_width && product.packing_depth && product.packing_height) {
          const width = parseFloat(product.packing_width) || 0;
          const depth = parseFloat(product.packing_depth) || 0;
          const height = parseFloat(product.packing_height) || 0;
          if (width > 0 && depth > 0 && height > 0) {
            cbmTotal = (width * depth * height * qty) / 1000000;
          }
        }

        // If packing dimensions are not set or result is 0, use product.cbm as fallback
        if ((!cbmTotal || cbmTotal === 0) && product.cbm) {
          const productCbm = parseFloat(product.cbm) || 0;
          cbmTotal = productCbm * qty;
        }

        // Ensure cbm_total is always stored with 4 decimal places as string
        const cbmTotalFormatted = parseFloat(cbmTotal || 0).toFixed(4);

        updatedItems[index] = {
          ...updatedItems[index],
          product_id: productId,
          client_code: product.client_code || null,
          cbm_total: cbmTotalFormatted,
          fob_total_usd: (parseFloat(product.fob_price) * qty).toFixed(2),
          gross_weight_total: (parseFloat(product.gross_weight || 0) * qty).toFixed(2),
          net_weight_total: (parseFloat(product.net_weight || 0) * qty).toFixed(2),
          total_gw_total: (parseFloat(product.gross_weight || 0) * qty).toFixed(2), // Use gross_weight instead of total_gw
          total_nw_total: (parseFloat(product.net_weight || 0) * qty).toFixed(2), // Use net_weight instead of total_nw
          fob: product.fob_price || ''
        };
      } else if (field === 'product_id' && !productId) {
        // Reset calculations when product is cleared
        updatedItems[index] = {
          ...updatedItems[index],
          client_code: null,
          cbm_total: 0,
          fob_total_usd: 0,
          gross_weight_total: 0,
          net_weight_total: 0,
          total_gw_total: 0,
          total_nw_total: 0,
          fob: ''
        };
      }
    }

    setOrderData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const addItem = () => {
    setOrderData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          product_id: '',
          client_code: null,
          qty: 1,
          cbm_total: 0,
          fob_total_usd: 0,
          gross_weight_total: 0,
          net_weight_total: 0,
          total_gw_total: 0,
          total_nw_total: 0,
          fob: '',
          custom_column_values: prev.custom_columns.reduce((acc, col) => {
            acc[col] = '';
            return acc;
          }, {})
        }
      ]
    }));
  };

  const addCustomColumn = () => {
    if (orderData.custom_columns.length >= 5) {
      alert('Maksimal 5 kolom kustom');
      return;
    }
    setOrderData(prev => ({
      ...prev,
      custom_columns: [...prev.custom_columns, '']
    }));
  };

  const removeCustomColumn = (index) => {
    const columnName = orderData.custom_columns[index];
    setOrderData(prev => {
      const newColumns = prev.custom_columns.filter((_, i) => i !== index);
      const newItems = prev.items.map(item => {
        const newValues = { ...item.custom_column_values };
        delete newValues[columnName];
        return {
          ...item,
          custom_column_values: newValues
        };
      });
      return {
        ...prev,
        custom_columns: newColumns,
        items: newItems
      };
    });
  };

  const updateCustomColumnName = (index, value) => {
    const oldColumnName = orderData.custom_columns[index];
    setOrderData(prev => {
      const newColumns = [...prev.custom_columns];
      newColumns[index] = value;
      
      // Update custom_column_values untuk semua items
      const newItems = prev.items.map(item => {
        const newValues = { ...item.custom_column_values };
        if (oldColumnName && oldColumnName !== value) {
          // Pindahkan nilai dari nama kolom lama ke nama kolom baru
          if (newValues[oldColumnName] !== undefined) {
            newValues[value] = newValues[oldColumnName];
            delete newValues[oldColumnName];
          }
        } else if (!oldColumnName && value) {
          // Kolom baru, inisialisasi dengan string kosong
          newValues[value] = '';
        }
        return {
          ...item,
          custom_column_values: newValues
        };
      });
      
      return {
        ...prev,
        custom_columns: newColumns,
        items: newItems
      };
    });
  };

  const handleCustomColumnValueChange = (itemIndex, columnName, value) => {
    setOrderData(prev => {
      const newItems = [...prev.items];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        custom_column_values: {
          ...newItems[itemIndex].custom_column_values,
          [columnName]: value
        }
      };
      return {
        ...prev,
        items: newItems
      };
    });
  };

  // Prevent scroll wheel from changing number input values
  const handleNumberInputWheel = (e) => {
    // Prevent default scroll behavior that increments/decrements the number
    e.preventDefault();
    // Blur the input to allow page scrolling
    e.target.blur();
  };

  const removeItem = (index) => {
    if (orderData.items.length > 1) {
      setOrderData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const calculateTotals = () => {
    const totals = orderData.items.reduce((acc, item) => {
      return {
        totalCBM: acc.totalCBM + parseFloat(item.cbm_total || 0),
        totalUSD: acc.totalUSD + parseFloat(item.fob_total_usd || 0),
        totalGrossWeight: acc.totalGrossWeight + parseFloat(item.gross_weight_total || 0),
        totalNetWeight: acc.totalNetWeight + parseFloat(item.net_weight_total || 0),
        totalGW: acc.totalGW + parseFloat(item.total_gw_total || 0)
      };
    }, {
      totalCBM: 0,
      totalUSD: 0,
      totalGrossWeight: 0,
      totalNetWeight: 0,
      totalGW: 0
    });

    // Use currency from order level
    return {
      ...totals,
      currency: orderData.currency || 'USD'
    };
  };

  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'Rp': 'Rp',
      'IDR': 'Rp'
    };
    return symbols[currency] || currency || '$';
  };

  const formatCurrency = (amount, currency) => {
    const symbol = getCurrencySymbol(currency || 'USD');
    const curr = currency || 'USD';
    
    // Format berdasarkan currency
    if (curr === 'Rp' || curr === 'IDR') {
      return `${symbol} ${parseFloat(amount || 0).toFixed(2)}`;
    } else {
      return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
    }
  };

  const sanitizeOrderData = (data) => {
    // Helper to convert undefined to null (preserves 0, false, empty string)
    const nullIfUndefined = (value) => value === undefined ? null : value;
    // Helper to convert empty string to null for optional fields
    const nullIfEmpty = (value) => (value === undefined || value === '' || value === null) ? null : value;
    
    return {
      ...data,
      volume: nullIfEmpty(data.volume),
      port_loading: nullIfEmpty(data.port_loading),
      destination_port: nullIfEmpty(data.destination_port),
      custom_columns: data.custom_columns && data.custom_columns.length > 0 && data.custom_columns.some(col => col && col.trim()) 
        ? data.custom_columns 
        : null,
      items: data.items.map(item => ({
        product_id: item.product_id || null,
        client_code: nullIfEmpty(item.client_code),
        qty: item.qty || null,
        cbm_total: nullIfUndefined(item.cbm_total),
        fob_total_usd: nullIfUndefined(item.fob_total_usd),
        gross_weight_total: nullIfUndefined(item.gross_weight_total),
        net_weight_total: nullIfUndefined(item.net_weight_total),
        total_gw_total: nullIfUndefined(item.total_gw_total),
        total_nw_total: nullIfUndefined(item.total_nw_total),
        fob: nullIfEmpty(item.fob),
        custom_column_values: item.custom_column_values && Object.keys(item.custom_column_values).length > 0 
          ? item.custom_column_values 
          : null
      }))
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      // Sanitize data to ensure no undefined values
      const sanitizedData = sanitizeOrderData(orderData);
      
      if (isEdit) {
        await ordersAPI.updateOrder(id, sanitizedData);
      } else {
        await ordersAPI.createOrder(sanitizedData);
      }
      
      navigate('/app/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      alert(error.details || error.message || 'Error saving order');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading order..." />;
  }

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/app/orders')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="page-title">{isEdit ? 'Edit Order' : 'Create New Order'}</h1>
          <p className="page-subtitle">
            {isEdit ? 'Update order information' : 'Add a new furniture order'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Header */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="no_pi" className="block text-sm font-medium text-gray-700 mb-1">
                PI Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="no_pi"
                name="no_pi"
                value={orderData.no_pi}
                onChange={handleOrderInfoChange}
                required
                className="input-field"
                placeholder="Enter PI number"
              />
            </div>
            <div>
              <label htmlFor="buyer_name" className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="buyer_name"
                name="buyer_name"
                value={orderData.buyer_name}
                onChange={handleOrderInfoChange}
                required
                className="input-field"
                placeholder="Enter buyer name"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="buyer_address" className="block text-sm font-medium text-gray-700 mb-1">
                Buyer Address <span className="text-red-500">*</span>
              </label>
              <textarea
                id="buyer_address"
                name="buyer_address"
                value={orderData.buyer_address}
                onChange={handleOrderInfoChange}
                required
                rows={3}
                className="input-field"
                placeholder="Enter buyer address"
              />
            </div>
            <div>
              <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                Currency <span className="text-red-500">*</span>
              </label>
              <select
                id="currency"
                name="currency"
                value={orderData.currency}
                onChange={handleOrderInfoChange}
                required
                className="input-field"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="Rp">Rp (Rp)</option>
                <option value="IDR">IDR (Rp)</option>
              </select>
            </div>
            <div>
              <label htmlFor="invoice_date" className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="invoice_date"
                name="invoice_date"
                value={orderData.invoice_date}
                onChange={handleOrderInfoChange}
                required
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="volume" className="block text-sm font-medium text-gray-700 mb-1">
                Container Volume
              </label>
              <select
                id="volume"
                name="volume"
                value={orderData.volume}
                onChange={handleOrderInfoChange}
                className="input-field"
              >
                <option value="">Pilih volume kontainer</option>
                <option value="1 x 20&quot;">1 x 20&quot;</option>
                <option value="1 x 40&quot;">1 x 40&quot;</option>
                <option value="1 x 40&quot; H">1 x 40&quot; H</option>
              </select>
            </div>
            <div>
              <label htmlFor="port_loading" className="block text-sm font-medium text-gray-700 mb-1">
                Port of Loading
              </label>
              <input
                type="text"
                id="port_loading"
                name="port_loading"
                value={orderData.port_loading}
                onChange={handleOrderInfoChange}
                className="input-field"
                placeholder="Enter port of loading"
              />
            </div>
            <div>
              <label htmlFor="destination_port" className="block text-sm font-medium text-gray-700 mb-1">
                Destination Port
              </label>
              <input
                type="text"
                id="destination_port"
                name="destination_port"
                value={orderData.destination_port}
                onChange={handleOrderInfoChange}
                className="input-field"
                placeholder="Enter destination port"
              />
            </div>
          </div>
        </div>

        {/* Custom Columns */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Kolom Kustom</h2>
            <button
              type="button"
              onClick={addCustomColumn}
              disabled={orderData.custom_columns.length >= 5}
              className="btn-secondary"
            >
              <Plus className="w-4 h-4" />
              Tambah Kolom Baru
            </button>
          </div>
          {orderData.custom_columns.length > 0 && (
            <div className="space-y-2">
              {orderData.custom_columns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={column}
                    onChange={(e) => updateCustomColumnName(index, e.target.value)}
                    className="input-field flex-1"
                    placeholder="Masukan nama kolom"
                  />
                  <button
                    type="button"
                    onClick={() => removeCustomColumn(index)}
                    className="text-red-600 hover:text-red-800 p-2"
                    title="Hapus kolom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {orderData.custom_columns.length === 0 && (
            <p className="text-sm text-gray-500">Belum ada kolom kustom. Klik &quot;Tambah Kolom Baru&quot; untuk menambahkan.</p>
          )}
        </div>

        {/* Order Items */}
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Order Items</h2>
            <button
              type="button"
              onClick={addItem}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
          
          <div className="space-y-4">
            {orderData.items.map((item, index) => {
              const selectedProduct = products.find(p => p.id === parseInt(item.product_id));
              
              return (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-900">Item #{index + 1}</h3>
                    {orderData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={productOptions.find(option => option.value === item.product_id?.toString()) || null}
                        onChange={(selectedOption) => handleItemChange(index, 'product_id', selectedOption)}
                        options={productOptions}
                        placeholder="Select a product"
                        isClearable
                        isSearchable
                        className="react-select-container"
                        classNamePrefix="react-select"
                        noOptionsMessage={() => 'No products found'}
                        styles={{
                          control: (base, state) => ({
                            ...base,
                            minHeight: '42px',
                            borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
                            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : 'none',
                            '&:hover': {
                              borderColor: state.isFocused ? '#3b82f6' : '#9ca3af'
                            }
                          }),
                          placeholder: (base) => ({
                            ...base,
                            color: '#9ca3af'
                          })
                        }}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.qty}
                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                        onWheel={handleNumberInputWheel}
                        required
                        min="1"
                        className="input-field"
                        placeholder="Enter quantity"
                      />
                    </div>
                  </div>

                  {/* Product Details */}
                  {selectedProduct && (
                    <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {selectedProduct.picture_url ? (
                            <img 
                              src={`http://api-inventory.isavralabel.com/kayu-manis-properti${selectedProduct.picture_url}`}
                              alt={selectedProduct.description}
                              className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                            />
                          ) : (
                            <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Client Code:</span>
                            <div className="font-medium">
                              {selectedProduct.client_code || '-'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Size:</span>
                            <div className="font-medium">
                              {selectedProduct.size_width}×{selectedProduct.size_depth}×{selectedProduct.size_height}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">CBM:</span>
                            <div className="font-medium">{selectedProduct.cbm}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">FOB Price:</span>
                            <div className="font-medium">
                              {formatCurrency(selectedProduct.fob_price, orderData.currency || 'USD')} {orderData.currency || 'USD'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Color:</span>
                            <div className="font-medium">{selectedProduct.color}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Calculated Totals */}
                      <div className="mt-3 pt-3 border-t border-gray-200 grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Total CBM:</span>
                          <div className="font-medium text-primary-600">{item.cbm_total}</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Total FOB:</span>
                          <div className="font-medium text-primary-600">
                            {formatCurrency(item.fob_total_usd, orderData.currency || 'USD')} {orderData.currency || 'USD'}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Gross Weight:</span>
                          <div className="font-medium text-gray-900">{item.gross_weight_total} kg</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Net Weight:</span>
                          <div className="font-medium text-gray-900">{item.net_weight_total} kg</div>
                        </div>
                        <div>
                          <span className="text-gray-500">Total GW:</span>
                          <div className="font-medium text-gray-900">{item.total_gw_total} kg</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Custom Columns Input */}
                  {orderData.custom_columns.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Kolom Kustom</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {orderData.custom_columns.map((columnName, colIndex) => (
                          <div key={colIndex}>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              {columnName || `Kolom ${colIndex + 1}`}
                            </label>
                            <input
                              type="text"
                              value={item.custom_column_values?.[columnName] || ''}
                              onChange={(e) => handleCustomColumnValueChange(index, columnName, e.target.value)}
                              className="input-field"
                              placeholder={`Masukan ${columnName || 'nilai'}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="card bg-gradient-to-br from-primary-50 to-secondary-50 border-primary-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary-600">{totals.totalCBM.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total CBM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.totalUSD, totals.currency || 'USD')}
              </div>
              <div className="text-sm text-gray-600">Total {totals.currency || 'USD'}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totals.totalGrossWeight.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Gross Weight (kg)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totals.totalNetWeight.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Net Weight (kg)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{totals.totalGW.toFixed(2)}</div>
              <div className="text-sm text-gray-600">Total GW (kg)</div>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/app/orders')}
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
                {isEdit ? 'Update Order' : 'Create Order'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
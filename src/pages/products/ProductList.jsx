import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, Package, Folder, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { productsAPI } from '../../utils/apiProducts';
import { foldersAPI } from '../../utils/apiFolders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState('');
  const itemsPerPage = 10;
  const previousSearchTermRef = useRef(searchTerm);
  const searchTimeoutRef = useRef(null);

  const loadFolders = useCallback(async () => {
    try {
      const response = await foldersAPI.getFolders();
      setFolders(response.folders || []);
    } catch (error) {
      console.error('Error loading folders:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getProducts(currentPage, itemsPerPage, searchTerm, selectedFolderId);
      setProducts(response.products);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage, selectedFolderId]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await productsAPI.deleteProduct(id);
        loadProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
        
        let message = 'Error deleting product';

        // If backend sent a structured error object
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
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounce (1 second)
    searchTimeoutRef.current = setTimeout(() => {
      // Only update if search term actually changed
      const trimmedSearch = search.trim();
      const trimmedPrevious = (previousSearchTermRef.current || '').trim();
      
      if (trimmedSearch !== trimmedPrevious) {
        previousSearchTermRef.current = search;
        setSearchTerm(search);
        // Only reset to page 1 if search term actually changed
        setCurrentPage(1);
      }
      // If search term didn't change, do nothing (avoid unnecessary re-renders and page resets)
    }, 1000);
  }, []);

  const handleDownloadQRCode = async (productId) => {
    try {
      // Get base URL (frontend URL)
      const baseUrl = window.location.origin;
      const publicUrl = `${baseUrl}/public/product/${productId}`;
      
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(publicUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Create download link
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `qrcode-product-${productId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Error downloading QR code');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading products..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your furniture product catalog</p>
        </div>
        <Link to="/app/products/new" className="btn-primary w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar 
            onSearch={handleSearch}
            value={searchTerm}
            placeholder="Search products by KM Code, description..."
            className="flex-1"
          />
          <select
            value={selectedFolderId}
            onChange={(e) => {
              setSelectedFolderId(e.target.value);
              setCurrentPage(1);
            }}
            className="input-field sm:w-48"
          >
            <option value="">All Folders</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name} ({folder.product_count || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table - Desktop View */}
      <div className="hidden md:block card p-0 overflow-hidden">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first furniture product.</p>
            <Link to="/app/products/new" className="btn-primary max-w-fit mx-auto">
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size (W×D×H)
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Color
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CBM
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      FOB Price
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QR Code
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-12 w-12">
                            {product.picture_url ? (
                              <img 
                                src={`https://api-inventory.isavralabel.com/kayu-manis-properti${product.picture_url}`}
                                alt={product.description}
                                className="h-12 w-12 object-cover rounded-lg border border-gray-200"
                              />
                            ) : (
                              <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Package className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium text-gray-900">
                                {product.km_code}
                              </div>
                              {product.folder_name && (
                                <span 
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                                  style={{
                                    backgroundColor: product.folder_color ? `${product.folder_color}20` : '#E5E7EB',
                                    color: product.folder_color || '#6B7280'
                                  }}
                                >
                                  <Folder className="w-3 h-3 mr-1" />
                                  {product.folder_name}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-2">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.size_width}×{product.size_depth}×{product.size_height}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.color}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.cbm}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {product.fob_price}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDownloadQRCode(product.id)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                          title="Download QR Code"
                        >
                          <Download className="w-4 h-4 mr-1" />
                          QR Code
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link 
                          to={`/app/products/${product.id}/edit`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center p-1"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
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

      {/* Products Cards - Mobile View */}
      <div className="md:hidden space-y-4">
        {products.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500 mb-4 text-sm">Get started by adding your first furniture product.</p>
            <Link to="/app/products/new" className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        ) : (
          <>
            {products.map((product) => (
              <div key={product.id} className="card">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {product.picture_url ? (
                      <img 
                        src={`https://api-inventory.isavralabel.com/kayu-manis-properti${product.picture_url}`}
                        alt={product.description}
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {product.km_code}
                          </h3>
                          {product.folder_name && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{
                                backgroundColor: product.folder_color ? `${product.folder_color}20` : '#E5E7EB',
                                color: product.folder_color || '#6B7280'
                              }}
                            >
                              <Folder className="w-3 h-3 mr-1" />
                              {product.folder_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 ml-2">
                        <button
                          onClick={() => handleDownloadQRCode(product.id)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Download QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <Link 
                          to={`/app/products/${product.id}/edit`}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Size:</span>
                        <span className="ml-1 text-gray-900 font-medium">
                          {product.size_width}×{product.size_depth}×{product.size_height}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">CBM:</span>
                        <span className="ml-1 text-gray-900 font-medium">{product.cbm}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Color:</span>
                        <span className="ml-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.color}
                          </span>
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">FOB:</span>
                        <span className="ml-1 text-gray-900 font-medium">{product.fob_price}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
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

export default ProductList;
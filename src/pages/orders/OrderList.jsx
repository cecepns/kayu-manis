import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, FileText, ShoppingCart } from 'lucide-react';
import { ordersAPI } from '../../utils/apiOrders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  const previousSearchTermRef = useRef(searchTerm);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getOrders(currentPage, itemsPerPage, searchTerm);
      setOrders(response.orders);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await ordersAPI.deleteOrder(id);
        loadOrders();
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Error deleting order');
      }
    }
  };

  const handleSearch = useCallback((search) => {
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
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your furniture orders</p>
        </div>
        <Link to="/app/orders/new" className="btn-primary w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Order</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search orders by PI number, buyer name..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Orders Table - Desktop View */}
      <div className="hidden md:block card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner text="Loading orders..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-4">Get started by creating your first order.</p>
            <Link to="/app/orders/new" className="btn-primary max-w-fit mx-auto">
              <Plus className="w-4 h-4" />
              New Order
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PI Number
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer Info
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Items
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total CBM
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total USD
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {order.no_pi}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {order.buyer_name}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {order.buyer_address}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.item_count} items
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.total_cbm} CBM
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.total_usd}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.invoice_date
                          ? new Date(order.invoice_date).toLocaleDateString()
                          : new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link 
                          to={`/app/reports/${order.id}`}
                          className="text-green-600 hover:text-green-900 inline-flex items-center p-1"
                          title="View Report"
                        >
                          <FileText className="w-4 h-4" />
                        </Link>
                        <Link 
                          to={`/app/orders/${order.id}/edit`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center p-1"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(order.id)}
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

      {/* Orders Cards - Mobile View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="card py-12">
            <LoadingSpinner text="Loading orders..." />
          </div>
        ) : orders.length === 0 ? (
          <div className="card text-center py-12">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-4 text-sm">Get started by creating your first order.</p>
            <Link to="/app/orders/new" className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              New Order
            </Link>
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {order.no_pi}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {order.invoice_date
                        ? new Date(order.invoice_date).toLocaleDateString()
                        : new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Link 
                      to={`/app/reports/${order.id}`}
                      className="text-green-600 hover:text-green-900 p-1"
                      title="View Report"
                    >
                      <FileText className="w-4 h-4" />
                    </Link>
                    <Link 
                      to={`/app/orders/${order.id}/edit`}
                      className="text-primary-600 hover:text-primary-900 p-1"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(order.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Buyer:</span>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{order.buyer_name}</p>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{order.buyer_address}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                    <div>
                      <span className="text-xs text-gray-500 block">Items</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                        {order.item_count}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">CBM</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">{order.total_cbm}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Total</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">${order.total_usd}</span>
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

export default OrderList;
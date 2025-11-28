import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Eye } from 'lucide-react';
import { ordersAPI } from '../../utils/apiOrders';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const ReportList = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;

  useEffect(() => {
    loadOrders();
  }, [currentPage, searchTerm]);

  const loadOrders = async () => {
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
  };

  const handleSearch = (search) => {
    setSearchTerm(search);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingSpinner text="Loading reports..." />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">View and export order reports</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search reports by PI number, buyer name..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Reports Table - Desktop View */}
      <div className="hidden md:block card p-0 overflow-hidden">
        {orders.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500 mb-4">Reports will appear here once you create orders.</p>
            <Link to="/app/orders/new" className="btn-primary max-w-fit mx-auto">
              Create First Order
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
                      Buyer Information
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Summary
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
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0" />
                          <div className="text-sm font-medium text-gray-900">
                            {order.no_pi}
                          </div>
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
                      <td className="px-4 lg:px-6 py-4">
                        <div className="grid grid-cols-1 gap-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Items:</span>
                            <span className="font-medium">{order.item_count}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">CBM:</span>
                            <span className="font-medium">{order.total_cbm}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">USD:</span>
                            <span className="font-medium text-green-600">${order.total_usd}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.invoice_date
                          ? new Date(order.invoice_date).toLocaleDateString()
                          : new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link 
                          to={`/app/reports/${order.id}`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center p-1"
                          title="View Report"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
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

      {/* Reports Cards - Mobile View */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="card text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-500 mb-4 text-sm">Reports will appear here once you create orders.</p>
            <Link to="/app/orders/new" className="btn-primary w-full sm:w-auto">
              Create First Order
            </Link>
          </div>
        ) : (
          <>
            {orders.map((order) => (
              <div key={order.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0" />
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
                  </div>
                  <Link 
                    to={`/app/reports/${order.id}`}
                    className="text-primary-600 hover:text-primary-900 p-1 ml-2 flex-shrink-0"
                    title="View Report"
                  >
                    <Eye className="w-5 h-5" />
                  </Link>
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
                      <span className="text-sm font-medium text-gray-900 mt-1">{order.item_count}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">CBM</span>
                      <span className="text-sm font-medium text-gray-900 mt-1">{order.total_cbm}</span>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block">Total</span>
                      <span className="text-sm font-medium text-green-600 mt-1">${order.total_usd}</span>
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

export default ReportList;
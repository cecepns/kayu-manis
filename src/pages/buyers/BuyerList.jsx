import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, Users } from 'lucide-react';
import { buyersAPI } from '../../utils/apiBuyers';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import SearchBar from '../../components/common/SearchBar';

const BuyerList = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 10;
  const previousSearchTermRef = useRef(searchTerm);

  const loadBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await buyersAPI.getBuyers(currentPage, itemsPerPage, searchTerm);
      setBuyers(response.buyers);
      setTotalPages(response.totalPages);
      setTotalItems(response.totalItems);
    } catch (error) {
      console.error('Error loading buyers:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, itemsPerPage]);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this buyer?')) {
      try {
        await buyersAPI.deleteBuyer(id);
        loadBuyers();
      } catch (error) {
        console.error('Error deleting buyer:', error);
        
        let message = 'Error deleting buyer';

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buyers</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your buyer information</p>
        </div>
        <Link to="/app/buyers/new" className="btn-primary w-full sm:w-auto justify-center sm:justify-start">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Buyer</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchBar 
            onSearch={handleSearch}
            placeholder="Search buyers by name, address..."
            className="flex-1"
          />
        </div>
      </div>

      {/* Buyers Table - Desktop View */}
      <div className="hidden md:block card p-0 overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner text="Loading buyers..." />
          </div>
        ) : buyers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No buyers found</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first buyer.</p>
            <Link to="/app/buyers/new" className="btn-primary max-w-fit mx-auto">
              <Plus className="w-4 h-4" />
              Add Buyer
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer Name
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buyers.map((buyer) => (
                    <tr key={buyer.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {buyer.name}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-2">
                          {buyer.address}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(buyer.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Link 
                          to={`/app/buyers/${buyer.id}/edit`}
                          className="text-primary-600 hover:text-primary-900 inline-flex items-center p-1"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(buyer.id)}
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

      {/* Buyers Cards - Mobile View */}
      <div className="md:hidden space-y-4">
        {loading ? (
          <div className="card py-12">
            <LoadingSpinner text="Loading buyers..." />
          </div>
        ) : buyers.length === 0 ? (
          <div className="card text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No buyers found</h3>
            <p className="text-gray-500 mb-4 text-sm">Get started by adding your first buyer.</p>
            <Link to="/app/buyers/new" className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Add Buyer
            </Link>
          </div>
        ) : (
          <>
            {buyers.map((buyer) => (
              <div key={buyer.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {buyer.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(buyer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 ml-2">
                    <Link 
                      to={`/app/buyers/${buyer.id}/edit`}
                      className="text-primary-600 hover:text-primary-900 p-1"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button 
                      onClick={() => handleDelete(buyer.id)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Address:</span>
                  <p className="text-sm text-gray-900 mt-0.5 line-clamp-3">{buyer.address}</p>
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

export default BuyerList;




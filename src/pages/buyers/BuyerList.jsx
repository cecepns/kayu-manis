import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Plus, PencilIcon, Trash2, Users, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { buyersAPI } from '../../utils/apiBuyers';
import { isMenuEditor } from '../../utils/auth';
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
  const [selectedBuyerIds, setSelectedBuyerIds] = useState(new Set());
  const itemsPerPage = 1000; // Continuous 1-page display
  const previousSearchTermRef = useRef(searchTerm);
  const canEditBuyers = isMenuEditor('buyers');

  const loadBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await buyersAPI.getBuyers(currentPage, itemsPerPage, searchTerm);
      setBuyers(response.buyers || []);
      setTotalPages(response.totalPages || 1);
      setTotalItems(response.totalItems || 0);
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
    const trimmedSearch = search.trim();
    const trimmedPrevious = (previousSearchTermRef.current || '').trim();

    if (trimmedSearch !== trimmedPrevious) {
      previousSearchTermRef.current = search;
      setSearchTerm(search);
      setCurrentPage(1);
    }
  }, []);

  const toggleSelect = (id) => {
    setSelectedBuyerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBuyerIds.size === buyers.length) {
      setSelectedBuyerIds(new Set());
    } else {
      setSelectedBuyerIds(new Set(buyers.map((b) => b.id)));
    }
  };

  const handleExportBuyers = () => {
    const targetBuyers =
      selectedBuyerIds.size > 0
        ? buyers.filter((b) => selectedBuyerIds.has(b.id))
        : buyers;

    if (targetBuyers.length === 0) {
      alert('Tidak ada data buyer untuk diekspor.');
      return;
    }

    const dataToExport = targetBuyers.map((b, idx) => ({
      No: idx + 1,
      'Nama Buyer': b.name || '',
      Alamat: b.address || '',
      'Tanggal Ditambahkan': b.created_at
        ? new Date(b.created_at).toLocaleDateString('id-ID')
        : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Buyer');
    XLSX.writeFile(
      workbook,
      `data_buyer_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Buyers</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your buyer information</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportBuyers}
            disabled={buyers.length === 0}
            className="btn-secondary text-sm py-2 px-3 inline-flex items-center gap-1.5 disabled:opacity-50"
            title="Download data buyer ke file Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export (.xlsx)</span>
            {selectedBuyerIds.size > 0 && (
              <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-medium">
                {selectedBuyerIds.size}
              </span>
            )}
          </button>
          {canEditBuyers && (
            <Link
              to="/app/buyers/new"
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Buyer</span>
              <span className="sm:hidden">Add</span>
            </Link>
          )}
        </div>
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
            <p className="text-gray-500 mb-4">
              {canEditBuyers ? 'Get started by adding your first buyer.' : 'No buyers available.'}
            </p>
            {canEditBuyers && (
              <Link to="/app/buyers/new" className="btn-primary max-w-fit mx-auto">
                <Plus className="w-4 h-4" />
                Add Buyer
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="table-header">
                  <tr>
                    <th className="px-3 py-3 text-center w-10">
                      <input
                        type="checkbox"
                        checked={buyers.length > 0 && selectedBuyerIds.size === buyers.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        title="Pilih semua buyer"
                      />
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buyer Name
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    {canEditBuyers && (
                      <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {buyers.map((buyer) => (
                    <tr
                      key={buyer.id}
                      className={`hover:bg-gray-50 ${selectedBuyerIds.has(buyer.id) ? 'bg-primary-50/40' : ''}`}
                    >
                      <td className="px-3 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedBuyerIds.has(buyer.id)}
                          onChange={() => toggleSelect(buyer.id)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{buyer.name}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-500 line-clamp-2">{buyer.address}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(buyer.created_at).toLocaleDateString()}
                      </td>
                      {canEditBuyers && (
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
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 ? (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            ) : (
              <div className="p-3 text-center text-xs text-gray-500 border-t border-gray-100">
                Menampilkan semua {buyers.length} buyer
              </div>
            )}
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
            <p className="text-gray-500 mb-4">
              {canEditBuyers ? 'Get started by adding your first buyer.' : 'No buyers available.'}
            </p>
            {canEditBuyers && (
              <Link
                to="/app/buyers/new"
                className="btn-primary w-full sm:w-auto justify-center sm:justify-start"
              >
                <Plus className="w-4 h-4" />
                Add Buyer
              </Link>
            )}
          </div>
        ) : (
          buyers.map((buyer) => (
            <div
              key={buyer.id}
              className={`card ${selectedBuyerIds.has(buyer.id) ? 'ring-2 ring-primary-300' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedBuyerIds.has(buyer.id)}
                    onChange={() => toggleSelect(buyer.id)}
                    className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{buyer.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{buyer.address}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(buyer.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {canEditBuyers && (
                  <div className="flex items-center space-x-2 ml-4">
                    <Link
                      to={`/app/buyers/${buyer.id}/edit`}
                      className="text-primary-600 hover:text-primary-900 p-2"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(buyer.id)}
                      className="text-red-600 hover:text-red-900 p-2"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {!loading && buyers.length > 0 && totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
};

export default BuyerList;

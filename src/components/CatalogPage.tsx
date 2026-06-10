import { useState, useEffect } from 'react';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import type { Kcs_catalogitems } from '../generated/models/Kcs_catalogitemsModel';
import type { CatalogItem } from '../types';

interface CatalogPageProps {
  onOrderClick: (item: CatalogItem) => void;
}

const CategoryLabels: Record<number, string> = {
  615710000: 'Office Supplies',
  615710001: 'IT Equipment',
  615710002: 'Access & Security',
  615710003: 'Stationery',
  615710004: 'Other',
};

export default function CatalogPage({ onOrderClick }: CatalogPageProps) {
  const [items, setItems] = useState<Kcs_catalogitems[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');

  useEffect(() => {
    loadCatalogItems();
  }, []);

  const loadCatalogItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all active catalog items
      const result = await Kcs_catalogitemsService.getAll({
        filter: 'statecode eq 0', // Only active items
        orderBy: ['kcs_itemname asc'],
      });

      if (result.success && result.data) {
        setItems(result.data);
      } else {
        setError(result.error?.message || 'Failed to load catalog items');
      }
    } catch (err) {
      setError('An error occurred while loading catalog items');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = !searchTerm || 
      item.kcs_itemname?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === '' || 
      item.kcs_category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading catalog...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400">{error}</p>
        <button
          onClick={loadCatalogItems}
          className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Catalog</h2>
        
        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search by Item Name
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Categories</option>
                {Object.entries(CategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Item Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No items found matching your criteria.</p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.kcs_catalogitemid}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {item.kcs_itemname || 'Unnamed Item'}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded">
                    {item.kcs_category ? CategoryLabels[item.kcs_category] : 'Uncategorized'}
                  </span>
                  <span
                    className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                      item.kcs_available
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {item.kcs_available ? 'Available' : 'Unavailable'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => onOrderClick({
                  kcs_catalogitemid: item.kcs_catalogitemid,
                  kcs_itemname: item.kcs_itemname,
                  kcs_category: item.kcs_category,
                  kcs_available: item.kcs_available,
                })}
                disabled={!item.kcs_available}
                className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
                  item.kcs_available
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Order
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

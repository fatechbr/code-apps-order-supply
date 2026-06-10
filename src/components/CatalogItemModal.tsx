import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import type { Kcs_catalogitems } from '../generated/models/Kcs_catalogitemsModel';

const CategoryLabels: Record<number, string> = {
  615710000: 'Office Supplies',
  615710001: 'IT Equipment',
  615710002: 'Access & Security',
  615710003: 'Stationery',
  615710004: 'Other',
};

interface CatalogItemModalProps {
  item?: Kcs_catalogitems | null; // null = create mode
  onClose: () => void;
  onSuccess: () => void;
}

export default function CatalogItemModal({ item, onClose, onSuccess }: CatalogItemModalProps) {
  const isEdit = !!item;

  const [name, setName] = useState(item?.kcs_itemname ?? '');
  const [category, setCategory] = useState<number>(item?.kcs_category ?? 615710000);
  const [available, setAvailable] = useState(item?.kcs_available ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setName(item.kcs_itemname ?? '');
      setCategory(item.kcs_category ?? 615710000);
      setAvailable(item.kcs_available ?? true);
    }
  }, [item]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      if (isEdit && item) {
        const result = await Kcs_catalogitemsService.update(item.kcs_catalogitemid, {
          kcs_itemname: name,
          kcs_category: category as any,
          kcs_available: available,
        } as any);

        if (result.success) {
          onSuccess();
        } else {
          setError(result.error?.message ?? 'Failed to update item.');
        }
      } else {
        const result = await Kcs_catalogitemsService.create({
          kcs_itemname: name,
          kcs_category: category as any,
          kcs_available: available,
          statecode: 0 as any,
          statuscode: 1 as any,
        } as any);

        if (result.success) {
          onSuccess();
        } else {
          setError(result.error?.message ?? 'Failed to create item.');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Catalog Item' : 'New Catalog Item'}
          </h2>
          <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Item Name */}
            <div>
              <label htmlFor="ci-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                id="ci-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="e.g., Wireless Mouse"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="ci-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                id="ci-category"
                value={category}
                onChange={(e) => setCategory(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Object.entries(CategoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Available toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Available for ordering</label>
              <button
                type="button"
                onClick={() => setAvailable(!available)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  available ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    available ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

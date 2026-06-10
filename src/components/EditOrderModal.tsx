import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';
import type { Kcs_catalogitems } from '../generated/models/Kcs_catalogitemsModel';

interface EditOrderModalProps {
  order: Kcs_internalorders & { itemName?: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOrderModal({ order, onClose, onSuccess }: EditOrderModalProps) {
  const [selectedItemId, setSelectedItemId] = useState(order._kcs_item_value ?? '');
  const [quantity, setQuantity] = useState(order.kcs_quantity ?? 1);
  const [neededBy, setNeededBy] = useState(
    order.kcs_neededby ? order.kcs_neededby.substring(0, 10) : ''
  );
  const [deliveryLocation, setDeliveryLocation] = useState(order.kcs_deliverylocation ?? '');
  const [notes, setNotes] = useState(order.kcs_notes ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogItems, setCatalogItems] = useState<Kcs_catalogitems[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  useEffect(() => {
    Kcs_catalogitemsService.getAll({ filter: 'statecode eq 0 and kcs_available eq true' })
      .then((result) => {
        if (result.success && result.data) {
          setCatalogItems(result.data);
        }
      })
      .finally(() => setLoadingItems(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      const result = await Kcs_internalordersService.update(order.kcs_internalorderid!, {
        ...(selectedItemId ? { "kcs_Item@odata.bind": `/kcs_catalogitems(${selectedItemId})` } : {}),
        kcs_quantity: quantity,
        kcs_neededby: neededBy ? new Date(neededBy).toISOString() : undefined,
        kcs_deliverylocation: deliveryLocation,
        kcs_notes: notes,
      } as any);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error?.message || 'Failed to update order. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while updating the order.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Order</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isSubmitting}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form - Scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="px-6 py-4 overflow-y-auto flex-1">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3 max-h-32 overflow-y-auto">
                <p className="text-sm text-red-800 break-words">{error}</p>
              </div>
            )}

            {/* Catalog Item */}
            <div className="mb-4">
              <label htmlFor="edit-item" className="block text-sm font-medium text-gray-700 mb-1">
                Catalog Item <span className="text-red-500">*</span>
              </label>
              {loadingItems ? (
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-400 text-sm">Loading items...</div>
              ) : (
                <select
                  id="edit-item"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select an item...</option>
                  {catalogItems.map((item) => (
                    <option key={item.kcs_catalogitemid} value={item.kcs_catalogitemid}>
                      {item.kcs_itemname}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label htmlFor="edit-quantity" className="block text-sm font-medium text-gray-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Needed By */}
            <div className="mb-4">
              <label htmlFor="edit-neededBy" className="block text-sm font-medium text-gray-700 mb-1">
                Needed By
              </label>
              <input
                id="edit-neededBy"
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Delivery Location */}
            <div className="mb-4">
              <label htmlFor="edit-deliveryLocation" className="block text-sm font-medium text-gray-700 mb-1">
                Delivery Location
              </label>
              <input
                id="edit-deliveryLocation"
                type="text"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                maxLength={100}
                placeholder="e.g., Building A, Room 101"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label htmlFor="edit-notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={100}
                rows={3}
                placeholder="Additional information..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
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
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

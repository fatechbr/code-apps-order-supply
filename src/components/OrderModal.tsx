import { useState } from 'react';
import type { FormEvent } from 'react';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import type { CatalogItem } from '../types';

interface OrderModalProps {
  item: CatalogItem;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderModal({ item, onClose, onSuccess }: OrderModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [neededBy, setNeededBy] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setError(null);

      // Create the order
      // Dataverse will automatically set the owner to the calling user
      const result = await Kcs_internalordersService.create({
        "kcs_Item@odata.bind": `/kcs_catalogitems(${item.kcs_catalogitemid})`,
        kcs_quantity: quantity,
        kcs_orderdate: new Date().toISOString(),
        kcs_neededby: neededBy ? new Date(neededBy).toISOString() : undefined,
        kcs_deliverylocation: deliveryLocation,
        kcs_notes: notes,
        kcs_orderstatus: 615710000, // Submitted
        statecode: 0, // Active
        statuscode: 1,
      } as any);

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error?.message || 'Failed to create order. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while creating the order.');
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
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Order</h2>
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

          {/* Item Name (Read-only) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catalog Item
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
              {item.kcs_itemname}
            </div>
          </div>

          {/* Quantity */}
          <div className="mb-4">
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              id="quantity"
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
            <label htmlFor="neededBy" className="block text-sm font-medium text-gray-700 mb-1">
              Needed By
            </label>
            <input
              id="neededBy"
              type="date"
              value={neededBy}
              onChange={(e) => setNeededBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Delivery Location */}
          <div className="mb-4">
            <label htmlFor="deliveryLocation" className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Location
            </label>
            <input
              id="deliveryLocation"
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
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={100}
              rows={3}
              placeholder="Additional information..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          </div>

          {/* Actions - Fixed at bottom */}
          <div className="border-t border-gray-200 px-6 py-4 flex gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

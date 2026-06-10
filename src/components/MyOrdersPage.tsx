import { useState, useEffect } from 'react';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';
import { OrderStatusMap, OrderStatusColors } from '../types';
import ConfirmModal from './ConfirmModal';
import EditOrderModal from './EditOrderModal';

interface OrderWithItemName extends Kcs_internalorders {
  itemName?: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<OrderWithItemName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const [editingOrder, setEditingOrder] = useState<OrderWithItemName | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all active orders
      const result = await Kcs_internalordersService.getAll({
        filter: 'statecode eq 0',
        orderBy: ['kcs_orderdate desc'],
      });

      if (result.success && result.data) {
        // Get unique item IDs
        const itemIds = [...new Set(result.data
          .map(order => order._kcs_item_value)
          .filter(Boolean))];

        // Fetch catalog items to get names
        if (itemIds.length > 0) {
          const itemFilter = itemIds
            .map(id => `kcs_catalogitemid eq ${id}`)
            .join(' or ');
          
          const itemsResult = await Kcs_catalogitemsService.getAll({
            filter: itemFilter,
          });

          if (itemsResult.success && itemsResult.data) {
            // Create a map of item ID to item name
            const itemNameMap = new Map(
              itemsResult.data.map(item => [
                item.kcs_catalogitemid,
                item.kcs_itemname || 'Unknown Item'
              ])
            );

            // Enrich orders with item names
            const enrichedOrders = result.data.map(order => ({
              ...order,
              itemName: order._kcs_item_value 
                ? itemNameMap.get(order._kcs_item_value) 
                : undefined
            }));

            setOrders(enrichedOrders);
          } else {
            setOrders(result.data);
          }
        } else {
          setOrders(result.data);
        }
      } else {
        setError(result.error?.message || 'Failed to load orders');
      }
    } catch (err) {
      setError('An error occurred while loading orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = (orderId: string) => {
    setConfirmDeleteModal({ isOpen: true, orderId });
  };

  const confirmDeleteOrder = async () => {
    const orderId = confirmDeleteModal.orderId;
    if (!orderId) return;

    setConfirmDeleteModal({ isOpen: false, orderId: null });

    try {
      setDeletingOrderId(orderId);
      
      // Inactivate the order (following Cogna pattern - never delete, always inactivate)
      const result = await Kcs_internalordersService.update(orderId, {
        statecode: 1, // Inactive
        statuscode: 2, // Inactive
      });

      if (result.success) {
        // Remove from list
        setOrders(orders.filter(order => order.kcs_internalorderid !== orderId));
      } else {
        alert(result.error?.message || 'Failed to delete order');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while deleting the order');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const cancelDeleteOrder = () => {
    setConfirmDeleteModal({ isOpen: false, orderId: null });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (statusValue?: number) => {
    if (statusValue === undefined) return null;
    
    const status = OrderStatusMap[statusValue] || 'Submitted';
    const colorClasses = OrderStatusColors[status] || OrderStatusColors.Submitted;
    
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colorClasses}`}>
        {status === 'InProgress' ? 'In Progress' : status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadOrders}
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Orders</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">View and track your supply orders</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Order Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Needed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Assigned To
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.kcs_internalorderid} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {order.kcs_orderid || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {order.itemName || order.kcs_itemname || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {order.kcs_quantity || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(order.kcs_orderdate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {formatDate(order.kcs_neededby)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(order.kcs_orderstatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {order.owneridname || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingOrder(order)}
                        className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Edit order"
                        aria-label="Edit order"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.kcs_internalorderid)}
                        disabled={deletingOrderId === order.kcs_internalorderid}
                        className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete order"
                        aria-label="Delete order"
                      >
                        {deletingOrderId === order.kcs_internalorderid ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteOrder}
        onCancel={cancelDeleteOrder}
      />

      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onSuccess={() => {
            setEditingOrder(null);
            loadOrders();
          }}
        />
      )}
    </div>
  );
}

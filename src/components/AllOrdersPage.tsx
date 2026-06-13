import { useState, useEffect } from 'react';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import { SystemusersService } from '../generated/services/SystemusersService';
import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';
import { OrderStatusMap, OrderStatusColors } from '../types';
import type { ColumnDef } from '@tanstack/react-table';
import EditOrderModal from './EditOrderModal';
import ConfirmModal from './ConfirmModal';
import OrderTimelineModal from './OrderTimelineModal';
import DataTable from './DataTable';

interface OrderRow extends Kcs_internalorders {
  itemName?: string;
}

const STATUS_OPTIONS = Object.entries(OrderStatusMap).map(([value, label]) => ({
  value: Number(value),
  label: label === 'InProgress' ? 'In Progress' : label,
}));

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Users list for inline editing
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{
    orderId: string;
    field: 'status' | 'assignedTo';
  } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Modals
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<OrderRow | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    loadUsers();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);

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
            const enriched = result.data.map(order => ({
              ...order,
              itemName: order._kcs_item_value 
                ? itemNameMap.get(order._kcs_item_value) 
                : undefined
            }));

            setOrders(enriched);
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
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await SystemusersService.getAll({
        filter: 'isdisabled eq false',
        select: ['systemuserid', 'fullname'],
        top: 100,
      } as any);
      if (result.success && result.data) {
        setUsers(
          result.data
            .map((u: any) => ({ id: u.systemuserid, name: u.fullname ?? '' }))
            .filter((u: any) => u.name)
        );
      }
    } catch {
      // non-critical
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: number) => {
    setSaving(orderId);
    setEditingCell(null);
    try {
      const result = await Kcs_internalordersService.update(orderId, {
        kcs_orderstatus: newStatus as any,
      });
      if (result.success) {
        loadOrders();
      }
    } finally {
      setSaving(null);
    }
  };

  const handleAssignedToChange = async (orderId: string, newOwnerId: string) => {
    setSaving(orderId);
    setEditingCell(null);
    try {
      const result = await Kcs_internalordersService.update(orderId, {
        'ownerid@odata.bind': `/systemusers(${newOwnerId})`,
      } as any);
      if (result.success) {
        loadOrders();
      }
    } finally {
      setSaving(null);
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
      
      const result = await Kcs_internalordersService.update(orderId, {
        statecode: 1,
        statuscode: 2,
      });

      if (result.success) {
        loadOrders();
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

  // Define table columns
  const columns: ColumnDef<OrderRow>[] = [
    {
      accessorKey: 'kcs_orderid',
      header: 'Order ID',
      cell: ({ getValue }) => (
        <span className="font-medium text-gray-900 dark:text-white">
          {getValue<string>() || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'itemName',
      header: 'Item',
      cell: ({ row }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {row.original.itemName || row.original.kcs_itemname || '-'}
        </span>
      ),
    },
    {
      accessorKey: 'kcs_quantity',
      header: 'Qty',
      cell: ({ getValue }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {getValue<number>() || 0}
        </span>
      ),
    },
    {
      accessorKey: 'kcs_orderdate',
      header: 'Order Date',
      cell: ({ getValue }) => (
        <span className="text-gray-700 dark:text-gray-300">
          {formatDate(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: 'kcs_neededby',
      header: 'Needed By',
      cell: ({ getValue, row }) => {
        const neededBy = getValue<string>();
        const isOverdue = neededBy && new Date(neededBy) < new Date();
        return (
          <div className="flex items-center gap-2">
            <span className="text-gray-700 dark:text-gray-300">
              {formatDate(neededBy)}
            </span>
            {isOverdue && row.original.kcs_orderstatus !== 615710004 && (
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">⚠️ Overdue</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'kcs_orderstatus',
      header: 'Status',
      cell: ({ getValue, row }) => {
        const orderId = row.original.kcs_internalorderid;
        const currentStatus = getValue<number>();
        
        if (editingCell?.orderId === orderId && editingCell.field === 'status') {
          return (
            <select
              autoFocus
              value={currentStatus}
              onChange={(e) => handleStatusChange(orderId, Number(e.target.value))}
              onBlur={() => setEditingCell(null)}
              className="text-xs px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        return (
          <button
            onClick={() => setEditingCell({ orderId, field: 'status' })}
            disabled={saving === orderId}
            className="text-left hover:opacity-75 transition-opacity disabled:cursor-wait"
          >
            {saving === orderId ? '...' : getStatusBadge(currentStatus)}
          </button>
        );
      },
    },
    {
      accessorKey: 'owneridname',
      header: 'Assigned To',
      cell: ({ getValue, row }) => {
        const orderId = row.original.kcs_internalorderid;
        const currentOwner = getValue<string>();
        
        if (editingCell?.orderId === orderId && editingCell.field === 'assignedTo') {
          return (
            <select
              autoFocus
              value={(row.original as any)._ownerid_value || ''}
              onChange={(e) => handleAssignedToChange(orderId, e.target.value)}
              onBlur={() => setEditingCell(null)}
              className="text-xs px-2 py-1 border border-blue-500 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          );
        }

        return (
          <button
            onClick={() => setEditingCell({ orderId, field: 'assignedTo' })}
            disabled={saving === orderId}
            className="text-left text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors disabled:cursor-wait"
          >
            {saving === orderId ? '...' : (currentOwner || 'Unassigned')}
          </button>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="text-right block">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setTimelineOrder(row.original)}
            className="inline-flex items-center justify-center p-2 text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-colors"
            title="View timeline"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={() => setEditingOrder(row.original)}
            className="inline-flex items-center justify-center p-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
            title="Edit order"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteOrder(row.original.kcs_internalorderid)}
            disabled={deletingOrderId === row.original.kcs_internalorderid}
            className="inline-flex items-center justify-center p-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete order"
          >
            {deletingOrderId === row.original.kcs_internalorderid ? (
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
      ),
      enableSorting: false,
    },
  ];

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400">{error}</p>
        <button
          onClick={loadOrders}
          className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Orders</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage all orders system-wide · {orders.length} total orders
        </p>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        isLoading={isLoading}
        showGlobalFilter
        showPagination
        pageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyMessage="No orders found."
      />

      {/* Modals */}
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

      {timelineOrder && (
        <OrderTimelineModal
          order={timelineOrder}
          onClose={() => setTimelineOrder(null)}
        />
      )}
    </div>
  );
}

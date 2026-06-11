import { useState, useEffect, useCallback } from 'react';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import { SystemusersService } from '../generated/services/SystemusersService';
import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';
import { OrderStatusMap, OrderStatusColors } from '../types';
import type { OrderStatus } from '../types';
import EditOrderModal from './EditOrderModal';
import ConfirmModal from './ConfirmModal';
import OrderTimelineModal from './OrderTimelineModal';

interface OrderRow extends Kcs_internalorders {
  itemName?: string;
}

const STATUS_OPTIONS = Object.entries(OrderStatusMap).map(([value, label]) => ({
  value: Number(value),
  label: label === 'InProgress' ? 'In Progress' : label,
}));

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Users list for "Assigned To" filter
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Inline editing
  const [editingCell, setEditingCell] = useState<{
    orderId: string;
    field: 'status' | 'assignedTo';
  } | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Edit and delete modals
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [timelineOrder, setTimelineOrder] = useState<OrderRow | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
  }>({ isOpen: false, orderId: null });
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // Bulk actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>('');
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    loadOrders();
    loadUsers();
  }, []);

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

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await Kcs_internalordersService.getAll({
        filter: 'statecode eq 0',
        orderBy: ['kcs_orderdate desc'],
      });

      if (result.success && result.data) {
        const itemIds = [...new Set(result.data.map((o) => o._kcs_item_value).filter(Boolean))];
        let itemNameMap = new Map<string, string>();

        if (itemIds.length > 0) {
          const itemsResult = await Kcs_catalogitemsService.getAll({
            filter: itemIds.map((id) => `kcs_catalogitemid eq ${id}`).join(' or '),
          });
          if (itemsResult.success && itemsResult.data) {
            itemNameMap = new Map(
              itemsResult.data.map((item) => [item.kcs_catalogitemid, item.kcs_itemname ?? 'Unknown'])
            );
          }
        }

        setOrders(
          result.data.map((order) => ({
            ...order,
            itemName: order._kcs_item_value ? itemNameMap.get(order._kcs_item_value) : undefined,
          }))
        );
      } else {
        setError(result.error?.message ?? 'Failed to load orders');
      }
    } catch (err) {
      setError('An error occurred while loading orders');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: number) => {
    setSaving(orderId);
    setEditingCell(null);
    try {
      const result = await Kcs_internalordersService.update(orderId, {
        kcs_orderstatus: newStatus as any,
      });
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) => (o.kcs_internalorderid === orderId ? { ...o, kcs_orderstatus: newStatus as any } : o))
        );
      }
    } finally {
      setSaving(null);
    }
  };

  const handleAssignedToChange = async (orderId: string, newOwnerId: string, newOwnerName: string) => {
    setSaving(orderId);
    setEditingCell(null);
    try {
      const result = await Kcs_internalordersService.update(orderId, {
        'ownerid@odata.bind': `/systemusers(${newOwnerId})`,
      } as any);
      if (result.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.kcs_internalorderid === orderId ? { ...o, owneridname: newOwnerName } : o
          )
        );
      }
    } finally {
      setSaving(null);
    }
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '-');

  const getOwnerName = (order: OrderRow) => {
    return order.owneridname || '-';
  };

  const handleDeleteOrder = (orderId: string) => {
    setConfirmDeleteModal({ isOpen: true, orderId });
  };

  const confirmDeleteOrder = async () => {
    const orderId = confirmDeleteModal.orderId;
    if (!orderId) return;

    setConfirmDeleteModal({ isOpen: false, orderId: null });
    setDeletingOrderId(orderId);

    try {
      // Inactivate the order (following Cogna pattern - never delete, always inactivate)
      const result = await Kcs_internalordersService.update(orderId, {
        statecode: 1 as any, // Inactive
        statuscode: 2 as any,
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

  // Bulk actions handlers
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAllOrders = (orderIds: string[]) => {
    setSelectedOrderIds(new Set(orderIds));
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
    setBulkStatus('');
  };

  const applyBulkStatusChange = async () => {
    if (!bulkStatus || selectedOrderIds.size === 0) return;

    setBulkUpdating(true);
    try {
      const updatePromises = Array.from(selectedOrderIds).map(orderId =>
        Kcs_internalordersService.update(orderId, {
          kcs_orderstatus: Number(bulkStatus) as any,
        })
      );

      const results = await Promise.all(updatePromises);
      const failedCount = results.filter(r => !r.success).length;

      if (failedCount > 0) {
        alert(`${failedCount} order(s) failed to update. Please try again.`);
      }

      loadOrders();
      clearSelection();
    } catch (err) {
      console.error(err);
      alert('An error occurred while updating orders');
    } finally {
      setBulkUpdating(false);
    }
  };

  const getStatusBadge = (statusValue?: number) => {
    if (statusValue === undefined) return null;
    const status = OrderStatusMap[statusValue] ?? 'Submitted';
    const colorClasses = OrderStatusColors[status as OrderStatus] ?? OrderStatusColors.Submitted;
    return (
      <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${colorClasses}`}>
        {status === 'InProgress' ? 'In Progress' : status}
      </span>
    );
  };

  // Apply filters client-side
  const filtered = orders.filter((o) => {
    if (filterStatus && String(o.kcs_orderstatus) !== filterStatus) return false;
    if (filterAssignedTo) {
      const name = (o.owneridname ?? '').toLowerCase();
      if (!name.includes(filterAssignedTo.toLowerCase())) return false;
    }
    if (filterDateFrom && o.kcs_orderdate && o.kcs_orderdate < filterDateFrom) return false;
    if (filterDateTo && o.kcs_orderdate && o.kcs_orderdate > filterDateTo + 'T23:59:59') return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400">{error}</p>
        <button onClick={loadOrders} className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">All Orders</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {filtered.length} order{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned To</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={filterAssignedTo}
              onChange={(e) => setFilterAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date From */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {(filterStatus || filterAssignedTo || filterDateFrom || filterDateTo) && (
          <button
            onClick={() => { setFilterStatus(''); setFilterAssignedTo(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {selectedOrderIds.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Change Status:
              </label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={bulkUpdating}
              >
                <option value="">Select status...</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                onClick={applyBulkStatusChange}
                disabled={!bulkStatus || bulkUpdating}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {bulkUpdating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Apply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <p className="text-gray-500 dark:text-gray-400">No orders match the current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  {/* Checkbox column */}
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedOrderIds.size === filtered.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllOrders(filtered.map(o => o.kcs_internalorderid));
                        } else {
                          clearSelection();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                  </th>
                  {['Order ID', 'Item', 'Qty', 'Order Date', 'Needed By', 'Status', 'Ordered By', 'Assigned To', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((order) => (
                  <tr key={order.kcs_internalorderid} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.has(order.kcs_internalorderid)}
                        onChange={() => toggleSelectOrder(order.kcs_internalorderid)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                      {order.kcs_orderid ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {order.itemName ?? order.kcs_itemname ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {order.kcs_quantity ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(order.kcs_orderdate)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(order.kcs_neededby)}
                    </td>

                    {/* Status — inline editable */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {saving === order.kcs_internalorderid ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      ) : editingCell?.orderId === order.kcs_internalorderid && editingCell.field === 'status' ? (
                        <select
                          autoFocus
                          defaultValue={order.kcs_orderstatus ?? ''}
                          onBlur={() => setEditingCell(null)}
                          onChange={(e) => handleStatusChange(order.kcs_internalorderid, Number(e.target.value))}
                          className="text-xs border border-blue-400 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCell({ orderId: order.kcs_internalorderid, field: 'status' })}
                          className="group flex items-center gap-1"
                          title="Click to edit status"
                        >
                          {getStatusBadge(order.kcs_orderstatus)}
                          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </td>

                    {/* Ordered By (read-only) */}
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                      {order.createdbyname ?? order.owneridname ?? '-'}
                    </td>

                    {/* Assigned To — inline editable */}
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {editingCell?.orderId === order.kcs_internalorderid && editingCell.field === 'assignedTo' ? (
                        <select
                          autoFocus
                          defaultValue=""
                          onBlur={() => setEditingCell(null)}
                          onChange={(e) => {
                            const selected = users.find((u) => u.id === e.target.value);
                            if (selected) handleAssignedToChange(order.kcs_internalorderid, selected.id, selected.name);
                          }}
                          className="text-xs border border-blue-400 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none min-w-[150px]"
                        >
                          <option value="" disabled>Select user...</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCell({ orderId: order.kcs_internalorderid, field: 'assignedTo' })}
                          className="group flex items-center gap-1 text-gray-700 dark:text-gray-300"
                          title="Click to reassign"
                        >
                          <span>{getOwnerName(order)}</span>
                          <svg className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setTimelineOrder(order)}
                          className="inline-flex items-center justify-center p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-md transition-colors"
                          title="View timeline"
                          aria-label="View timeline"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="inline-flex items-center justify-center p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-md transition-colors"
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
                          className="inline-flex items-center justify-center p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Edit Order Modal */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmDeleteModal.isOpen}
        title="Delete Order"
        message="Are you sure you want to delete this order? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteOrder}
        onCancel={cancelDeleteOrder}
      />

      {/* Timeline Modal */}
      {timelineOrder && (
        <OrderTimelineModal
          order={timelineOrder}
          onClose={() => setTimelineOrder(null)}
        />
      )}
    </div>
  );
}

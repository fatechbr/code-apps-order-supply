import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';
import { OrderStatusColors } from '../types';
import EditOrderModal from './EditOrderModal';
import type { OrderStatus } from '../types';

interface OrderCard extends Kcs_internalorders {
  itemName?: string;
}

type StatusColumn = 'Submitted' | 'Approved' | 'InProgress' | 'Ordered' | 'Delivered' | 'Denied';

const STATUS_COLUMNS: StatusColumn[] = ['Submitted', 'Approved', 'InProgress', 'Ordered', 'Delivered', 'Denied'];

const STATUS_VALUE_MAP: Record<StatusColumn, number> = {
  Submitted: 615710000,
  Approved: 615710001,
  InProgress: 615710002,
  Ordered: 615710003,
  Delivered: 615710004,
  Denied: 615710005,
};

const STATUS_LABELS: Record<StatusColumn, string> = {
  Submitted: 'Submitted',
  Approved: 'Approved',
  InProgress: 'In Progress',
  Ordered: 'Ordered',
  Delivered: 'Delivered',
  Denied: 'Denied',
};

const STATUS_ICONS: Record<StatusColumn, string> = {
  Submitted: '📋',
  Approved: '✅',
  InProgress: '🔄',
  Ordered: '📦',
  Delivered: '🎉',
  Denied: '❌',
};

export default function KanbanPage() {
  const [orders, setOrders] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderCard | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
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
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as StatusColumn;
    const newStatusValue = STATUS_VALUE_MAP[newStatus];

    const order = orders.find((o) => o.kcs_internalorderid === orderId);
    if (!order || order.kcs_orderstatus === newStatusValue) return;

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) => (o.kcs_internalorderid === orderId ? { ...o, kcs_orderstatus: newStatusValue as any } : o))
    );

    try {
      const result = await Kcs_internalordersService.update(orderId, {
        kcs_orderstatus: newStatusValue as any,
      });
      if (!result.success) {
        // Rollback on failure
        setOrders((prev) =>
          prev.map((o) => (o.kcs_internalorderid === orderId ? { ...o, kcs_orderstatus: order.kcs_orderstatus } : o))
        );
        console.error('Failed to update order status');
      }
    } catch (err) {
      // Rollback on error
      setOrders((prev) =>
        prev.map((o) => (o.kcs_internalorderid === orderId ? { ...o, kcs_orderstatus: order.kcs_orderstatus } : o))
      );
      console.error(err);
    }
  };

  const getOrdersByStatus = (status: StatusColumn): OrderCard[] => {
    const statusValue = STATUS_VALUE_MAP[status];
    return orders.filter((o) => o.kcs_orderstatus === statusValue);
  };

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString() : '-');

  const renderCard = (order: OrderCard, showEditIcon: boolean = true) => {
    const isOverdue = order.kcs_neededby && new Date(order.kcs_neededby) < new Date();
    return (
      <div
        key={order.kcs_internalorderid}
        className="bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
      >
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {order.kcs_orderid ?? 'N/A'}
          </span>
          <div className="flex items-center gap-1">
            {showEditIcon && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingOrder(order);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Edit order"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {isOverdue && (
              <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded font-medium">
                Overdue
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1 font-medium">
          {order.itemName ?? 'Unknown Item'}
        </p>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
          <p>Qty: {order.kcs_quantity ?? 0}</p>
          <p>Needed: {formatDate(order.kcs_neededby)}</p>
          {order.owneridname && <p className="truncate">By: {order.owneridname}</p>}
        </div>
      </div>
    );
  };

  const renderColumn = (status: StatusColumn) => {
    const columnOrders = getOrdersByStatus(status);
    const colorClasses = OrderStatusColors[status as OrderStatus] ?? 'bg-gray-100 dark:bg-gray-700';

    return (
      <div key={status} className="flex-shrink-0 w-72">
        <div className={`rounded-lg ${colorClasses} p-3 mb-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{STATUS_ICONS[status]}</span>
              <h3 className="font-semibold text-gray-900 dark:text-white">{STATUS_LABELS[status]}</h3>
            </div>
            <span className="text-sm font-bold text-gray-700 dark:text-white bg-white/90 dark:bg-gray-900/80 px-2.5 py-1 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">
              {columnOrders.length}
            </span>
          </div>
        </div>
        <div
          id={status}
          className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 min-h-[500px] border-2 border-dashed border-gray-200 dark:border-gray-700"
        >
          {columnOrders.map((order) => (
            <div
              key={order.kcs_internalorderid}
              id={order.kcs_internalorderid}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', order.kcs_internalorderid);
              }}
            >
              {renderCard(order)}
            </div>
          ))}
          {columnOrders.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 text-sm mt-8">No orders</p>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading kanban board...</p>
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

  const activeOrder = activeId ? orders.find((o) => o.kcs_internalorderid === activeId) : null;

  return (
    <div className="max-w-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Kanban Board</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {orders.length} active order{orders.length !== 1 ? 's' : ''} · Drag cards to update status
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

      {/* Kanban Columns */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {STATUS_COLUMNS.map((status) => (
            <div
              key={status}
              id={status}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData('text/plain');
                handleDragEnd({
                  active: { id: orderId, data: { current: undefined } },
                  over: { id: status, data: { current: undefined } },
                } as DragEndEvent);
              }}
            >
              {renderColumn(status)}
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeOrder ? (
            <div className="rotate-3 opacity-80">
              {renderCard(activeOrder, false)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
    </div>
  );
}

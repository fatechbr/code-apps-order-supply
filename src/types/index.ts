export interface CatalogItem {
  kcs_catalogitemid: string;
  kcs_itemname?: string;
  kcs_category?: number;
  kcs_categoryname?: string;
  kcs_available?: boolean;
}

export interface Order {
  kcs_internalorderid: string;
  kcs_orderid?: string;
  kcs_itemname?: string;
  kcs_quantity?: number;
  kcs_orderdate?: string;
  kcs_neededby?: string;
  kcs_deliverylocation?: string;
  kcs_notes?: string;
  kcs_orderstatus?: number;
  kcs_orderstatusname?: string;
  owneridname?: string;
  createdbyname?: string;
}

export type OrderStatus = 'Submitted' | 'Approved' | 'InProgress' | 'Ordered' | 'Delivered' | 'Denied';

export const OrderStatusMap: Record<number, OrderStatus> = {
  615710000: 'Submitted',
  615710001: 'Approved',
  615710002: 'InProgress',
  615710003: 'Ordered',
  615710004: 'Delivered',
  615710005: 'Denied',
};

export const OrderStatusColors: Record<OrderStatus, string> = {
  Submitted: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100',
  Approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  InProgress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
  Ordered: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  Delivered: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
  Denied: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
};

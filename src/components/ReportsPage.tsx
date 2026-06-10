import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
  LineChart, Line,
} from 'recharts';
import { Kcs_internalordersService } from '../generated/services/Kcs_internalordersService';
import { Kcs_catalogitemsService } from '../generated/services/Kcs_catalogitemsService';
import { OrderStatusMap } from '../types';

const STATUS_COLORS: Record<string, string> = {
  Submitted: '#6b7280',
  Approved: '#3b82f6',
  InProgress: '#f59e0b',
  Ordered: '#8b5cf6',
  Delivered: '#10b981',
  Denied: '#ef4444',
};

const CATEGORY_LABELS: Record<number, string> = {
  615710000: 'Office Supplies',
  615710001: 'IT Equipment',
  615710002: 'Access & Security',
  615710003: 'Stationery',
  615710004: 'Other',
};

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusData, setStatusData] = useState<{ name: string; count: number; color: string }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number }[]>([]);
  const [timelineData, setTimelineData] = useState<{ date: string; orders: number }[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await Kcs_internalordersService.getAll({
        filter: 'statecode eq 0',
        orderBy: ['kcs_orderdate desc'],
      });

      if (!result.success || !result.data) {
        setError(result.error?.message ?? 'Failed to load data');
        return;
      }

      const orders = result.data;
      setTotalOrders(orders.length);

      // --- 1. Orders by Status ---
      const statusCount: Record<string, number> = {};
      for (const order of orders) {
        const label = OrderStatusMap[order.kcs_orderstatus as unknown as number] ?? 'Submitted';
        statusCount[label] = (statusCount[label] ?? 0) + 1;
      }
      setStatusData(
        Object.entries(statusCount).map(([name, count]) => ({
          name: name === 'InProgress' ? 'In Progress' : name,
          count,
          color: STATUS_COLORS[name] ?? '#6b7280',
        }))
      );

      // --- 2. Orders by Category (via catalog items) ---
      const itemIds = [...new Set(orders.map((o) => o._kcs_item_value).filter(Boolean))];
      const itemCategoryMap = new Map<string, number>();
      if (itemIds.length > 0) {
        const itemsResult = await Kcs_catalogitemsService.getAll({
          filter: itemIds.map((id) => `kcs_catalogitemid eq ${id}`).join(' or '),
        });
        if (itemsResult.success && itemsResult.data) {
          for (const item of itemsResult.data) {
            if (item.kcs_catalogitemid && item.kcs_category !== undefined) {
              itemCategoryMap.set(item.kcs_catalogitemid, item.kcs_category as unknown as number);
            }
          }
        }
      }
      const categoryCount: Record<string, number> = {};
      for (const order of orders) {
        const catCode = order._kcs_item_value ? itemCategoryMap.get(order._kcs_item_value) : undefined;
        const label = catCode !== undefined ? (CATEGORY_LABELS[catCode] ?? 'Other') : 'Unknown';
        categoryCount[label] = (categoryCount[label] ?? 0) + 1;
      }
      setCategoryData(Object.entries(categoryCount).map(([name, value]) => ({ name, value })));

      // --- 3. Orders over last 30 days ---
      const now = new Date();
      const dayMap: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().substring(0, 10);
        dayMap[key] = 0;
      }
      for (const order of orders) {
        if (order.kcs_orderdate) {
          const key = order.kcs_orderdate.substring(0, 10);
          if (key in dayMap) dayMap[key]++;
        }
      }
      setTimelineData(
        Object.entries(dayMap).map(([date, orders]) => ({
          date: date.substring(5), // MM-DD
          orders,
        }))
      );

      // --- 4. Top 5 most ordered items ---
      const itemNameMap = new Map<string, string>();
      if (itemIds.length > 0) {
        const itemsResult = await Kcs_catalogitemsService.getAll({
          filter: itemIds.map((id) => `kcs_catalogitemid eq ${id}`).join(' or '),
        });
        if (itemsResult.success && itemsResult.data) {
          for (const item of itemsResult.data) {
            if (item.kcs_catalogitemid) {
              itemNameMap.set(item.kcs_catalogitemid, item.kcs_itemname ?? 'Unknown');
            }
          }
        }
      }
      const itemCount: Record<string, { name: string; count: number }> = {};
      for (const order of orders) {
        if (order._kcs_item_value) {
          const id = order._kcs_item_value;
          if (!itemCount[id]) {
            itemCount[id] = { name: itemNameMap.get(id) ?? 'Unknown', count: 0 };
          }
          itemCount[id].count += order.kcs_quantity ?? 1;
        }
      }
      setTopItems(
        Object.values(itemCount)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      );
    } catch (err) {
      setError('An error occurred while loading reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-400">{error}</p>
        <button onClick={loadReports} className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium">Try again</button>
      </div>
    );
  }

  const card = (title: string, children: React.ReactNode) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      {children}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{totalOrders} active orders in total</p>
        </div>
        <button
          onClick={loadReports}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Bar chart — Orders by Status */}
        {card('Orders by Status', (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={statusData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {statusData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ))}

        {/* 2. Pie chart — Orders by Category */}
        {card('Orders by Category', (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={categoryData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Legend iconType="circle" iconSize={10} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ))}

        {/* 3. Line chart — Orders over last 30 days */}
        {card('Orders Over Last 30 Days', (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={timelineData} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ))}

        {/* 4. Top 5 most ordered items */}
        {card('Top 5 Most Ordered Items', (
          topItems.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data available.</p>
          ) : (
            <div className="space-y-3">
              {topItems.map((item, index) => {
                const max = topItems[0].count;
                const pct = Math.round((item.count / max) * 100);
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[70%]">{item.name}</span>
                      <span className="text-gray-500 dark:text-gray-400 ml-2">{item.count} units</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

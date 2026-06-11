import type { Kcs_internalorders } from '../generated/models/Kcs_internalordersModel';

interface OrderTimelineProps {
  order: Kcs_internalorders;
}

type TimelineStatus = {
  value: number;
  label: string;
  icon: string;
  key: 'submitted' | 'approved' | 'inprogress' | 'ordered' | 'delivered' | 'denied';
};

const TIMELINE_STATUSES: TimelineStatus[] = [
  { value: 615710000, label: 'Submitted', icon: '📋', key: 'submitted' },
  { value: 615710001, label: 'Approved', icon: '✅', key: 'approved' },
  { value: 615710002, label: 'In Progress', icon: '🔄', key: 'inprogress' },
  { value: 615710003, label: 'Ordered', icon: '📦', key: 'ordered' },
  { value: 615710004, label: 'Delivered', icon: '🎉', key: 'delivered' },
];

const DENIED_STATUS: TimelineStatus = { value: 615710005, label: 'Denied', icon: '❌', key: 'denied' };

export default function OrderTimeline({ order }: OrderTimelineProps) {
  const currentStatus = order.kcs_orderstatus;

  // If denied, show denied branch
  const isDenied = currentStatus === 615710005;
  const statuses = isDenied 
    ? [TIMELINE_STATUSES[0], DENIED_STATUS] // Submitted → Denied
    : TIMELINE_STATUSES;

  const getCurrentIndex = () => {
    return statuses.findIndex((s) => s.value === currentStatus);
  };

  const currentIndex = getCurrentIndex();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusState = (index: number): 'completed' | 'current' | 'pending' => {
    if (index < currentIndex) return 'completed';
    if (index === currentIndex) return 'current';
    return 'pending';
  };

  const renderStatusDot = (state: 'completed' | 'current' | 'pending', icon: string) => {
    if (state === 'completed') {
      return (
        <div className="w-10 h-10 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center text-white shadow-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      );
    }

    if (state === 'current') {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center shadow-lg animate-pulse ring-4 ring-blue-200 dark:ring-blue-900">
          <span className="text-xl">{icon}</span>
        </div>
      );
    }

    // pending
    return (
      <div className="w-10 h-10 rounded-full border-4 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 flex items-center justify-center">
        <span className="text-xl opacity-40">{icon}</span>
      </div>
    );
  };

  return (
    <div className="py-6 px-4">
      {/* Order Info Header */}
      <div className="mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          Order #{order.kcs_orderid ?? 'N/A'}
        </h3>
        <div className="flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-400">
          <p><strong>Item:</strong> {order.kcs_itemname ?? 'Unknown'}</p>
          <p><strong>Quantity:</strong> {order.kcs_quantity ?? 0}</p>
          <p><strong>Order Date:</strong> {formatDate(order.kcs_orderdate) ?? 'N/A'}</p>
          {order.kcs_neededby && (
            <p className={new Date(order.kcs_neededby) < new Date() ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
              <strong>Needed By:</strong> {formatDate(order.kcs_neededby)}
            </p>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {statuses.map((status, index) => {
          const state = getStatusState(index);
          const isLast = index === statuses.length - 1;
          const showDate = state === 'completed' || state === 'current';

          return (
            <div key={status.key} className="relative pb-8">
              {/* Vertical line */}
              {!isLast && (
                <div
                  className={`absolute left-5 top-10 w-0.5 h-full ${
                    state === 'completed'
                      ? 'bg-green-500 dark:bg-green-600'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              )}

              {/* Status row */}
              <div className="relative flex items-start gap-4">
                {/* Icon/Dot */}
                {renderStatusDot(state, status.icon)}

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4
                        className={`font-semibold ${
                          state === 'completed'
                            ? 'text-green-700 dark:text-green-400'
                            : state === 'current'
                            ? 'text-blue-700 dark:text-blue-400'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}
                      >
                        {status.label}
                      </h4>
                      {state === 'current' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          Current status
                        </p>
                      )}
                      {state === 'completed' && showDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {status.key === 'submitted' && order.kcs_orderdate
                            ? formatDate(order.kcs_orderdate)
                            : ''}
                        </p>
                      )}
                      {state === 'pending' && (
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
                          Pending
                        </p>
                      )}
                    </div>

                    {/* Status badge */}
                    {state === 'current' && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      {currentIndex === statuses.length - 1 && !isDenied && (
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-400 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your order has been completed!
          </p>
        </div>
      )}

      {isDenied && (
        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-400 font-medium flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            This order has been denied.
          </p>
        </div>
      )}
    </div>
  );
}

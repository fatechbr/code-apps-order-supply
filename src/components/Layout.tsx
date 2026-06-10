import type { ReactNode } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { useTheme } from '../hooks/useTheme';
import cognaLogo from '../assets/cogna-logo-b64';

interface LayoutProps {
  children: ReactNode;
  currentView: 'catalog' | 'orders';
  onNavigate: (view: 'catalog' | 'orders') => void;
}

export default function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const user = useCurrentUser();
  const { toggle, isDark } = useTheme();

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={cognaLogo} alt="Cogna" className="h-8 w-auto" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supply Hub</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Dark mode toggle */}
              <button
                onClick={toggle}
                title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>

              {user.displayName && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Welcome</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{user.displayName}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">{getInitials(user.displayName)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)]">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => onNavigate('catalog')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    currentView === 'catalog'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  📦 Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('orders')}
                  className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
                    currentView === 'orders'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  📋 My Orders
                </button>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

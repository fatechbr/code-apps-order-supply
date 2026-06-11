import { useState, type ReactNode } from 'react';
import { useTheme } from '../hooks/useTheme';
import { useRole } from '../context/RoleContext';
import cognaLogoLight from '../assets/cogna-logo-lightmode-b64';
import cognaLogoDark from '../assets/cogna-logo-darkmode-b64';

export type AppView = 'catalog' | 'orders' | 'all-orders' | 'reports' | 'kanban';

interface LayoutProps {
  children: ReactNode;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export default function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const { displayName, isAdmin } = useRole();
  const { toggle, isDark } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  };

  const navItem = (view: AppView, label: string) => (
    <li>
      <button
        onClick={() => {
          onNavigate(view);
          setSidebarOpen(false); // Close sidebar on mobile after navigation
        }}
        className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors ${
          currentView === view
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
        }`}
      >
        {label}
      </button>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Hamburger button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <img src={isDark ? cognaLogoDark : cognaLogoLight} alt="Cogna" className="h-8 w-auto" />
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

              {displayName && (
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-right">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Welcome</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{displayName}</span>
                    {isAdmin && (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Admin</span>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-sm font-semibold">{getInitials(displayName)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative">
        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-sm border-r border-gray-200 dark:border-gray-700 min-h-[calc(100vh-73px)] transform transition-transform duration-300 ease-in-out lg:transform-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <nav className="p-4">
            <ul className="space-y-2">
              {navItem('catalog', '📦 Catalog')}
              {navItem('orders', '📋 My Orders')}              {isAdmin && navItem('kanban', '📋 Kanban')}              {isAdmin && navItem('all-orders', '🗂️ All Orders')}
              {isAdmin && navItem('reports', '📊 Reports')}
            </ul>

            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-2 mb-2">
                  Admin
                </p>
              </div>
            )}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-x-auto lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/Layout';
import type { AppView } from './components/Layout';
import CatalogPage from './components/CatalogPage';
import MyOrdersPage from './components/MyOrdersPage';
import OrderModal from './components/OrderModal';
import AccessDenied from './components/AccessDenied';
import { useRole } from './context/RoleContext';
import type { CatalogItem } from './types';

function App() {
  const { role, isLoading, isAdmin, userId } = useRole();
  const [currentView, setCurrentView] = useState<AppView>('catalog');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showToast, setShowToast] = useState(false);

  // Guard: if role changes to user and they're on an admin-only view, redirect to catalog
  useEffect(() => {
    if (!isAdmin && (currentView === 'all-orders' || currentView === 'reports')) {
      setCurrentView('catalog');
    }
  }, [isAdmin, currentView]);

  const handleNavigate = (view: AppView) => {
    // Guard: prevent non-admins from accessing admin views
    if (!isAdmin && (view === 'all-orders' || view === 'reports')) return;
    setCurrentView(view);
  };

  const handleOrderClick = (item: CatalogItem) => {
    setSelectedItem(item);
  };

  const handleOrderSuccess = () => {
    setSelectedItem(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // No role assigned
  if (role === 'none') {
    return <AccessDenied />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'catalog':
        return <CatalogPage onOrderClick={handleOrderClick} />;
      case 'orders':
        // Order User sees only their own orders
        return <MyOrdersPage filterByUserId={isAdmin ? undefined : userId} />;
      case 'all-orders':
      case 'reports':
        // Placeholder — implemented in Etapa 3 / 5
        return (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400">Coming soon in next steps...</p>
          </div>
        );
      default:
        return <CatalogPage onOrderClick={handleOrderClick} />;
    }
  };

  return (
    <>
      <Layout currentView={currentView} onNavigate={handleNavigate}>
        {renderView()}
      </Layout>

      {selectedItem && (
        <OrderModal
          item={selectedItem}
          onClose={handleCloseModal}
          onSuccess={handleOrderSuccess}
        />
      )}

      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Order submitted successfully!</span>
          </div>
        </div>
      )}
    </>
  );
}

export default App;

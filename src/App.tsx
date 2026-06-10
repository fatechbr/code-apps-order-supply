import { useState } from 'react';
import './App.css';
import Layout from './components/Layout';
import CatalogPage from './components/CatalogPage';
import MyOrdersPage from './components/MyOrdersPage';
import OrderModal from './components/OrderModal';
import type { CatalogItem } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'catalog' | 'orders'>('catalog');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showToast, setShowToast] = useState(false);

  const handleOrderClick = (item: CatalogItem) => {
    setSelectedItem(item);
  };

  const handleOrderSuccess = () => {
    setSelectedItem(null);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    
    // If on catalog page, stay there; otherwise navigate to orders
    if (currentView === 'catalog') {
      // Optionally refresh catalog
    } else {
      setCurrentView('orders');
    }
  };

  const handleCloseModal = () => {
    setSelectedItem(null);
  };

  return (
    <>
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {currentView === 'catalog' ? (
          <CatalogPage onOrderClick={handleOrderClick} />
        ) : (
          <MyOrdersPage />
        )}
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

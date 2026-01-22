import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  ClipboardList,
  Calendar,
  BarChart3,
  Users,
  Send,
  Sparkles,
  Gift,
  Settings,
  Menu,
  X,
  LogOut,
  Plus,
  Bell,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';
import { OrderNotificationProvider, useOrderNotification, unlockAudio } from '../contexts/OrderNotificationContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import NewOrderPopup from './NewOrderPopup';
import PendingOrdersModal from './PendingOrdersModal';
import QuickOrderModal from './QuickOrderModal';

interface LayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Commandes', href: '/orders', icon: ClipboardList },
  { name: 'Menu', href: '/menu', icon: UtensilsCrossed },
  { name: 'Planning', href: '/schedule', icon: Calendar },
  { name: 'Statistiques', href: '/analytics', icon: BarChart3 },
  { name: 'Clients', href: '/customers', icon: Users },
  { name: 'Campagnes', href: '/campaigns', icon: Send },
  { name: 'Offres', href: '/offers', icon: Sparkles },
  { name: 'Fidélité', href: '/loyalty', icon: Gift },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

function LayoutContent({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  const { foodtruck } = useFoodtruck();
  const { pendingPopupOrders, pendingCount, acceptOrder, cancelOrder, dismissPopup, isAutoAccept, refreshOrders, showAllPendingOrders, showOrderById, minPrepTime } = useOrderNotification();

  // Initialize push notifications for native apps
  usePushNotifications({
    onNotificationTap: showOrderById,
  });

  // Unlock audio on first user interaction (required for iOS)
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('click', handleInteraction, { once: true });
    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  // Get current page name for mobile header
  const currentPageName = navigation.find(item => item.href === location.pathname)?.name || 'Tableau de bord';

  return (
    <>
      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showQuickOrder}
        onClose={() => setShowQuickOrder(false)}
        onOrderCreated={refreshOrders}
      />

      {/* Global Order Popups */}
      {isAutoAccept ? (
        /* Auto-accept mode: show single notification popup for each new order */
        pendingPopupOrders.map((order, index) => (
          <NewOrderPopup
            key={order.id}
            order={order}
            onAccept={() => acceptOrder(order.id)}
            onCancel={() => cancelOrder(order.id)}
            onClose={() => dismissPopup(order.id)}
            stackIndex={index}
            totalInStack={pendingPopupOrders.length}
            isAutoAccept={isAutoAccept}
          />
        ))
      ) : (
        /* Manual mode: single modal with navigation through all pending orders */
        pendingPopupOrders.length > 0 && (
          <PendingOrdersModal
            orders={pendingPopupOrders}
            totalPendingCount={pendingCount}
            onAccept={acceptOrder}
            onCancel={cancelOrder}
            onClose={() => pendingPopupOrders.forEach(o => dismissPopup(o.id))}
            onRefresh={showAllPendingOrders}
            minPrepTime={minPrepTime}
          />
        )
      )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-gray-900">FoodTruck</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-900 truncate">
              {foodtruck?.name || 'Mon Food Truck'}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {foodtruck?.cuisine_types?.join(', ') || ''}
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Layout - header OUTSIDE scroll context */}
      <div className="lg:hidden absolute inset-0 bg-gray-50">
        {/* Header - absolute, NOT inside scroll container */}
        <div
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-2 bg-gray-50"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            {/* Pending orders - bell with badge */}
            <button
              onClick={showAllPendingOrders}
              className={`relative w-11 h-11 rounded-xl shadow-md flex items-center justify-center transition-all ${
                pendingCount > 0
                  ? 'bg-yellow-400 hover:bg-yellow-500'
                  : 'bg-white hover:bg-gray-50'
              }`}
            >
              <Bell className={`w-5 h-5 ${pendingCount > 0 ? 'text-yellow-800' : 'text-gray-400'}`} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </button>
            {/* New order button */}
            <button
              onClick={() => setShowQuickOrder(true)}
              className="w-11 h-11 rounded-xl bg-white shadow-md hover:bg-gray-50 flex items-center justify-center transition-colors"
            >
              <Plus className="w-5 h-5 text-primary-500" />
            </button>
          </div>
        </div>

        {/* Scroll container - separate from header */}
        <div
          className="absolute left-0 right-0 bottom-0 overflow-y-auto"
          style={{
            top: 'calc(env(safe-area-inset-top) + 56px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <main className="p-4 pb-8">
            {children}
          </main>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen bg-gray-50 pl-64">
        {/* Desktop header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-gray-900">
              {currentPageName}
            </h1>
            <div className="flex items-center gap-2">
              {/* Pending orders - bell with badge */}
              <button
                onClick={showAllPendingOrders}
                className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                  pendingCount > 0
                    ? 'bg-yellow-400 hover:bg-yellow-500'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Bell className={`w-5 h-5 ${pendingCount > 0 ? 'text-yellow-800' : 'text-gray-400'}`} />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>
              {/* New order button */}
              <button
                onClick={() => setShowQuickOrder(true)}
                className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Plus className="w-5 h-5 text-primary-500" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  return (
    <OrderNotificationProvider>
      <LayoutContent>{children}</LayoutContent>
    </OrderNotificationProvider>
  );
}

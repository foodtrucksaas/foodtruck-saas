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
import {
  OrderNotificationProvider,
  useOrderNotification,
  unlockAudio,
} from '../contexts/OrderNotificationContext';
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
  const {
    pendingPopupOrders,
    pendingCount,
    acceptOrder,
    cancelOrder,
    dismissPopup,
    isAutoAccept,
    refreshOrders,
    showAllPendingOrders,
    showOrderById,
    minPrepTime,
  } = useOrderNotification();

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
  const currentPageName =
    navigation.find((item) => item.href === location.pathname)?.name || 'Tableau de bord';

  return (
    <>
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Aller au contenu principal
      </a>

      {/* Quick Order Modal */}
      <QuickOrderModal
        isOpen={showQuickOrder}
        onClose={() => setShowQuickOrder(false)}
        onOrderCreated={refreshOrders}
      />

      {/* Global Order Popups */}
      {isAutoAccept
        ? /* Auto-accept mode: show single notification popup for each new order */
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
        : /* Manual mode: single modal with navigation through all pending orders */
          pendingPopupOrders.length > 0 && (
            <PendingOrdersModal
              orders={pendingPopupOrders}
              totalPendingCount={pendingCount}
              onAccept={acceptOrder}
              onCancel={cancelOrder}
              onClose={() => pendingPopupOrders.forEach((o) => dismissPopup(o.id))}
              onRefresh={showAllPendingOrders}
              minPrepTime={minPrepTime}
            />
          )}

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-backdrop-in"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-smooth-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        aria-label="Navigation principale"
      >
        <div className="flex items-center justify-between h-14 lg:h-16 px-4 border-b border-gray-100">
          <Link to="/" className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25"
              aria-hidden="true"
            >
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900">FoodTruck</span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden min-w-[44px] min-h-[44px] p-2 rounded-md hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="p-4">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 mb-4 border border-gray-100">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {foodtruck?.name || 'Mon Food Truck'}
            </p>
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {foodtruck?.cuisine_types?.join(', ') || ''}
            </p>
          </div>

          <nav className="space-y-1" aria-label="Menu principal">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    isActive
                      ? 'bg-primary-50 text-primary-600 shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50 hover:translate-x-0.5 active:scale-[0.98]'
                  }`}
                >
                  <item.icon className="w-5 h-5" aria-hidden="true" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}
        >
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 min-h-[44px] w-full rounded-xl text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Layout - header OUTSIDE scroll context */}
      <div className="lg:hidden absolute inset-0 bg-gray-50 overflow-hidden">
        {/* Header - ultra compact for mobile, sticks right below safe area */}
        <header
          className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 bg-gray-50"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            height: 'calc(env(safe-area-inset-top, 0px) + 44px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 transition-transform"
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1.5">
            {/* Pending orders - bell with badge */}
            <button
              onClick={showAllPendingOrders}
              className={`relative w-10 h-10 rounded-xl shadow-sm flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 ${
                pendingCount > 0 ? 'bg-yellow-400 hover:bg-yellow-500' : 'bg-white hover:bg-gray-50'
              }`}
              aria-label={`Commandes en attente${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            >
              <Bell
                className={`w-4 h-4 ${pendingCount > 0 ? 'text-yellow-800' : 'text-gray-400'}`}
                aria-hidden="true"
              />
              {pendingCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                  aria-hidden="true"
                >
                  {pendingCount}
                </span>
              )}
            </button>
            {/* New order button */}
            <button
              onClick={() => setShowQuickOrder(true)}
              className="w-10 h-10 rounded-xl bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95"
              aria-label="Nouvelle commande"
            >
              <Plus className="w-5 h-5 text-primary-500" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Scroll container - starts after header (safe-area + 44px) */}
        <div
          className="absolute left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden"
          style={{
            top: 'calc(env(safe-area-inset-top, 0px) + 44px)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <main
            id="main-content"
            className="px-3 py-3 pb-6 animate-fade-in-up overflow-x-hidden"
            tabIndex={-1}
            key={location.pathname}
          >
            {children}
          </main>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen bg-gray-50 pl-64">
        {/* Desktop header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-8">
            <h1 className="text-xl font-semibold text-gray-900">{currentPageName}</h1>
            <div className="flex items-center gap-2">
              {/* Pending orders - bell with badge */}
              <button
                onClick={showAllPendingOrders}
                className={`relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                  pendingCount > 0
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-md shadow-yellow-500/30 hover:shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                aria-label={`Commandes en attente${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
              >
                <Bell
                  className={`w-5 h-5 ${pendingCount > 0 ? 'text-yellow-900' : 'text-gray-400'}`}
                  aria-hidden="true"
                />
                {pendingCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-sm"
                    aria-hidden="true"
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
              {/* New order button */}
              <button
                onClick={() => setShowQuickOrder(true)}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                aria-label="Nouvelle commande"
              >
                <Plus className="w-5 h-5 text-primary-500" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        {/* Desktop content */}
        <main
          id="main-content"
          className="p-8 animate-fade-in-up"
          tabIndex={-1}
          key={location.pathname}
        >
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

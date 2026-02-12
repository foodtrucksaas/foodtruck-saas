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

type NavItem =
  | { type: 'link'; name: string; href: string; icon: typeof LayoutDashboard }
  | { type: 'separator'; label: string };

const navigation: NavItem[] = [
  // Opérations quotidiennes
  { type: 'separator', label: 'Opérations' },
  { type: 'link', name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { type: 'link', name: 'Commandes', href: '/orders', icon: ClipboardList },
  { type: 'link', name: 'Carte', href: '/menu', icon: UtensilsCrossed },
  { type: 'link', name: 'Planning', href: '/schedule', icon: Calendar },
  { type: 'link', name: 'Menus & Offres', href: '/offers', icon: Sparkles },
  // Performance & Clients
  { type: 'separator', label: 'Performance' },
  { type: 'link', name: 'Analyses', href: '/analytics', icon: BarChart3 },
  { type: 'link', name: 'Clients', href: '/customers', icon: Users },
  { type: 'link', name: 'Fidélité', href: '/loyalty', icon: Gift },
  { type: 'link', name: 'Campagnes', href: '/campaigns', icon: Send },
  // Paramètres en bas
  { type: 'separator', label: '' },
  { type: 'link', name: 'Paramètres', href: '/settings', icon: Settings },
];

function OnboardingBanner() {
  const { foodtruck } = useFoodtruck();
  if (!foodtruck || foodtruck.onboarding_completed_at) return null;
  return (
    <Link
      to="/onboarding-assistant"
      className="block bg-primary-50 border-b border-primary-100 px-4 py-3 text-sm text-primary-700 hover:bg-primary-100 transition-colors"
    >
      <span className="font-medium">Terminer la configuration</span>
      <span className="hidden sm:inline">
        {' '}
        — L'assistant vous guide pour configurer emplacements, horaires et menu
      </span>
      <span className="ml-2">&rarr;</span>
    </Link>
  );
}

function LayoutContent({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showQuickOrder, setShowQuickOrder] = useState(false);
  const location = useLocation();
  const { signOut } = useAuth();
  useFoodtruck(); // Keep context active
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
    navigation.find(
      (item): item is Extract<NavItem, { type: 'link' }> =>
        item.type === 'link' && item.href === location.pathname
    )?.name || 'Tableau de bord';

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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 transform transition-transform duration-300 ease-smooth-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
        aria-label="Navigation principale"
      >
        {/* Close button - mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-3 right-3 min-w-[44px] min-h-[44px] p-2 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
          style={{ marginTop: 'env(safe-area-inset-top)' }}
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Navigation */}
        <div className="h-full overflow-y-auto pt-16 lg:pt-6 pb-24 px-3">
          <nav className="space-y-1" aria-label="Menu principal">
            {navigation.map((item, index) => {
              if (item.type === 'separator') {
                if (!item.label) return null; // Skip empty separators
                return (
                  <div
                    key={`sep-${item.label}`}
                    className={`px-3 pt-6 pb-2 ${index > 0 ? 'mt-2' : ''}`}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">
                      {item.label}
                    </span>
                  </div>
                );
              }

              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group flex items-center gap-3 px-3 py-3 min-h-[48px] rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white active:scale-[0.98]'
                  }`}
                >
                  <item.icon
                    className={`w-5 h-5 transition-colors ${
                      isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'
                    }`}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Logout button */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-gray-900 via-gray-900 to-transparent"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-3 min-h-[48px] w-full rounded-xl text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <LogOut className="w-5 h-5" aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Layout - native document scroll for Safari address bar collapse */}
      <div className="lg:hidden min-h-screen bg-gray-50">
        {/* Sticky header */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-3 bg-gray-50/95 backdrop-blur-sm"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            height: 'calc(env(safe-area-inset-top, 0px) + 52px)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-white shadow-sm flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 transition-transform"
            aria-label="Ouvrir le menu de navigation"
            aria-expanded={sidebarOpen}
          >
            <Menu className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </button>
          <h1 className="text-base font-semibold text-gray-900 truncate flex-1 mx-2">
            {currentPageName}
          </h1>
          <div className="flex items-center gap-1.5">
            {/* Pending orders - bell with badge */}
            <button
              onClick={showAllPendingOrders}
              className={`relative w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl shadow-sm flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95 ${
                pendingCount > 0
                  ? 'bg-warning-400 hover:bg-warning-500'
                  : 'bg-white hover:bg-gray-50'
              }`}
              aria-label={`Commandes en attente${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            >
              <Bell
                className={`w-4 h-4 ${pendingCount > 0 ? 'text-warning-800' : 'text-gray-400'}`}
                aria-hidden="true"
              />
              {pendingCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
                  aria-hidden="true"
                >
                  {pendingCount}
                </span>
              )}
            </button>
            {/* New order button */}
            <button
              onClick={() => setShowQuickOrder(true)}
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white shadow-sm hover:bg-gray-50 flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 active:scale-95"
              aria-label="Nouvelle commande"
            >
              <Plus className="w-5 h-5 text-primary-500" aria-hidden="true" />
            </button>
          </div>
        </header>

        <OnboardingBanner />

        {/* Content - native scroll */}
        <main
          id="main-content"
          className="px-3 py-3 animate-fade-in-up"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
          tabIndex={-1}
          key={location.pathname}
        >
          {children}
        </main>
      </div>

      {/* Desktop Layout */}
      <div className="hidden lg:block min-h-screen bg-gray-50 pl-72">
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
                    ? 'bg-gradient-to-br from-warning-400 to-warning-500 shadow-md shadow-warning-500/30 hover:shadow-lg'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
                aria-label={`Commandes en attente${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
              >
                <Bell
                  className={`w-5 h-5 ${pendingCount > 0 ? 'text-warning-900' : 'text-gray-400'}`}
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

        <OnboardingBanner />

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

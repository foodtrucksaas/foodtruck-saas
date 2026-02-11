import { useState, useMemo } from 'react';
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Calendar, List, Clock } from 'lucide-react';
import { useOrders } from './useOrders';
import { OrderCard } from './OrderCard';
import { OrderDetailModal } from './OrderDetailModal';
import { TimelineView } from './TimelineView';
import { OrdersPageSkeleton } from '../../components/Skeleton';

type StatusFilter = 'pending' | 'confirmed' | 'ready' | 'picked_up';
type ViewMode = 'list' | 'timeline';

export default function Orders() {
  const {
    orders,
    loading,
    selectedOrder,
    setSelectedOrder,
    currentSlotStr,
    slotInterval,
    serviceStartHour,
    serviceEndHour,
    nowRef,
    pending,
    confirmed,
    ready,
    pickedUp,
    useReadyStatus,
    selectedDate,
    isToday,
    isFuture,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    setDate,
    soundEnabled,
    setSoundEnabled,
    acceptOrder,
    cancelOrderWithReason,
    markReady,
    markPickedUp,
    updatePickupTime,
  } = useOrders();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('orders-view-mode');
    return saved === 'list' || saved === 'timeline' ? saved : 'timeline';
  });

  // Persist view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('orders-view-mode', mode);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const [activeFilters, setActiveFilters] = useState<StatusFilter[]>([
    'pending',
    'confirmed',
    'ready',
    'picked_up',
  ]);

  const toggleFilter = (filter: StatusFilter) => {
    setActiveFilters((prev) => {
      if (prev.includes(filter)) {
        return prev.filter((f) => f !== filter);
      }
      return [...prev, filter];
    });
  };

  // Filter and group orders based on active filters
  const filteredGroupedOrders = useMemo(() => {
    const slotInterval = 15; // Default, could be from foodtruck settings
    const filtered = orders.filter((o) => {
      if (activeFilters.includes('pending') && o.status === 'pending') return true;
      // When useReadyStatus is enabled, 'confirmed' and 'ready' are separate filters
      if (useReadyStatus) {
        if (activeFilters.includes('confirmed') && o.status === 'confirmed') return true;
        if (activeFilters.includes('ready') && o.status === 'ready') return true;
      } else {
        // When disabled, 'confirmed' filter includes both confirmed and ready
        if (
          activeFilters.includes('confirmed') &&
          (o.status === 'confirmed' || o.status === 'ready')
        )
          return true;
      }
      if (
        activeFilters.includes('picked_up') &&
        (o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show')
      )
        return true;
      return false;
    });

    const grouped: { slot: string; orders: typeof orders }[] = [];
    const map: Record<string, typeof orders> = {};

    filtered.forEach((o) => {
      const pickupDate = new Date(o.pickup_time);
      const hour = pickupDate.getHours().toString().padStart(2, '0');
      const minute = pickupDate.getMinutes();
      const slot = Math.floor(minute / slotInterval) * slotInterval;
      const slotKey = `${hour}:${slot.toString().padStart(2, '0')}`;
      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(o);
    });

    Object.keys(map)
      .sort()
      .forEach((slot) => {
        // Sort orders within each slot by created_at to maintain stable order
        const sortedOrders = map[slot].sort(
          (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        grouped.push({ slot, orders: sortedOrders });
      });

    return grouped;
  }, [orders, activeFilters, useReadyStatus]);

  if (loading) {
    return <OrdersPageSkeleton />;
  }

  return (
    <div className="space-y-6 pb-[env(safe-area-inset-bottom)]">
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          useReadyStatus={useReadyStatus}
          onClose={() => setSelectedOrder(null)}
          onAccept={() => {
            setSelectedOrder(null);
            acceptOrder(selectedOrder.id);
          }}
          onCancelWithReason={(reason) => {
            setSelectedOrder(null);
            cancelOrderWithReason(selectedOrder.id, reason);
          }}
          onMarkReady={() => {
            setSelectedOrder(null);
            markReady(selectedOrder.id);
          }}
          onMarkPickedUp={() => {
            setSelectedOrder(null);
            markPickedUp(selectedOrder.id);
          }}
          onUpdatePickupTime={(newTime) => {
            setSelectedOrder(null);
            updatePickupTime(selectedOrder.id, selectedOrder.pickup_time, newTime);
          }}
        />
      )}

      {/* Sticky Header - compact on mobile */}
      <div className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur-sm -mx-3 px-3 py-2 sm:-mx-4 sm:px-4 sm:py-3 md:-mx-8 md:px-8 border-b border-gray-200/80">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Date navigation */}
          <div
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3"
            role="toolbar"
            aria-label="Navigation des dates"
          >
            {/* Date selector row */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={goToPreviousDay}
                className="w-10 h-10 sm:w-11 sm:h-11 min-w-[44px] min-h-[44px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-all flex-shrink-0 flex items-center justify-center active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm"
                aria-label="Jour précédent"
                type="button"
              >
                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
              </button>
              <div className="relative flex-1 min-w-0">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  aria-expanded={showDatePicker}
                  aria-haspopup="dialog"
                  type="button"
                  className={`w-full flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[44px] rounded-xl border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm ${
                    isToday
                      ? 'bg-white border-gray-200 hover:border-gray-300'
                      : isFuture
                        ? 'bg-blue-50 border-blue-300'
                        : 'bg-amber-50 border-amber-300'
                  }`}
                >
                  <Calendar
                    className={`w-4 h-4 flex-shrink-0 hidden sm:block ${isToday ? 'text-gray-500' : isFuture ? 'text-blue-600' : 'text-amber-600'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`font-semibold capitalize text-sm sm:text-base truncate ${isToday ? 'text-gray-900' : isFuture ? 'text-blue-800' : 'text-amber-800'}`}
                  >
                    {formatDate(selectedDate)}
                  </span>
                  {isToday && (
                    <span className="text-xs bg-primary-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 font-medium hidden sm:inline">
                      Aujourd'hui
                    </span>
                  )}
                </button>
                {showDatePicker && (
                  <div
                    className="absolute top-full left-0 sm:left-1/2 sm:-translate-x-1/2 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-30"
                    role="dialog"
                    aria-label="Sélecteur de date"
                  >
                    <label htmlFor="orders-date-picker" className="sr-only">
                      Choisir une date
                    </label>
                    <input
                      id="orders-date-picker"
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          setDate(new Date(e.target.value));
                          setShowDatePicker(false);
                        }
                      }}
                      className="px-3 py-2.5 min-h-[44px] border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={goToNextDay}
                className="w-10 h-10 sm:w-11 sm:h-11 min-w-[44px] min-h-[44px] sm:min-w-[44px] sm:min-h-[44px] rounded-xl bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-600 transition-all flex-shrink-0 flex items-center justify-center active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm"
                aria-label="Jour suivant"
                type="button"
              >
                <ChevronRight className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* View toggle + Sound button row */}
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              {/* View toggle */}
              <div
                className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm"
                role="group"
                aria-label="Mode d'affichage"
              >
                <button
                  onClick={() => handleViewModeChange('timeline')}
                  className={`p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'timeline' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  aria-label="Vue planning"
                  aria-pressed={viewMode === 'timeline'}
                  type="button"
                >
                  <Clock className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-w-[44px] sm:min-h-[44px] rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'list' ? 'bg-primary-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                  aria-label="Vue liste"
                  aria-pressed={viewMode === 'list'}
                  type="button"
                >
                  <List className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 sm:p-2.5 min-w-[44px] min-h-[44px] sm:min-h-[44px] rounded-xl flex items-center justify-center gap-2 text-sm transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 shadow-sm ${soundEnabled ? 'bg-primary-500 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                aria-pressed={soundEnabled}
                aria-label={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
                type="button"
              >
                {soundEnabled ? (
                  <Volume2 className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="hidden md:inline font-medium">
                  {soundEnabled ? 'Son' : 'Muet'}
                </span>
              </button>
            </div>
          </div>

          {/* Past/Future day warning banner */}
          {!isToday && (
            <div
              className={`${isFuture ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-amber-500 to-amber-600'} text-white py-2.5 sm:py-3 px-3 sm:px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 rounded-xl shadow-sm`}
            >
              <span className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                <span>{isFuture ? '📅' : '⏰'}</span>
                {isFuture ? 'Commandes à venir' : 'Historique'}
              </span>
              <button
                onClick={goToToday}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-1.5 min-h-[44px] bg-white/95 rounded-lg text-sm font-semibold transition-all hover:bg-white hover:shadow-sm active:scale-95 text-gray-800"
              >
                Retour à aujourd'hui
              </button>
            </div>
          )}

          {/* Filter buttons - Modern pill style */}
          <div
            className="flex flex-wrap items-center gap-1.5 sm:gap-2"
            role="group"
            aria-label="Filtrer par statut"
          >
            <button
              onClick={() => toggleFilter('pending')}
              type="button"
              aria-pressed={activeFilters.includes('pending')}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('pending')
                  ? 'bg-warning-50 text-warning-600 border-2 border-warning-500 shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${activeFilters.includes('pending') ? 'bg-warning-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">En attente</span>
                <span className="sm:hidden">Attente</span>
                {pending > 0 && (
                  <span
                    className="bg-warning-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] sm:min-w-[20px]"
                    aria-label={`${pending} commandes`}
                  >
                    {pending}
                  </span>
                )}
              </span>
            </button>
            <button
              onClick={() => toggleFilter('confirmed')}
              type="button"
              aria-pressed={activeFilters.includes('confirmed')}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('confirmed')
                  ? 'bg-info-50 text-info-600 border-2 border-info-500 shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${activeFilters.includes('confirmed') ? 'bg-info-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Acceptées</span>
                <span className="sm:hidden">OK</span>
                {confirmed > 0 && (
                  <span
                    className="bg-info-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] sm:min-w-[20px]"
                    aria-label={`${confirmed} commandes`}
                  >
                    {confirmed}
                  </span>
                )}
              </span>
            </button>
            {useReadyStatus && (
              <button
                onClick={() => toggleFilter('ready')}
                type="button"
                aria-pressed={activeFilters.includes('ready')}
                className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  activeFilters.includes('ready')
                    ? 'bg-success-50 text-success-600 border-2 border-success-500 shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${activeFilters.includes('ready') ? 'bg-success-500' : 'bg-gray-300'}`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Prêtes</span>
                  <span className="sm:hidden">Prêt</span>
                  {ready > 0 && (
                    <span
                      className="bg-success-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] sm:min-w-[20px]"
                      aria-label={`${ready} commandes`}
                    >
                      {ready}
                    </span>
                  )}
                </span>
              </button>
            )}
            <button
              onClick={() => toggleFilter('picked_up')}
              type="button"
              aria-pressed={activeFilters.includes('picked_up')}
              className={`flex-1 px-2 sm:px-3 py-2 sm:py-2.5 min-h-[44px] sm:min-h-[44px] rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('picked_up')
                  ? 'bg-gray-100 text-gray-700 border-2 border-gray-400 shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1 sm:gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${activeFilters.includes('picked_up') ? 'bg-gray-500' : 'bg-gray-300'}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Retirées</span>
                <span className="sm:hidden">Fait</span>
                {pickedUp > 0 && (
                  <span
                    className="bg-gray-500 text-white px-1 sm:px-1.5 py-0.5 rounded-full text-xs font-semibold min-w-[18px] sm:min-w-[20px]"
                    aria-label={`${pickedUp} commandes`}
                  >
                    {pickedUp}
                  </span>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Orders display */}
      {viewMode === 'timeline' ? (
        /* Timeline View */
        orders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">Aucune commande pour le moment</p>
          </div>
        ) : (
          <TimelineView
            orders={orders.filter((o) => {
              if (activeFilters.includes('pending') && o.status === 'pending') return true;
              if (useReadyStatus) {
                if (activeFilters.includes('confirmed') && o.status === 'confirmed') return true;
                if (activeFilters.includes('ready') && o.status === 'ready') return true;
              } else {
                if (
                  activeFilters.includes('confirmed') &&
                  (o.status === 'confirmed' || o.status === 'ready')
                )
                  return true;
              }
              if (
                activeFilters.includes('picked_up') &&
                (o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show')
              )
                return true;
              return false;
            })}
            currentSlotStr={currentSlotStr}
            slotInterval={slotInterval}
            isToday={isToday}
            startHour={serviceStartHour}
            endHour={serviceEndHour}
            onOrderClick={setSelectedOrder}
          />
        )
      ) : /* List View - grouped by time slot */
      filteredGroupedOrders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">
            {orders.length === 0
              ? 'Aucune commande pour le moment'
              : 'Aucune commande avec ces filtres'}
          </p>
        </div>
      ) : (
        <div className="space-y-8 mt-4">
          {filteredGroupedOrders.map(({ slot, orders: slotOrders }) => {
            const isCurrent = slot === currentSlotStr;

            return (
              <div key={slot}>
                {/* Time slot header */}
                <div className="flex items-center gap-3 mb-3" ref={isCurrent ? nowRef : undefined}>
                  <div
                    className={`text-xl font-bold ${isCurrent ? 'text-primary-600' : 'text-gray-800'}`}
                  >
                    {slot}
                  </div>
                  {isCurrent && (
                    <span className="text-xs bg-primary-100 text-primary-600 px-2.5 py-1 rounded-full font-medium animate-pulse">
                      Maintenant
                    </span>
                  )}
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-sm text-gray-500 font-medium">
                    {slotOrders.length} commande{slotOrders.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Orders for this slot - grid on desktop */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                  {slotOrders.map((o) => (
                    <OrderCard key={o.id} order={o} onClick={() => setSelectedOrder(o)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

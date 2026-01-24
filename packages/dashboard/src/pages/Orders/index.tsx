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
    return (saved === 'list' || saved === 'timeline') ? saved : 'timeline';
  });

  // Persist view mode to localStorage
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('orders-view-mode', mode);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const [activeFilters, setActiveFilters] = useState<StatusFilter[]>(['pending', 'confirmed', 'ready', 'picked_up']);

  const toggleFilter = (filter: StatusFilter) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      }
      return [...prev, filter];
    });
  };

  // Filter and group orders based on active filters
  const filteredGroupedOrders = useMemo(() => {
    const slotInterval = 15; // Default, could be from foodtruck settings
    const filtered = orders.filter(o => {
      if (activeFilters.includes('pending') && o.status === 'pending') return true;
      // When useReadyStatus is enabled, 'confirmed' and 'ready' are separate filters
      if (useReadyStatus) {
        if (activeFilters.includes('confirmed') && o.status === 'confirmed') return true;
        if (activeFilters.includes('ready') && o.status === 'ready') return true;
      } else {
        // When disabled, 'confirmed' filter includes both confirmed and ready
        if (activeFilters.includes('confirmed') && (o.status === 'confirmed' || o.status === 'ready')) return true;
      }
      if (activeFilters.includes('picked_up') && (o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show')) return true;
      return false;
    });

    const grouped: { slot: string; orders: typeof orders }[] = [];
    const map: Record<string, typeof orders> = {};

    filtered.forEach(o => {
      const pickupDate = new Date(o.pickup_time);
      const hour = pickupDate.getHours().toString().padStart(2, '0');
      const minute = pickupDate.getMinutes();
      const slot = Math.floor(minute / slotInterval) * slotInterval;
      const slotKey = `${hour}:${slot.toString().padStart(2, '0')}`;
      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(o);
    });

    Object.keys(map).sort().forEach(slot => {
      // Sort orders within each slot by created_at to maintain stable order
      const sortedOrders = map[slot].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      grouped.push({ slot, orders: sortedOrders });
    });

    return grouped;
  }, [orders, activeFilters, useReadyStatus]);

  if (loading) {
    return <OrdersPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          useReadyStatus={useReadyStatus}
          onClose={() => setSelectedOrder(null)}
          onAccept={() => { setSelectedOrder(null); acceptOrder(selectedOrder.id); }}
          onCancelWithReason={(reason) => { setSelectedOrder(null); cancelOrderWithReason(selectedOrder.id, reason); }}
          onMarkReady={() => { setSelectedOrder(null); markReady(selectedOrder.id); }}
          onMarkPickedUp={() => { setSelectedOrder(null); markPickedUp(selectedOrder.id); }}
          onUpdatePickupTime={(newTime) => { setSelectedOrder(null); updatePickupTime(selectedOrder.id, selectedOrder.pickup_time, newTime); }}
        />
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-gray-50 -mx-4 px-4 py-3 md:-mx-8 md:px-8 border-b border-gray-200">
        <div className="flex flex-col gap-3">
          {/* Date navigation */}
          <div className="flex items-center justify-between" role="toolbar" aria-label="Navigation des dates">
            <div className="flex items-center gap-2 flex-1">
              <button
                onClick={goToPreviousDay}
                className="w-11 h-11 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0 flex items-center justify-center active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Jour precedent"
                type="button"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </button>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  aria-expanded={showDatePicker}
                  aria-haspopup="dialog"
                  type="button"
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    isToday
                      ? 'bg-white border-gray-200 hover:bg-gray-50'
                      : isFuture
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-amber-50 border-amber-300'
                  }`}
                >
                  <Calendar className={`w-4 h-4 flex-shrink-0 ${isToday ? 'text-gray-500' : isFuture ? 'text-blue-600' : 'text-amber-600'}`} aria-hidden="true" />
                  <span className={`font-medium capitalize whitespace-nowrap ${isToday ? 'text-gray-900' : isFuture ? 'text-blue-800' : 'text-amber-800'}`}>{formatDate(selectedDate)}</span>
                  {isToday && <span className="text-xs bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">Aujourd'hui</span>}
                </button>
                {showDatePicker && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-30" role="dialog" aria-label="Selecteur de date">
                    <label htmlFor="orders-date-picker" className="sr-only">Choisir une date</label>
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
                      className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              <button
                onClick={goToNextDay}
                className="w-11 h-11 rounded-lg border bg-white border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors flex-shrink-0 flex items-center justify-center active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label="Jour suivant"
                type="button"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1" role="group" aria-label="Mode d'affichage">
              <button
                onClick={() => handleViewModeChange('timeline')}
                className={`p-2 min-w-[40px] min-h-[40px] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'timeline' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                aria-label="Vue planning"
                aria-pressed={viewMode === 'timeline'}
                type="button"
              >
                <Clock className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 min-w-[40px] min-h-[40px] rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                aria-label="Vue liste"
                aria-pressed={viewMode === 'list'}
                type="button"
              >
                <List className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 min-h-[44px] rounded-lg flex items-center gap-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${soundEnabled ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? 'Desactiver le son' : 'Activer le son'}
              type="button"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" aria-hidden="true" /> : <VolumeX className="w-4 h-4" aria-hidden="true" />}
              <span className="hidden md:inline">{soundEnabled ? 'Son active' : 'Son desactive'}</span>
            </button>
          </div>

          {/* Past/Future day warning banner */}
          {!isToday && (
            <div className={`${isFuture ? 'bg-blue-500' : 'bg-amber-500'} text-white py-2 px-4 flex items-center justify-between rounded-lg`}>
              <span className="font-medium">
                {isFuture ? '📅 Commandes à venir' : '⚠️ Historique'}
              </span>
              <button
                onClick={goToToday}
                className={`px-3 py-1 bg-white rounded-lg text-sm font-medium transition-colors ${isFuture ? 'text-blue-600 hover:bg-blue-50' : 'text-amber-600 hover:bg-amber-50'}`}
              >
                Retour à aujourd'hui
              </button>
            </div>
          )}

          {/* Filter buttons */}
          <div className="flex items-center gap-1.5 w-full overflow-x-auto no-scrollbar" role="group" aria-label="Filtrer par statut">
            <button
              onClick={() => toggleFilter('pending')}
              type="button"
              aria-pressed={activeFilters.includes('pending')}
              className={`flex-1 px-2 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-all whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('pending')
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeFilters.includes('pending') ? 'bg-yellow-500' : 'bg-gray-400'}`} aria-hidden="true" />
                En attente
                {pending > 0 && <span className="bg-yellow-200 text-yellow-800 px-1 rounded-full text-xs" aria-label={`${pending} commandes`}>{pending}</span>}
              </span>
            </button>
            <button
              onClick={() => toggleFilter('confirmed')}
              type="button"
              aria-pressed={activeFilters.includes('confirmed')}
              className={`flex-1 px-2 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-all whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('confirmed')
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeFilters.includes('confirmed') ? 'bg-blue-500' : 'bg-gray-400'}`} aria-hidden="true" />
                Acceptee
                {confirmed > 0 && <span className="bg-blue-200 text-blue-800 px-1 rounded-full text-xs" aria-label={`${confirmed} commandes`}>{confirmed}</span>}
              </span>
            </button>
            {useReadyStatus && (
              <button
                onClick={() => toggleFilter('ready')}
                type="button"
                aria-pressed={activeFilters.includes('ready')}
                className={`flex-1 px-2 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-all whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  activeFilters.includes('ready')
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${activeFilters.includes('ready') ? 'bg-purple-500' : 'bg-gray-400'}`} aria-hidden="true" />
                  Prete
                  {ready > 0 && <span className="bg-purple-200 text-purple-800 px-1 rounded-full text-xs" aria-label={`${ready} commandes`}>{ready}</span>}
                </span>
              </button>
            )}
            <button
              onClick={() => toggleFilter('picked_up')}
              type="button"
              aria-pressed={activeFilters.includes('picked_up')}
              className={`flex-1 px-2 py-2.5 min-h-[44px] rounded-full text-xs font-medium transition-all whitespace-nowrap active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                activeFilters.includes('picked_up')
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${activeFilters.includes('picked_up') ? 'bg-green-500' : 'bg-gray-400'}`} aria-hidden="true" />
                Retiree
                {pickedUp > 0 && <span className="bg-green-200 text-green-800 px-1 rounded-full text-xs" aria-label={`${pickedUp} commandes`}>{pickedUp}</span>}
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
            orders={orders.filter(o => {
              if (activeFilters.includes('pending') && o.status === 'pending') return true;
              if (useReadyStatus) {
                if (activeFilters.includes('confirmed') && o.status === 'confirmed') return true;
                if (activeFilters.includes('ready') && o.status === 'ready') return true;
              } else {
                if (activeFilters.includes('confirmed') && (o.status === 'confirmed' || o.status === 'ready')) return true;
              }
              if (activeFilters.includes('picked_up') && (o.status === 'picked_up' || o.status === 'cancelled' || o.status === 'no_show')) return true;
              return false;
            })}
            currentSlotStr={currentSlotStr}
            slotInterval={slotInterval}
            isToday={isToday}
            onOrderClick={setSelectedOrder}
          />
        )
      ) : (
        /* List View - grouped by time slot */
        filteredGroupedOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg">
              {orders.length === 0 ? 'Aucune commande pour le moment' : 'Aucune commande avec ces filtres'}
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
                    <div className={`text-xl font-bold ${isCurrent ? 'text-primary-600' : 'text-gray-800'}`}>
                      {slot}
                    </div>
                    {isCurrent && (
                      <span className="text-xs bg-primary-100 text-primary-600 px-2.5 py-1 rounded-full font-medium animate-pulse">
                        Maintenant
                      </span>
                    )}
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-sm text-gray-500 font-medium">{slotOrders.length} commande{slotOrders.length > 1 ? 's' : ''}</span>
                  </div>

                  {/* Orders for this slot - grid on desktop */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {slotOrders.map(o => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        onClick={() => setSelectedOrder(o)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

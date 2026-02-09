import { useMemo, useRef, useEffect } from 'react';
import { formatPrice } from '@foodtruck/shared';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';

interface TimelineViewProps {
  orders: OrderWithItemsAndOptions[];
  currentSlotStr: string;
  slotInterval: number;
  isToday: boolean;
  onOrderClick: (order: OrderWithItemsAndOptions) => void;
}

// Generate all time slots for service hours (configurable)
function generateTimeSlots(startHour: number, endHour: number, interval: number): string[] {
  const slots: string[] = [];
  for (let h = startHour; h <= endHour; h++) {
    for (let m = 0; m < 60; m += interval) {
      // Stop at end hour with minute 0
      if (h === endHour && m > 0) break;
      slots.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  }
  return slots;
}

// Get status colors - harmonized with design system
function getStatusColors(status: string) {
  switch (status) {
    case 'pending':
      return {
        bg: 'bg-warning-50',
        border: 'border-warning-500',
        dot: 'bg-warning-500',
        text: 'text-warning-600',
        ring: 'ring-warning-100',
      };
    case 'confirmed':
      return {
        bg: 'bg-info-50',
        border: 'border-info-500',
        dot: 'bg-info-500',
        text: 'text-info-600',
        ring: 'ring-info-100',
      };
    case 'ready':
      return {
        bg: 'bg-success-50',
        border: 'border-success-500',
        dot: 'bg-success-500',
        text: 'text-success-600',
        ring: 'ring-success-100',
      };
    case 'picked_up':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        dot: 'bg-gray-400',
        text: 'text-gray-600',
        ring: 'ring-gray-100',
      };
    case 'cancelled':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        dot: 'bg-gray-400',
        text: 'text-gray-600',
        ring: 'ring-gray-100',
      };
    case 'no_show':
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        dot: 'bg-gray-400',
        text: 'text-gray-600',
        ring: 'ring-gray-100',
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-300',
        dot: 'bg-gray-400',
        text: 'text-gray-600',
        ring: 'ring-gray-100',
      };
  }
}

export function TimelineView({
  orders,
  currentSlotStr,
  slotInterval,
  isToday,
  onOrderClick,
}: TimelineViewProps) {
  const currentSlotRef = useRef<HTMLDivElement>(null);

  // Generate slots from 10:00 to 22:00 (typical foodtruck hours)
  const timeSlots = useMemo(() => generateTimeSlots(10, 22, slotInterval), [slotInterval]);

  // Group orders by time slot
  const ordersBySlot = useMemo(() => {
    const map: Record<string, OrderWithItemsAndOptions[]> = {};

    orders.forEach((order) => {
      const pickupDate = new Date(order.pickup_time);
      const hour = pickupDate.getHours().toString().padStart(2, '0');
      const minute = pickupDate.getMinutes();
      const slot = Math.floor(minute / slotInterval) * slotInterval;
      const slotKey = `${hour}:${slot.toString().padStart(2, '0')}`;

      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(order);
    });

    // Sort orders within each slot by created_at
    Object.keys(map).forEach((key) => {
      map[key].sort(
        (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
    });

    return map;
  }, [orders, slotInterval]);

  // Scroll to current slot on mount
  useEffect(() => {
    if (isToday && currentSlotRef.current) {
      currentSlotRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isToday]);

  // Count orders by status for a slot
  const getSlotStats = (slotOrders: OrderWithItemsAndOptions[]) => {
    const pending = slotOrders.filter((o) => o.status === 'pending').length;
    const confirmed = slotOrders.filter((o) => o.status === 'confirmed').length;
    const ready = slotOrders.filter((o) => o.status === 'ready').length;
    return { pending, confirmed, ready, total: slotOrders.length };
  };

  return (
    <div className="relative overflow-x-hidden">
      {/* Timeline container */}
      <div className="space-y-0 pb-[env(safe-area-inset-bottom)]">
        {timeSlots.map((slot, index) => {
          const slotOrders = ordersBySlot[slot] || [];
          const isCurrent = isToday && slot === currentSlotStr;
          const isPast = isToday && slot < currentSlotStr;
          const stats = getSlotStats(slotOrders);
          const hasOrders = slotOrders.length > 0;

          return (
            <div
              key={slot}
              ref={isCurrent ? currentSlotRef : undefined}
              className={`relative flex ${hasOrders ? 'min-h-[80px]' : 'min-h-[36px]'}`}
            >
              {/* Time label column */}
              <div
                className={`w-14 sm:w-20 flex-shrink-0 text-right pr-3 sm:pr-4 pt-2 text-sm font-medium tabular-nums ${
                  isCurrent
                    ? 'text-primary-600 font-semibold'
                    : isPast
                      ? 'text-gray-300'
                      : hasOrders
                        ? 'text-gray-700'
                        : 'text-gray-400'
                }`}
              >
                {slot}
              </div>

              {/* Timeline line and dot */}
              <div className="relative w-8 flex-shrink-0 flex flex-col items-center">
                {/* Vertical line */}
                <div
                  className={`absolute top-0 bottom-0 w-px ${
                    isCurrent ? 'bg-primary-300' : isPast ? 'bg-gray-100' : 'bg-gray-200'
                  }`}
                />

                {/* Dot or current indicator */}
                {isCurrent ? (
                  <div className="relative z-10 mt-2">
                    <div className="w-4 h-4 bg-primary-500 rounded-full ring-4 ring-primary-100 shadow-sm" />
                    <div className="absolute inset-0 w-4 h-4 bg-primary-500 rounded-full animate-ping opacity-30" />
                  </div>
                ) : hasOrders ? (
                  <div
                    className={`relative z-10 mt-2.5 w-3 h-3 rounded-full shadow-sm ring-2 ring-white ${
                      stats.pending > 0
                        ? 'bg-warning-500'
                        : stats.confirmed > 0
                          ? 'bg-info-500'
                          : stats.ready > 0
                            ? 'bg-success-500'
                            : 'bg-gray-400'
                    }`}
                  />
                ) : (
                  <div
                    className={`relative z-10 mt-3 w-1.5 h-1.5 rounded-full ${
                      isPast ? 'bg-gray-200' : 'bg-gray-300'
                    }`}
                  />
                )}

                {/* Connect to next slot */}
                {index < timeSlots.length - 1 && (
                  <div className={`flex-1 w-px ${isPast ? 'bg-gray-100' : 'bg-gray-200'}`} />
                )}
              </div>

              {/* Orders content */}
              <div
                className={`flex-1 pl-3 sm:pl-4 pb-3 pt-1 min-w-0 overflow-hidden ${
                  isCurrent
                    ? 'bg-gradient-to-r from-primary-50/80 to-transparent rounded-l-2xl'
                    : ''
                }`}
              >
                {isCurrent && (
                  <span className="inline-flex items-center gap-1.5 text-xs bg-primary-500 text-white px-2.5 py-1 rounded-full mb-2 font-medium shadow-sm">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Maintenant
                  </span>
                )}

                {hasOrders ? (
                  <div className="space-y-2">
                    {slotOrders.map((order) => {
                      const status = order.status || 'pending';
                      const colors = getStatusColors(status);
                      const isDone = ['picked_up', 'cancelled', 'no_show'].includes(status);

                      return (
                        <div
                          key={order.id}
                          onClick={() => onOrderClick(order)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onOrderClick(order);
                            }
                          }}
                          tabIndex={0}
                          role="button"
                          aria-label={`Commande de ${order.customer_name}`}
                          className={`${colors.bg} border ${colors.border} rounded-xl p-3 cursor-pointer
                            min-h-[72px] overflow-hidden
                            hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]
                            transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${isDone ? 'opacity-50' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-2.5 h-2.5 rounded-full ${colors.dot} ring-2 ${colors.ring} flex-shrink-0`}
                              />
                              <span
                                className={`font-semibold truncate ${isDone ? 'text-gray-500' : 'text-gray-900'}`}
                              >
                                {order.customer_name}
                              </span>
                              {status === 'cancelled' && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                                  Refusée
                                </span>
                              )}
                            </div>
                            <span
                              className={`font-bold text-sm flex-shrink-0 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}
                            >
                              {formatPrice(order.total_amount)}
                            </span>
                          </div>
                          <div
                            className={`text-sm mt-1.5 truncate ${isDone ? 'text-gray-400' : 'text-gray-600'}`}
                          >
                            {order.order_items.map((item, idx) => (
                              <span key={idx}>
                                {idx > 0 && ', '}
                                <span
                                  className={`font-medium ${isDone ? 'text-gray-500' : 'text-gray-700'}`}
                                >
                                  {item.quantity}x
                                </span>{' '}
                                {item.menu_item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

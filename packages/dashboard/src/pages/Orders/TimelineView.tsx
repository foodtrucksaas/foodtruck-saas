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

// Get status colors
function getStatusColors(status: string) {
  switch (status) {
    case 'pending':
      return { bg: 'bg-yellow-100', border: 'border-yellow-400', dot: 'bg-yellow-400', text: 'text-yellow-700' };
    case 'confirmed':
      return { bg: 'bg-blue-100', border: 'border-blue-400', dot: 'bg-blue-400', text: 'text-blue-700' };
    case 'ready':
      return { bg: 'bg-purple-100', border: 'border-purple-400', dot: 'bg-purple-400', text: 'text-purple-700' };
    case 'picked_up':
      return { bg: 'bg-gray-50', border: 'border-gray-300', dot: 'bg-gray-400', text: 'text-gray-500' };
    case 'cancelled':
      return { bg: 'bg-red-50', border: 'border-red-300', dot: 'bg-red-400', text: 'text-red-600' };
    case 'no_show':
      return { bg: 'bg-gray-50', border: 'border-gray-300', dot: 'bg-gray-400', text: 'text-gray-500' };
    default:
      return { bg: 'bg-gray-100', border: 'border-gray-300', dot: 'bg-gray-400', text: 'text-gray-600' };
  }
}

export function TimelineView({ orders, currentSlotStr, slotInterval, isToday, onOrderClick }: TimelineViewProps) {
  const currentSlotRef = useRef<HTMLDivElement>(null);

  // Generate slots from 10:00 to 22:00 (typical foodtruck hours)
  const timeSlots = useMemo(() => generateTimeSlots(10, 22, slotInterval), [slotInterval]);

  // Group orders by time slot
  const ordersBySlot = useMemo(() => {
    const map: Record<string, OrderWithItemsAndOptions[]> = {};

    orders.forEach(order => {
      const pickupDate = new Date(order.pickup_time);
      const hour = pickupDate.getHours().toString().padStart(2, '0');
      const minute = pickupDate.getMinutes();
      const slot = Math.floor(minute / slotInterval) * slotInterval;
      const slotKey = `${hour}:${slot.toString().padStart(2, '0')}`;

      if (!map[slotKey]) map[slotKey] = [];
      map[slotKey].push(order);
    });

    // Sort orders within each slot by created_at
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) =>
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
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
    const pending = slotOrders.filter(o => o.status === 'pending').length;
    const confirmed = slotOrders.filter(o => o.status === 'confirmed').length;
    const ready = slotOrders.filter(o => o.status === 'ready').length;
    return { pending, confirmed, ready, total: slotOrders.length };
  };

  return (
    <div className="relative">
      {/* Timeline container */}
      <div className="space-y-0">
        {timeSlots.map((slot, index) => {
          const slotOrders = ordersBySlot[slot] || [];
          const isCurrent = isToday && slot === currentSlotStr;
          const isPast = isToday && slot < currentSlotStr;
          const stats = getSlotStats(slotOrders);

          return (
            <div
              key={slot}
              ref={isCurrent ? currentSlotRef : undefined}
              className={`relative flex ${slotOrders.length === 0 ? 'min-h-[48px]' : 'min-h-[72px]'}`}
            >
              {/* Time label column */}
              <div className={`w-12 sm:w-16 flex-shrink-0 text-right pr-2 sm:pr-4 pt-2 text-sm sm:text-base ${
                isCurrent
                  ? 'font-bold text-primary-600'
                  : isPast
                  ? 'text-gray-400'
                  : 'text-gray-600 font-medium'
              }`}>
                {slot}
              </div>

              {/* Timeline line and dot */}
              <div className="relative w-6 sm:w-8 flex-shrink-0 flex flex-col items-center">
                {/* Vertical line */}
                <div className={`absolute top-0 bottom-0 w-0.5 ${
                  isCurrent ? 'bg-primary-400' : isPast ? 'bg-gray-200' : 'bg-gray-300'
                }`} />

                {/* Dot or current indicator */}
                {isCurrent ? (
                  <div className="relative z-10 mt-2.5">
                    <div className="w-4 h-4 bg-primary-500 rounded-full ring-4 ring-primary-100 animate-pulse" />
                  </div>
                ) : slotOrders.length > 0 ? (
                  <div className={`relative z-10 mt-3 w-2.5 h-2.5 rounded-full ${
                    stats.pending > 0 ? 'bg-yellow-400' :
                    stats.confirmed > 0 || stats.ready > 0 ? 'bg-blue-400' :
                    'bg-gray-400'
                  }`} />
                ) : (
                  <div className={`relative z-10 mt-3.5 w-1.5 h-1.5 rounded-full ${
                    isPast ? 'bg-gray-200' : 'bg-gray-300'
                  }`} />
                )}

                {/* Connect to next slot */}
                {index < timeSlots.length - 1 && (
                  <div className={`flex-1 w-0.5 ${
                    isPast ? 'bg-gray-200' : 'bg-gray-300'
                  }`} />
                )}
              </div>

              {/* Orders content */}
              <div className={`flex-1 pl-2 sm:pl-4 pb-2 pt-1 ${
                isCurrent ? 'bg-primary-50/50 -mx-2 sm:-mx-4 px-4 sm:px-8 rounded-lg' : ''
              }`}>
                {isCurrent && (
                  <span className="inline-block text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full mb-2 font-medium">
                    Maintenant
                  </span>
                )}

                {slotOrders.length > 0 ? (
                  <div className="space-y-2">
                    {slotOrders.map(order => {
                      const status = order.status || 'pending';
                      const colors = getStatusColors(status);
                      const isDone = ['picked_up', 'cancelled', 'no_show'].includes(status);

                      return (
                        <div
                          key={order.id}
                          onClick={() => onOrderClick(order)}
                          className={`${colors.bg} ${colors.border} border-l-4 rounded-r-lg p-2 sm:p-3 cursor-pointer
                            hover:shadow-md transition-all duration-200 ${isDone ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full ${colors.dot} flex-shrink-0`} />
                              <span className={`font-semibold truncate ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>
                                {order.customer_name}
                              </span>
                            </div>
                            <span className={`font-bold flex-shrink-0 ${isDone ? 'text-gray-500' : 'text-gray-900'}`}>
                              {formatPrice(order.total_amount)}
                            </span>
                          </div>
                          <div className={`text-sm mt-1 truncate ${isDone ? 'text-gray-400' : 'text-gray-600'}`}>
                            {order.order_items.map((item, idx) => (
                              <span key={idx}>
                                {idx > 0 && ', '}
                                <span className="font-medium">{item.quantity}x</span> {item.menu_item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !isCurrent && (
                  <div className={`text-sm ${isPast ? 'text-gray-300' : 'text-gray-400'} pt-1.5`}>
                    —
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

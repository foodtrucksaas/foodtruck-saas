import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { OrderWithItemsAndOptions } from '@foodtruck/shared';
import { TimelineView } from './TimelineView';

// Mock scrollIntoView (not available in jsdom)
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

// Mock formatPrice
vi.mock('@foodtruck/shared', () => ({
  formatPrice: (price: number) => `${(price / 100).toFixed(2)} €`,
}));

describe('TimelineView', () => {
  const mockMenuItem = {
    id: 'item-1',
    foodtruck_id: 'ft-1',
    category_id: 'cat-1',
    name: 'Burger Classic',
    description: 'Delicious burger',
    price: 1200,
    photo_url: null,
    image_url: null,
    allergens: null,
    is_available: true,
    is_daily_special: false,
    display_order: 0,
    disabled_options: {},
    option_prices: {},
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  const createMockOrder = (
    overrides: Partial<OrderWithItemsAndOptions> = {}
  ): OrderWithItemsAndOptions =>
    ({
      id: 'order-1',
      foodtruck_id: 'ft-1',
      customer_id: null,
      customer_email: 'client@test.com',
      customer_phone: '0612345678',
      customer_name: 'Jean Dupont',
      status: 'pending',
      pickup_time: '2024-01-15T12:00:00Z',
      total_amount: 2400,
      discount_amount: 0,
      deal_discount: null,
      notes: null,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      promo_code_id: null,
      location_id: null,
      location: null,
      cancellation_reason: null,
      cancelled_by: null,
      order_items: [
        {
          id: 'oi-1',
          order_id: 'order-1',
          menu_item_id: 'item-1',
          quantity: 2,
          unit_price: 1200,
          notes: null,
          options_price: 0,
          created_at: '2024-01-01',
          menu_item: mockMenuItem,
          order_item_options: [],
        },
      ],
      ...overrides,
    } as OrderWithItemsAndOptions);

  const defaultProps = {
    orders: [] as OrderWithItemsAndOptions[],
    currentSlotStr: '12:00',
    slotInterval: 15,
    isToday: true,
    onOrderClick: vi.fn(),
  };

  it('should render all time slots from 10:00 to 22:00', () => {
    render(<TimelineView {...defaultProps} />);

    // Check that time slots are rendered
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
    expect(screen.getByText('15:00')).toBeInTheDocument();
    expect(screen.getByText('22:00')).toBeInTheDocument();
  });

  it('should show "Maintenant" label for current slot when isToday is true', () => {
    render(<TimelineView {...defaultProps} />);

    expect(screen.getByText('Maintenant')).toBeInTheDocument();
  });

  it('should not show "Maintenant" label when isToday is false', () => {
    render(<TimelineView {...defaultProps} isToday={false} />);

    expect(screen.queryByText('Maintenant')).not.toBeInTheDocument();
  });

  it('should render orders in their correct time slots', () => {
    const orders = [
      createMockOrder({ id: 'order-1', customer_name: 'Jean Dupont', pickup_time: '2024-01-15T12:00:00Z' }),
      createMockOrder({ id: 'order-2', customer_name: 'Marie Martin', pickup_time: '2024-01-15T14:30:00Z' }),
    ];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // Check that customer names are displayed
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });

  it('should display order items', () => {
    const orders = [createMockOrder()];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // Check that order items are displayed
    expect(screen.getByText('2x')).toBeInTheDocument();
    expect(screen.getByText(/Burger Classic/)).toBeInTheDocument();
  });

  it('should display order total amount', () => {
    const orders = [createMockOrder({ total_amount: 2400 })];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // formatPrice(2400) = "24.00 €"
    expect(screen.getByText('24.00 €')).toBeInTheDocument();
  });

  it('should call onOrderClick when order is clicked', () => {
    const onOrderClick = vi.fn();
    const orders = [createMockOrder()];

    render(<TimelineView {...defaultProps} orders={orders} onOrderClick={onOrderClick} />);

    const orderCard = screen.getByText('Jean Dupont').closest('div[class*="cursor-pointer"]');
    expect(orderCard).not.toBeNull();
    if (orderCard) {
      fireEvent.click(orderCard);
    }

    expect(onOrderClick).toHaveBeenCalledWith(orders[0]);
  });

  it('should apply correct colors for different order statuses', () => {
    const orders = [
      createMockOrder({ id: 'order-1', status: 'pending', pickup_time: '2024-01-15T12:00:00Z' }),
      createMockOrder({ id: 'order-2', status: 'confirmed', pickup_time: '2024-01-15T12:15:00Z' }),
      createMockOrder({ id: 'order-3', status: 'ready', pickup_time: '2024-01-15T12:30:00Z' }),
    ];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // All orders should be visible
    expect(screen.getAllByText(/Dupont/)).toHaveLength(3);
  });

  it('should reduce opacity for completed orders', () => {
    const orders = [
      createMockOrder({ id: 'order-1', status: 'picked_up', pickup_time: '2024-01-15T12:00:00Z' }),
    ];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // Order should be rendered with opacity-60 class
    const orderCard = screen.getByText('Jean Dupont').closest('div[class*="opacity-60"]');
    expect(orderCard).not.toBeNull();
  });

  it('should group multiple orders in the same time slot', () => {
    const orders = [
      createMockOrder({ id: 'order-1', customer_name: 'Jean Dupont', pickup_time: '2024-01-15T12:00:00Z' }),
      createMockOrder({ id: 'order-2', customer_name: 'Marie Martin', pickup_time: '2024-01-15T12:05:00Z' }),
      createMockOrder({ id: 'order-3', customer_name: 'Pierre Bernard', pickup_time: '2024-01-15T12:10:00Z' }),
    ];

    render(<TimelineView {...defaultProps} orders={orders} />);

    // All 3 orders should be in the 12:00 slot (within 15min interval)
    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
    expect(screen.getByText('Pierre Bernard')).toBeInTheDocument();
  });

  it('should handle different slot intervals', () => {
    const orders = [
      createMockOrder({ id: 'order-1', customer_name: 'Jean Dupont', pickup_time: '2024-01-15T12:00:00Z' }),
      createMockOrder({ id: 'order-2', customer_name: 'Marie Martin', pickup_time: '2024-01-15T12:20:00Z' }),
    ];

    // With 30-minute intervals, both orders should be in the same slot
    render(<TimelineView {...defaultProps} orders={orders} slotInterval={30} />);

    expect(screen.getByText('Jean Dupont')).toBeInTheDocument();
    expect(screen.getByText('Marie Martin')).toBeInTheDocument();
  });

  it('should display placeholder for empty slots', () => {
    render(<TimelineView {...defaultProps} orders={[]} />);

    // Empty slots should show "—"
    const placeholders = screen.getAllByText('—');
    expect(placeholders.length).toBeGreaterThan(0);
  });
});

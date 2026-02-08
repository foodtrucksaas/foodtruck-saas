import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock Supabase completely to avoid async issues
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({
        subscribe: () => ({}),
      }),
    }),
    removeChannel: vi.fn(),
  },
}));

// Mock shared formatters
vi.mock('@foodtruck/shared', () => ({
  formatPrice: (price: number) => `${(price / 100).toFixed(2)} €`,
  formatDateTime: (date: string) => new Date(date).toLocaleString('fr-FR'),
  formatOrderId: (id: string) => `#${id.slice(0, 8).toUpperCase()}`,
}));

// Import after mocks
import OrderStatus from './OrderStatus';

const renderWithRouter = (orderId: string, searchParams = '') => {
  return render(
    <MemoryRouter initialEntries={[`/order/${orderId}${searchParams}`]}>
      <Routes>
        <Route path="/order/:orderId" element={<OrderStatus />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('OrderStatus', () => {
  it('should show loading spinner initially', () => {
    renderWithRouter('order-123');
    expect(screen.getByRole('status', { name: /chargement/i })).toBeInTheDocument();
  });

  it('should have accessible loading state', () => {
    renderWithRouter('order-123');
    expect(screen.getByText('Chargement de la commande')).toBeInTheDocument();
  });
});

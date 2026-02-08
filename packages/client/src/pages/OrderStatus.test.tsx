import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Simple mock that always returns null data
// More complex integration tests should be done with a real supabase test instance
const mockChannel = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockResolvedValue('ok'),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
    channel: () => mockChannel,
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show order not found when data is null', async () => {
    renderWithRouter('order-123');

    await waitFor(() => {
      expect(screen.getByText('Commande non trouvee')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /retour/i })).toBeInTheDocument();
  });

  it('should have a link back to home', async () => {
    renderWithRouter('order-123');

    await waitFor(() => {
      expect(screen.getByText('Commande non trouvee')).toBeInTheDocument();
    });

    const link = screen.getByRole('link', { name: /retour/i });
    expect(link).toHaveAttribute('href', '/');
  });
});

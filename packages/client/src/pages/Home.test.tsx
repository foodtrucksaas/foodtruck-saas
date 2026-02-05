import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from './Home';

// Mock Supabase
const mockFrom = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

// Mock OptimizedImage
vi.mock('../components/OptimizedImage', () => ({
  OptimizedImage: ({ alt, fallback }: { alt: string; fallback?: React.ReactNode }) =>
    fallback || <img alt={alt} />,
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    // Setup mock that never resolves
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => new Promise(() => {}),
        }),
      }),
    });

    renderWithRouter(<Home />);

    expect(screen.getByText('FoodTruck')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Rechercher un food truck...')).toBeInTheDocument();
  });

  it('should display foodtrucks after loading', async () => {
    const mockFoodtrucks = [
      {
        id: 'ft-1',
        name: 'Pizza Truck',
        cuisine_types: ['Pizza', 'Italien'],
        description: 'Les meilleures pizzas de la ville',
        logo_url: null,
        is_active: true,
      },
      {
        id: 'ft-2',
        name: 'Burger King Mobile',
        cuisine_types: ['Burgers', 'Américain'],
        description: 'Burgers gourmets',
        logo_url: 'https://example.com/logo.jpg',
        is_active: true,
      },
    ];

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFoodtrucks }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Truck')).toBeInTheDocument();
    });

    expect(screen.getByText('Burger King Mobile')).toBeInTheDocument();
    expect(screen.getByText('Pizza • Italien')).toBeInTheDocument();
    expect(screen.getByText('Les meilleures pizzas de la ville')).toBeInTheDocument();
  });

  it('should show empty state when no foodtrucks', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Aucun food truck trouvé')).toBeInTheDocument();
    });
  });

  it('should filter foodtrucks by name', async () => {
    const mockFoodtrucks = [
      { id: 'ft-1', name: 'Pizza Truck', cuisine_types: ['Pizza'], is_active: true },
      { id: 'ft-2', name: 'Burger Mobile', cuisine_types: ['Burgers'], is_active: true },
    ];

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFoodtrucks }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Truck')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Rechercher un food truck...');
    fireEvent.change(searchInput, { target: { value: 'pizza' } });

    expect(screen.getByText('Pizza Truck')).toBeInTheDocument();
    expect(screen.queryByText('Burger Mobile')).not.toBeInTheDocument();
  });

  it('should filter foodtrucks by cuisine type', async () => {
    const mockFoodtrucks = [
      { id: 'ft-1', name: 'Pizza Truck', cuisine_types: ['Pizza', 'Italien'], is_active: true },
      { id: 'ft-2', name: 'Taco Stand', cuisine_types: ['Mexicain'], is_active: true },
    ];

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFoodtrucks }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Pizza Truck')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Rechercher un food truck...');
    fireEvent.change(searchInput, { target: { value: 'mexicain' } });

    expect(screen.getByText('Taco Stand')).toBeInTheDocument();
    expect(screen.queryByText('Pizza Truck')).not.toBeInTheDocument();
  });

  it('should have link to order history', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [] }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Mes commandes')).toBeInTheDocument();
    });

    const ordersLink = screen.getByText('Mes commandes').closest('a');
    expect(ordersLink).toHaveAttribute('href', '/orders');
  });

  it('should link foodtruck cards to their detail pages', async () => {
    const mockFoodtrucks = [
      { id: 'ft-123', name: 'Test Truck', cuisine_types: [], is_active: true },
    ];

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFoodtrucks }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Truck')).toBeInTheDocument();
    });

    const link = screen.getByText('Test Truck').closest('a');
    expect(link).toHaveAttribute('href', '/ft-123');
  });

  it('should handle null data gracefully', async () => {
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: null }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Aucun food truck trouvé')).toBeInTheDocument();
    });
  });

  it('should display non spécifié for foodtrucks without cuisine types', async () => {
    const mockFoodtrucks = [
      { id: 'ft-1', name: 'Mystery Truck', cuisine_types: null, is_active: true },
    ];

    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockFoodtrucks }),
        }),
      }),
    });

    renderWithRouter(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Mystery Truck')).toBeInTheDocument();
    });

    expect(screen.getByText('Non spécifié')).toBeInTheDocument();
  });
});

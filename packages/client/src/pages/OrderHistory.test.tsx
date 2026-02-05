import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrderHistory from './OrderHistory';

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [] }),
          }),
        }),
      }),
    }),
  },
}));

const renderWithRouter = (component: React.ReactNode) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('OrderHistory Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should render page with title', () => {
    renderWithRouter(<OrderHistory />);

    expect(screen.getByText('Mes commandes')).toBeInTheDocument();
  });

  it('should render email input field', () => {
    renderWithRouter(<OrderHistory />);

    expect(screen.getByPlaceholderText('vous@exemple.com')).toBeInTheDocument();
  });

  it('should render search button', () => {
    renderWithRouter(<OrderHistory />);

    expect(screen.getByRole('button', { name: 'Rechercher' })).toBeInTheDocument();
  });

  it('should have back link to home', () => {
    renderWithRouter(<OrderHistory />);

    const backLink = screen.getByLabelText('Retour');
    expect(backLink).toHaveAttribute('href', '/');
  });

  it('should render votre email label', () => {
    renderWithRouter(<OrderHistory />);

    expect(screen.getByText('Votre email')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactNode } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';

const mockAccessState = vi.hoisted(() => ({ value: 'full' as string }));

vi.mock('../contexts/SubscriptionContext', () => ({
  useSubscription: () => ({
    accessState: mockAccessState.value,
    subscription: null,
    isLoading: false,
    daysRemainingInTrial: null,
    refetch: vi.fn(),
  }),
}));

// Inline SubscriptionGuard (same logic as in App.tsx)
const DEGRADED_ALLOWED_ROUTES = ['/billing', '/settings'];

function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { accessState } = useSubscription();
  const location = useLocation();

  if (accessState === 'degraded' && !DEGRADED_ALLOWED_ROUTES.includes(location.pathname)) {
    return <Navigate to="/billing" replace state={{ degraded: true }} />;
  }

  return <>{children}</>;
}

function TestPage({ name }: { name: string }) {
  return <div data-testid="page">{name}</div>;
}

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/"
          element={
            <SubscriptionGuard>
              <TestPage name="dashboard" />
            </SubscriptionGuard>
          }
        />
        <Route
          path="/menu"
          element={
            <SubscriptionGuard>
              <TestPage name="menu" />
            </SubscriptionGuard>
          }
        />
        <Route
          path="/orders"
          element={
            <SubscriptionGuard>
              <TestPage name="orders" />
            </SubscriptionGuard>
          }
        />
        <Route path="/billing" element={<TestPage name="billing" />} />
        <Route path="/settings" element={<TestPage name="settings" />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SubscriptionGuard', () => {
  it('allows access when full', () => {
    mockAccessState.value = 'full';
    renderWithRouter('/');
    expect(screen.getByTestId('page').textContent).toBe('dashboard');
  });

  it('allows menu access when full', () => {
    mockAccessState.value = 'full';
    renderWithRouter('/menu');
    expect(screen.getByTestId('page').textContent).toBe('menu');
  });

  it('redirects to /billing when degraded on protected route', () => {
    mockAccessState.value = 'degraded';
    renderWithRouter('/');
    expect(screen.getByTestId('page').textContent).toBe('billing');
  });

  it('redirects /menu to /billing when degraded', () => {
    mockAccessState.value = 'degraded';
    renderWithRouter('/menu');
    expect(screen.getByTestId('page').textContent).toBe('billing');
  });

  it('redirects /orders to /billing when degraded', () => {
    mockAccessState.value = 'degraded';
    renderWithRouter('/orders');
    expect(screen.getByTestId('page').textContent).toBe('billing');
  });

  it('allows /billing when degraded', () => {
    mockAccessState.value = 'degraded';
    renderWithRouter('/billing');
    expect(screen.getByTestId('page').textContent).toBe('billing');
  });

  it('allows /settings when degraded', () => {
    mockAccessState.value = 'degraded';
    renderWithRouter('/settings');
    expect(screen.getByTestId('page').textContent).toBe('settings');
  });
});

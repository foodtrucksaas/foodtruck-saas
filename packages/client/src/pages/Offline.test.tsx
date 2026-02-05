import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Offline from './Offline';

// Mock OptimizedImage
vi.mock('../components/OptimizedImage', () => ({
  OptimizedImage: ({ alt, fallback }: { alt: string; fallback?: React.ReactNode }) =>
    fallback || <img alt={alt} />,
}));

describe('Offline Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();

    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: () => false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('should render offline message', () => {
    render(<Offline />);

    expect(screen.getByText('Mode hors ligne')).toBeInTheDocument();
    expect(screen.getByText("Vous semblez etre deconnecte d'Internet")).toBeInTheDocument();
    expect(screen.getByText('Pas de connexion')).toBeInTheDocument();
  });

  it('should have retry button', () => {
    render(<Offline />);

    expect(screen.getByText('Reessayer')).toBeInTheDocument();
  });

  it('should show verification state when retrying offline', () => {
    render(<Offline />);

    const retryButton = screen.getByText('Reessayer');
    fireEvent.click(retryButton);

    expect(screen.getByText('Verification...')).toBeInTheDocument();
  });

  it('should reset retry state after timeout when still offline', () => {
    render(<Offline />);

    const retryButton = screen.getByText('Reessayer');
    fireEvent.click(retryButton);

    expect(screen.getByText('Verification...')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.getByText('Reessayer')).toBeInTheDocument();
  });

  it('should not crash with invalid localStorage data', () => {
    localStorage.setItem('lastVisitedFoodtruck', 'invalid-json');

    expect(() => render(<Offline />)).not.toThrow();
    expect(screen.getByText('Mode hors ligne')).toBeInTheDocument();
  });

  it('should not display cached section when no cache', () => {
    render(<Offline />);

    expect(screen.queryByText('Dernier food truck visite')).not.toBeInTheDocument();
  });

  it('should display tips section', () => {
    render(<Offline />);

    expect(screen.getByText('En attendant...')).toBeInTheDocument();
    expect(screen.getByText('Verifiez votre emplacement')).toBeInTheDocument();
    expect(screen.getByText('Patientez quelques instants')).toBeInTheDocument();
  });

  it('should display footer message', () => {
    render(<Offline />);

    expect(
      screen.getByText("L'application fonctionnera des que la connexion sera retablie")
    ).toBeInTheDocument();
  });

  it('should disable retry button while retrying', () => {
    render(<Offline />);

    const retryButton = screen.getByText('Reessayer');
    fireEvent.click(retryButton);

    const button = screen.getByText('Verification...').closest('button');
    expect(button).toBeDisabled();
  });
});

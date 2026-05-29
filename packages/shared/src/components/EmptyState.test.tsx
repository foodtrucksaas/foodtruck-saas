import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="Aucune commande" />);
    expect(screen.getByText('Aucune commande')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Titre" description="Quelques détails" />);
    expect(screen.getByText('Quelques détails')).toBeInTheDocument();
  });

  it('does not render description when omitted', () => {
    const { container } = render(<EmptyState title="Titre" />);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });

  it('renders illustration with role=img and aria-label', () => {
    render(<EmptyState illustration="no-orders" title="Aucune commande" />);
    const img = screen.getByRole('img', { name: 'Aucune commande' });
    expect(img).toBeInTheDocument();
    expect(img.querySelector('svg')).toBeInTheDocument();
  });

  it('renders without illustration', () => {
    const { container } = render(<EmptyState title="Titre" />);
    expect(container.querySelector('[role="img"]')).toBeNull();
  });

  it('renders action button when provided', () => {
    const onClick = vi.fn();
    render(<EmptyState title="Titre" action={{ label: 'Ajouter', onClick }} />);
    const button = screen.getByRole('button', { name: 'Ajouter' });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not render action button when omitted', () => {
    render(<EmptyState title="Titre" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies corail color class by default', () => {
    render(<EmptyState illustration="no-orders" title="Titre" />);
    const img = screen.getByRole('img');
    expect(img.className).toContain('text-corail-400');
  });

  it('applies marine color class when specified', () => {
    render(<EmptyState illustration="no-clients" iconColor="marine" title="Titre" />);
    const img = screen.getByRole('img');
    expect(img.className).toContain('text-marine-400');
  });

  it('renders all 9 illustration variants without crashing', () => {
    const ids = [
      'no-orders',
      'no-clients',
      'no-offers',
      'no-menu',
      'no-schedule',
      'no-data',
      'no-campaign',
      'no-invoice',
      'inbox-empty',
    ] as const;
    for (const id of ids) {
      const { unmount } = render(<EmptyState illustration={id} title="Test" />);
      expect(screen.getByRole('img')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders children when provided', () => {
    render(
      <EmptyState title="Titre">
        <span data-testid="child">Custom child</span>
      </EmptyState>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });
});

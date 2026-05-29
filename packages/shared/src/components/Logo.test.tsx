import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Logo } from './Logo';

describe('Logo', () => {
  it('renders with role=img and aria-label', () => {
    render(<Logo />);
    expect(screen.getByRole('img', { name: 'OnMange' })).toBeInTheDocument();
  });

  it('renders full variant with wordmark text', () => {
    render(<Logo variant="full" />);
    const logo = screen.getByRole('img', { name: 'OnMange' });
    expect(logo.textContent).toBe('OnMange');
  });

  it('renders compact variant with wordmark text', () => {
    render(<Logo variant="compact" />);
    const logo = screen.getByRole('img', { name: 'OnMange' });
    expect(logo.textContent).toBe('OnMange');
  });

  it('renders monogram variant with SVG', () => {
    render(<Logo variant="monogram" />);
    const logo = screen.getByRole('img', { name: 'OnMange' });
    expect(logo.querySelector('svg')).toBeInTheDocument();
  });

  it('renders monogram with cutlery icon (fork + knife)', () => {
    render(<Logo variant="monogram" />);
    const logo = screen.getByRole('img', { name: 'OnMange' });
    const svg = logo.querySelector('svg');
    expect(svg?.querySelector('circle')).toBeInTheDocument();
    // Fork and knife are rendered as line/path elements inside rotated groups
    const lines = svg?.querySelectorAll('line');
    expect(lines?.length).toBeGreaterThanOrEqual(4);
  });

  it('applies light theme by default', () => {
    render(<Logo />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.color).toContain('--color-corail-500');
  });

  it('applies dark theme color', () => {
    render(<Logo theme="dark" />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.color).toBe('rgb(255, 255, 255)');
  });

  it('applies size sm', () => {
    render(<Logo size="sm" />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontSize).toBe('18px');
  });

  it('applies size md (default)', () => {
    render(<Logo size="md" />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontSize).toBe('24px');
  });

  it('applies size lg', () => {
    render(<Logo size="lg" />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontSize).toBe('32px');
  });

  it('applies size xl', () => {
    render(<Logo size="xl" />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontSize).toBe('48px');
  });

  it('applies monogram size', () => {
    render(<Logo variant="monogram" size="lg" />);
    const svg = screen.getByRole('img', { name: 'OnMange' }).querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('32');
    expect(svg?.getAttribute('height')).toBe('32');
  });

  it('passes className to wrapper', () => {
    render(<Logo className="my-custom-class" />);
    const logo = screen.getByRole('img', { name: 'OnMange' });
    expect(logo.className).toContain('my-custom-class');
  });

  it('uses letter-spacing -0.02em on wordmark', () => {
    render(<Logo />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.letterSpacing).toBe('-0.02em');
  });

  it('monogram light theme has corail background', () => {
    render(<Logo variant="monogram" theme="light" />);
    const circle = screen.getByRole('img', { name: 'OnMange' }).querySelector('circle');
    expect(circle?.getAttribute('fill')).toContain('--color-corail-500');
  });

  it('monogram dark theme has white background', () => {
    render(<Logo variant="monogram" theme="dark" />);
    const circle = screen.getByRole('img', { name: 'OnMange' }).querySelector('circle');
    expect(circle?.getAttribute('fill')).toBe('#FFFFFF');
  });

  it('wordmark uses Fraunces font-family explicitly', () => {
    render(<Logo />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontFamily).toContain('Fraunces');
  });

  it('wordmark uses font-weight 600', () => {
    render(<Logo />);
    const wordmark = screen.getByRole('img', { name: 'OnMange' }).querySelector('span');
    expect(wordmark?.style.fontWeight).toBe('600');
  });
});

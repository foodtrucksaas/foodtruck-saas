import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Unsubscribe from './Unsubscribe';

const renderWithRouter = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Unsubscribe', () => {
  describe('Invalid Link', () => {
    it('should show invalid link message when email is missing', () => {
      renderWithRouter('/unsubscribe');

      expect(screen.getByText('Lien invalide')).toBeInTheDocument();
      expect(screen.getByText("Ce lien de désabonnement n'est pas valide.")).toBeInTheDocument();
    });

    it('should have link to home page when invalid', () => {
      renderWithRouter('/unsubscribe');

      const homeLink = screen.getByRole('link', { name: "Retour à l'accueil" });
      expect(homeLink).toHaveAttribute('href', '/');
    });

    it('should display alert icon', () => {
      renderWithRouter('/unsubscribe');

      // The AlertCircle icon from lucide-react
      expect(document.querySelector('.lucide-alert-circle')).toBeInTheDocument();
    });
  });
});

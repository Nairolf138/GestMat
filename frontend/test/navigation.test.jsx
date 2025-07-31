import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import NavBar from '../src/NavBar.jsx';
import { MemoryRouter } from 'react-router-dom';
import '../src/i18n.js';

describe('Navigation', () => {
  it('redirects to login when navigating to profile without auth', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('link', { name: 'Profil' })[0]);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('shows login and register links', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('link', { name: 'Connexion' })[0]).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Inscription' })[0]).toBeTruthy();
  });

  it('links to inventory and omits requests', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    );
    const links = screen.getAllByRole('link', { name: 'Inventaire local' });
    expect(links.some((l) => l.getAttribute('href') === '/inventory')).toBe(true);
    expect(screen.queryByRole('link', { name: 'Demandes' })).toBeNull();
  });
});

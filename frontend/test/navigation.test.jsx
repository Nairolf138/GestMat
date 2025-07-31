import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import NavBar from '../src/NavBar.jsx';
import { MemoryRouter } from 'react-router-dom';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Navigation', () => {
  it('navigates to profile page', async () => {
    api.api.mockResolvedValueOnce({ structure: 's1', firstName: 'Bob' });
    api.api.mockResolvedValueOnce([]);
    api.api.mockResolvedValueOnce({});
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('link', { name: 'Profil' })[0]);
    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeTruthy();
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

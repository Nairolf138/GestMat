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
    api.api.mockResolvedValue([]);
    localStorage.setItem('token', 'abc');
    window.history.pushState({}, '', '/');
    render(<App />);
    // starts on equipments page
    expect(screen.getByRole('heading', { name: 'Équipements' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Connexion' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Inscription' })).toBeNull();
    fireEvent.click(screen.getByText('Profil'));
    expect(await screen.findByRole('heading', { name: 'Profil' })).toBeTruthy();
  });

  it('shows login and register links when logged out', () => {
    localStorage.removeItem('token');
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Connexion' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Inscription' })).toBeTruthy();
  });
});

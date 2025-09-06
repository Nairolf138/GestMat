import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import NavBar from '../src/NavBar.jsx';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

describe('NavBar when logged in', () => {
  it('shows private links and account menu', () => {
    const { queryByRole, getByRole } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthContext.Provider value={{ user: { username: 'u' }, setUser: () => {} }}>
          <NavBar />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(queryByRole('link', { name: 'Connexion' })).toBeNull();
    expect(queryByRole('link', { name: 'Inscription' })).toBeNull();
    expect(getByRole('link', { name: 'Inventaire local' })).toBeTruthy();
    expect(getByRole('link', { name: 'Panier' })).toBeTruthy();
    const accountBtn = getByRole('button', { name: 'Compte' });
    expect(accountBtn).toBeTruthy();
    fireEvent.click(accountBtn);
    expect(getByRole('link', { name: 'Profil' })).toBeTruthy();
    expect(getByRole('button', { name: 'Déconnexion' })).toBeTruthy();
  });
});

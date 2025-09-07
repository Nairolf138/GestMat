import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import NavBar from '../src/NavBar.jsx';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

describe('NavBar when logged out', () => {
  it('shows login and register links', () => {
    const { getAllByRole, queryByRole } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user: null, setUser: () => {} }}>
          <NavBar />
        </AuthContext.Provider>
      </MemoryRouter>,
    );
    expect(getAllByRole('link', { name: 'Connexion' })[0]).toBeTruthy();
    expect(getAllByRole('link', { name: 'Inscription' })[0]).toBeTruthy();
    expect(queryByRole('link', { name: 'Inventaire local' })).toBeNull();
    expect(queryByRole('button', { name: 'Déconnexion' })).toBeNull();
  });
});

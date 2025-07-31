import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import PrivateRoute from '../src/PrivateRoute.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

describe('PrivateRoute', () => {
  it('redirects to login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null }}>
        <MemoryRouter initialEntries={['/secret']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path='/secret' element={<PrivateRoute><h1>Secret</h1></PrivateRoute>} />
            <Route path='/login' element={<h1>Connexion</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('renders child when authenticated', () => {
    render(
      <AuthContext.Provider value={{ user: { id: 'u1' } }}>
        <MemoryRouter initialEntries={['/secret']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path='/secret' element={<PrivateRoute><h1>Secret</h1></PrivateRoute>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByRole('heading', { name: 'Secret' })).toBeTruthy();
  });
});

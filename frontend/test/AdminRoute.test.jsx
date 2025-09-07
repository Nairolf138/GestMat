import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminRoute from '../src/AdminRoute.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

describe('AdminRoute', () => {
  it('redirects to login when unauthenticated', () => {
    render(
      <AuthContext.Provider value={{ user: null }}>
        <MemoryRouter
          initialEntries={['/admin']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <h1>Admin</h1>
                </AdminRoute>
              }
            />
            <Route path="/login" element={<h1>Connexion</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('redirects to home when not administrateur', () => {
    render(
      <AuthContext.Provider value={{ user: { id: 'u1', role: 'Utilisateur' } }}>
        <MemoryRouter
          initialEntries={['/admin']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <h1>Admin</h1>
                </AdminRoute>
              }
            />
            <Route path="/" element={<h1>Accueil</h1>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeTruthy();
  });

  it('renders child when administrateur', () => {
    render(
      <AuthContext.Provider
        value={{ user: { id: 'u1', role: 'Administrateur' } }}
      >
        <MemoryRouter
          initialEntries={['/admin']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <h1>Admin</h1>
                </AdminRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    );
    expect(screen.getByRole('heading', { name: 'Admin' })).toBeTruthy();
  });
});

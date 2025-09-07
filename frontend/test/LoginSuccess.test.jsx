import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../src/Login.jsx';
import Home from '../src/Home.jsx';
import PrivateRoute from '../src/PrivateRoute.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Login success', () => {
  it('displays success message after login', async () => {
    api.api.mockResolvedValueOnce({ user: { structure: 's1' } });
    api.api.mockResolvedValueOnce([]);
    api.api.mockResolvedValueOnce([]);
    function Wrapper({ children }) {
      const [user, setUser] = useState(null);
      return (
        <AuthContext.Provider value={{ user, setUser }}>
          {children}
        </AuthContext.Provider>
      );
    }
    render(
      <Wrapper>
        <MemoryRouter
          initialEntries={['/login']}
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Home />
                </PrivateRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </Wrapper>,
    );
    fireEvent.change(screen.getByLabelText('Utilisateur'), {
      target: { value: 'bob' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'pw' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: 'Se connecter' }).closest('form'),
    );
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(
      await screen.findByRole('heading', { name: 'Accueil' }),
    ).toBeTruthy();
    expect(screen.getByText('Connexion réussie')).toBeTruthy();
  });
});

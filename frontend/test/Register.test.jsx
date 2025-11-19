import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Register from '../src/Register.jsx';
import Login from '../src/Login.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';
import { GlobalContext } from '../src/GlobalContext.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import { ADMIN_ROLE, AUTRE_ROLE } from '../roles';

describe('Register', () => {
  it('marks username invalid on server error', async () => {
    api.api.mockRejectedValue(new Error('Username already exists'));
    const { container, getByText } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ roles: [ADMIN_ROLE, AUTRE_ROLE], structures: [] }}
        >
          <Register />
        </GlobalContext.Provider>
      </MemoryRouter>,
    );
    fireEvent.change(container.querySelector('input[name="username"]'), {
      target: { value: 'bob' },
    });
    fireEvent.change(container.querySelector('input[name="password"]'), {
      target: { value: 'pw' },
    });
    fireEvent.change(container.querySelector('select[name="role"]'), {
      target: { value: AUTRE_ROLE },
    });
    fireEvent.submit(getByText("S'inscrire").closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(container.querySelector('input[name="username"]').className).toMatch(
      'is-invalid',
    );
  });

  it('redirects to login on successful registration', async () => {
    api.api.mockReset();
    api.api.mockResolvedValueOnce({});
    render(
      <MemoryRouter
        initialEntries={['/register']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ roles: [ADMIN_ROLE, AUTRE_ROLE], structures: [] }}
        >
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route
              path="/login"
              element={
                <AuthContext.Provider value={{ setUser: () => {} }}>
                  <Login />
                </AuthContext.Provider>
              }
            />
          </Routes>
        </GlobalContext.Provider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText('Utilisateur'), {
      target: { value: 'bob' },
    });
    fireEvent.change(screen.getByLabelText('Mot de passe'), {
      target: { value: 'pw' },
    });
    fireEvent.change(screen.getByLabelText('Rôle'), {
      target: { value: AUTRE_ROLE },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: "S'inscrire" }).closest('form'),
    );
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(
      await screen.findByRole('heading', { name: 'Connexion' }),
    ).toBeTruthy();
    expect(await screen.findByText('Inscription réussie')).toBeTruthy();
  });
});

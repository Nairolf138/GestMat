import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../src/Login.jsx';
import Equipments from '../src/Equipments.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';


describe('Login success', () => {
  it('displays success message after login', async () => {
    api.api.mockResolvedValueOnce({ token: 'abc' });
    api.api.mockResolvedValueOnce({ structure: 's1' });
    api.api.mockResolvedValueOnce([]);
    localStorage.removeItem('token');
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Equipments />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Utilisateur'), { target: { value: 'bob' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'pw' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Se connecter' }).closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Inventaire local' })).toBeTruthy();
    expect(screen.getByText('Connexion réussie')).toBeTruthy();
  });
});

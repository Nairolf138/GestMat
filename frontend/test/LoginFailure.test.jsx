import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../src/Login.jsx';
import '../src/i18n.js';

describe('Login form validation', () => {
  it('shows error when missing credentials', async () => {
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Login />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Se connecter' }));
    expect(
      await screen.findByText('Utilisateur et mot de passe requis'),
    ).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import '../src/i18n.js';

describe('Navigation', () => {
  it('redirects to login when navigating to profile without auth', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Accueil' })).toBeTruthy();
    fireEvent.click(screen.getAllByRole('link', { name: 'Profil' })[0]);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });
});

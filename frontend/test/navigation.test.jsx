import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import '../src/i18n.js';

describe('Navigation', () => {
  it('redirects to login when accessing home without auth', async () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });

  it('redirects to login when accessing catalog without auth', async () => {
    window.history.pushState({}, '', '/catalog');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Connexion' })).toBeTruthy();
  });
});

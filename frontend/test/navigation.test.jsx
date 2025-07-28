import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import App from '../src/App.jsx';
import * as api from '../src/api.js';

vi.mock('../src/api.js');

describe('Navigation', () => {
  it('navigates to users page', async () => {
    api.api.mockResolvedValue([]);
    localStorage.setItem('token', 'abc');
    window.history.pushState({}, '', '/');
    render(<App />);
    // starts on equipments page
    expect(screen.getByRole('heading', { name: 'Équipements' })).toBeTruthy();
    fireEvent.click(screen.getByText('Utilisateurs'));
    expect(await screen.findByRole('heading', { name: 'Utilisateurs' })).toBeTruthy();
  });
});

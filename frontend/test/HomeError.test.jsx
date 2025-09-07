import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/Home.jsx';
import '../src/i18n.js';

vi.mock('../src/api.js', () => ({ api: vi.fn() }));
import { api } from '../src/api.js';

describe('Home', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows an error alert when loan fetch fails', async () => {
    api.mockRejectedValueOnce(new Error('API error'));
    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Home />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText('Erreur lors du chargement des prêts'),
    ).toBeTruthy();
  });
});

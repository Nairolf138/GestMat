import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Vehicles from '../src/pages/Vehicles/Vehicles.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Vehicles', () => {
  let queryClient;
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
    });
    api.api.mockResolvedValue([
      {
        _id: 'veh1',
        name: 'Camion atelier',
        registrationNumber: 'AB-123-CD',
        status: 'available',
        location: 'Dépôt',
        usage: 'Logistique',
        brand: 'Renault',
        model: 'Master',
        reservations: [
          { start: '2099-01-10', end: '2099-01-12', status: 'available' },
        ],
      },
    ]);
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vehicles']}>
          <GlobalContext.Provider
            value={{
              structures: [{ _id: 's1', name: 'Structure 1' }],
              notify: vi.fn(),
            }}
          >
            <AuthContext.Provider
              value={{
                user: { structure: { _id: 's1', name: 'Structure 1' } },
              }}
            >
              <Vehicles />
            </AuthContext.Provider>
          </GlobalContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders vehicle list with filters and availability', async () => {
    renderPage();

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(
      screen.getByRole('heading', { name: 'Parc véhicules' }),
    ).toBeTruthy();
    expect(await screen.findByText('Camion atelier')).toBeTruthy();
    expect(screen.getByText('AB-123-CD')).toBeTruthy();
    expect(screen.getAllByText('Disponible')).toBeTruthy();

    fireEvent.change(
      screen.getByLabelText('Début du créneau (date et heure)'),
      {
        target: { value: '2099-01-09T09:00' },
      },
    );
    fireEvent.change(screen.getByLabelText('Fin du créneau (date et heure)'), {
      target: { value: '2099-01-11T12:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));

    await waitFor(() => {
      const url = api.api.mock.lastCall[0];
      const params = new URLSearchParams(url.split('?')[1]);
      expect(params.get('availableStart')).toBe(
        new Date('2099-01-09T09:00').toISOString(),
      );
      expect(params.get('availableEnd')).toBe(
        new Date('2099-01-11T12:00').toISOString(),
      );
    });
    expect(
      await screen.findByText('Disponible sur cette période'),
    ).toBeTruthy();
  });

  it('allows resetting filters', async () => {
    renderPage();
    await waitFor(() => expect(api.api).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('Recherche'), {
      target: { value: 'test' },
    });
    fireEvent.change(screen.getByPlaceholderText('Usage'), {
      target: { value: 'usage' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));

    expect(screen.getByPlaceholderText('Recherche').value).toBe('');
    expect(screen.getByPlaceholderText('Usage').value).toBe('');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VehicleDetail from '../src/pages/Vehicles/VehicleDetail.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('VehicleDetail', () => {
  let queryClient;
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: 5 * 60 * 1000 } },
    });
    api.api.mockResolvedValue({
      _id: 'veh1',
      structure: 'owner',
      name: 'Camion atelier',
      registrationNumber: 'AB-123-CD',
      status: 'maintenance',
      location: 'Dépôt',
      usage: 'Logistique',
      insurance: {
        provider: 'Maif',
        policyNumber: 'POL123',
        expiryDate: '2099-01-01',
      },
      maintenance: {
        lastServiceDate: '2098-12-01',
        nextServiceDate: '2099-06-01',
        notes: 'Vidange ok',
      },
      reservations: [
        {
          start: '2099-02-10',
          end: '2099-02-12',
          status: 'available',
          note: 'Prêt local',
        },
      ],
    });
  });

  const renderDetail = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vehicles/veh1']}>
          <GlobalContext.Provider
            value={{
              notify: vi.fn(),
              structures: [{ _id: 'borrower', name: 'Borrower' }],
            }}
          >
            <AuthContext.Provider
              value={{
                user: {
                  structure: { _id: 'borrower' },
                  role: 'Regisseur General',
                },
              }}
            >
              <Routes>
                <Route path="/vehicles/:id" element={<VehicleDetail />} />
              </Routes>
            </AuthContext.Provider>
          </GlobalContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('shows vehicle documents and history', async () => {
    renderDetail();
    await waitFor(() => expect(api.api).toHaveBeenCalled());

    expect(await screen.findByText('Camion atelier')).toBeTruthy();
    expect(screen.getByText('Immatriculation:')).toBeTruthy();
    expect(screen.getByText('Contrôle technique')).toBeTruthy();
    expect(screen.getByText('Maif')).toBeTruthy();
    expect(screen.getByText('POL123')).toBeTruthy();
    expect(screen.getByText('Vidange ok')).toBeTruthy();
    expect(screen.getByText(/Prêt local/)).toBeTruthy();
  });

  it('sends a same-day vehicle slot with precise hours', async () => {
    renderDetail();
    await screen.findByText('Camion atelier');
    fireEvent.change(screen.getByLabelText('Début (date et heure)'), {
      target: { value: '2099-01-01T09:00' },
    });
    fireEvent.change(screen.getByLabelText('Fin (date et heure)'), {
      target: { value: '2099-01-01T12:00' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Demander ce véhicule' }),
    );
    await waitFor(() =>
      expect(api.api.mock.calls.some(([path]) => path === '/loans')).toBe(true),
    );
    const [, options] = api.api.mock.calls.find(([path]) => path === '/loans');
    const body = JSON.parse(options.body);
    expect(body.startDate).toBe(new Date('2099-01-01T09:00').toISOString());
    expect(body.endDate).toBe(new Date('2099-01-01T12:00').toISOString());
    expect(body.timeZone).toBe(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  });
});

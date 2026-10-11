import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  waitFor,
  cleanup,
  fireEvent,
  within,
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
              structures: [
                { _id: 'owner', name: 'Owner' },
                { _id: 'borrower', name: 'Borrower' },
              ],
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
    expect(screen.getAllByText('Owner').length).toBeGreaterThan(0);
    expect(screen.queryByText('owner')).toBeNull();
  });

  it('sends a same-day vehicle slot with precise hours', async () => {
    renderDetail();
    await screen.findByText('Camion atelier');
    const start = within(
      screen.getByRole('group', { name: 'Début de la réservation' }),
    );
    const end = within(
      screen.getByRole('group', { name: 'Fin de la réservation' }),
    );
    fireEvent.change(start.getByLabelText('Date'), {
      target: { value: '2099-01-01' },
    });
    fireEvent.change(start.getByLabelText('Heure'), {
      target: { value: '09:00' },
    });
    fireEvent.change(end.getByLabelText('Date'), {
      target: { value: '2099-01-01' },
    });
    fireEvent.change(end.getByLabelText('Heure'), {
      target: { value: '12:00' },
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

  it('requires both hours and rejects an end before the start', async () => {
    renderDetail();
    await screen.findByText('Camion atelier');
    const start = within(
      screen.getByRole('group', { name: 'Début de la réservation' }),
    );
    const end = within(
      screen.getByRole('group', { name: 'Fin de la réservation' }),
    );
    fireEvent.change(start.getByLabelText('Date'), {
      target: { value: '2099-01-01' },
    });
    fireEvent.change(end.getByLabelText('Date'), {
      target: { value: '2099-01-01' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Demander ce véhicule' }),
    );
    expect(
      screen.getByText('Merci de renseigner les champs obligatoires.'),
    ).toBeTruthy();
    expect(api.api.mock.calls.some(([path]) => path === '/loans')).toBe(false);
    fireEvent.change(start.getByLabelText('Heure'), {
      target: { value: '12:00' },
    });
    fireEvent.change(end.getByLabelText('Heure'), {
      target: { value: '09:00' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Demander ce véhicule' }),
    );
    expect(
      screen.getAllByText("L'heure de fin doit être après l'heure de début.")
        .length,
    ).toBeGreaterThan(0);
    expect(api.api.mock.calls.some(([path]) => path === '/loans')).toBe(false);
  });
});

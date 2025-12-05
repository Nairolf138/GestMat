import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VehicleDetail from '../src/pages/Vehicles/VehicleDetail.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
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
        { start: '2099-02-10', end: '2099-02-12', status: 'available', note: 'Prêt local' },
      ],
    });
  });

  const renderDetail = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/vehicles/veh1']}>
          <GlobalContext.Provider value={{ notify: vi.fn(), structures: [] }}>
            <Routes>
              <Route path="/vehicles/:id" element={<VehicleDetail />} />
            </Routes>
          </GlobalContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>,
    );

  it('shows vehicle documents and history', async () => {
    renderDetail();
    await waitFor(() => expect(api.api).toHaveBeenCalled());

    expect(screen.getByText('Camion atelier')).toBeTruthy();
    expect(screen.getByText('Immatriculation')).toBeTruthy();
    expect(screen.getByText('Contrôle technique')).toBeTruthy();
    expect(screen.getByText('Maif')).toBeTruthy();
    expect(screen.getByText('POL123')).toBeTruthy();
    expect(screen.getByText('Vidange ok')).toBeTruthy();
    expect(screen.getByText(/Prêt local/)).toBeTruthy();
  });
});

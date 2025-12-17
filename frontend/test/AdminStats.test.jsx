import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom/vitest';
import AdminStats from '../src/AdminStats.jsx';
import '../src/i18n.js';

vi.mock('../src/api.js');
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

import * as api from '../src/api.js';

describe('AdminStats', () => {
  const defaultResponses = {
    '/stats/loans/monthly': [{ _id: '2024-01', count: 1 }],
    '/stats/equipments/top': [{ name: 'Lamp', count: 2 }],
    '/stats/loans': [{ _id: 'pending', count: 3 }],
    '/stats/loans/duration?median=true': { average: 4, median: 5 },
    '/stats/structures/top-lenders': [{ name: 'Lender', count: 2 }],
    '/stats/structures/top-borrowers': [{ name: 'Borrower', count: 1 }],
    '/stats/logins/monthly': [{ _id: '2024-01', count: 6 }],
    '/stats/vehicles/status': [{ _id: 'available', count: 2 }],
    '/stats/vehicles/usage': [{ _id: 'technique', count: 1 }],
    '/stats/vehicles/mileage': {
      totalKilometers: 1234,
      totalDowntimeDays: 7,
    },
    '/stats/vehicles/occupancy': {
      reserved: 2,
      total: 4,
      ratio: 0.5,
    },
  };

  beforeEach(() => {
    api.api.mockReset();
    api.api.mockImplementation((url) => {
      if (url.startsWith('/stats/loans/monthly'))
        return Promise.resolve(defaultResponses['/stats/loans/monthly']);
      if (url.startsWith('/stats/logins/monthly'))
        return Promise.resolve(defaultResponses['/stats/logins/monthly']);
      if (url.startsWith('/stats/loans/duration'))
        return Promise.resolve(defaultResponses['/stats/loans/duration?median=true']);
      if (url.startsWith('/stats/structures/top-lenders'))
        return Promise.resolve(defaultResponses['/stats/structures/top-lenders']);
      if (url.startsWith('/stats/structures/top-borrowers'))
        return Promise.resolve(defaultResponses['/stats/structures/top-borrowers']);
      if (url.startsWith('/stats/vehicles/occupancy'))
        return Promise.resolve(defaultResponses['/stats/vehicles/occupancy']);
      if (url.startsWith('/stats/vehicles/status'))
        return Promise.resolve(defaultResponses['/stats/vehicles/status']);

      if (url.startsWith('/stats/vehicles/usage'))
        return Promise.resolve(defaultResponses['/stats/vehicles/usage']);

      if (Object.prototype.hasOwnProperty.call(defaultResponses, url)) {
        return Promise.resolve(defaultResponses[url]);
      }

      throw new Error(`Unexpected url ${url}`);
    });
  });

  it('renders charts', async () => {
    const { container } = render(<AdminStats />);
    await waitFor(() => {
      expect(container.querySelectorAll('[data-testid="bar-chart"]').length).toBeGreaterThan(0);
      expect(
        container.querySelectorAll('[data-testid="pie-chart"]').length,
      ).toBe(4);
    });

    expect(screen.getByText('Véhicules par statut')).toBeTruthy();
    expect(screen.getByText('Véhicules par usage')).toBeTruthy();
  });

  it('displays vehicle mileage and occupancy prompt', async () => {
    render(<AdminStats />);

    const mileageText = await screen.findByText(/Kilomètres parcourus/);
    expect(mileageText).toHaveTextContent(/1.?234/);

    expect(screen.getByText(/Jours d'indisponibilité/)).toHaveTextContent('7');
    expect(screen.getByText(/Sélectionnez un mois de début/)).toBeTruthy();
  });

  it('fetches occupancy when a period is selected', async () => {
    render(<AdminStats />);

    const fromInput = await screen.findByLabelText('De');
    const toInput = await screen.findByLabelText('À');

    await act(async () => {
      fireEvent.change(fromInput, { target: { value: '2024-01' } });
      fireEvent.change(toInput, { target: { value: '2024-02' } });
    });

    expect(fromInput.value).toBe('2024-01');
    expect(toInput.value).toBe('2024-02');

    await waitFor(() => {
      expect(api.api.mock.calls.length).toBeGreaterThan(10);
    });

    await waitFor(() => {
      const occupancyCall = api.api.mock.calls.find(([path]) =>
        path.startsWith('/stats/vehicles/occupancy'),
      );
      expect(occupancyCall).toBeTruthy();
    });

    await waitFor(() => {
      expect(screen.getByText(/Véhicules réservés/)).toHaveTextContent(
        '2 / 4',
      );
    });
  });

  it('displays error on failure', async () => {
    api.api.mockRejectedValueOnce(new Error('oops'));
    api.api.mockResolvedValue([]);
    const { findByText } = render(<AdminStats />);
    await findByText('oops');
  });
});

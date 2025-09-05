import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AdminStats from '../src/AdminStats.jsx';
import '../src/i18n.js';

vi.mock('../src/api.js');
vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid="bar-chart" />,
  Pie: () => <div data-testid="pie-chart" />,
}));

import * as api from '../src/api.js';

describe('AdminStats', () => {
  it('renders charts', async () => {
    api.api.mockImplementation((url) => {
      if (url.startsWith('/stats/loans/monthly')) return Promise.resolve([{ _id: '2024-01', count: 1 }]);
      if (url === '/stats/equipments/top') return Promise.resolve([{ name: 'Lamp', count: 2 }]);
      if (url === '/stats/loans') return Promise.resolve([{ _id: 'pending', count: 3 }]);
      throw new Error(`Unexpected url ${url}`);
    });

    const { container } = render(<AdminStats />);
    await waitFor(() => {
      expect(container.querySelector('[data-testid="bar-chart"]')).toBeTruthy();
      expect(container.querySelectorAll('[data-testid="pie-chart"]').length).toBe(2);
    });
  });

  it('displays error on failure', async () => {
    api.api.mockRejectedValueOnce(new Error('oops'));
    api.api.mockResolvedValue([]);
    const { findByText } = render(<AdminStats />);
    await findByText('oops');
  });
});


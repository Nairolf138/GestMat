import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ManageInvestments from '../src/admin/ManageInvestments.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import '../src/i18n.js';

vi.mock('../src/api.js');

import * as api from '../src/api.js';

describe('ManageInvestments', () => {
  beforeEach(() => {
    api.api.mockReset();
    api.api.mockImplementation((url) => {
      if (url.startsWith('/investments?')) return Promise.resolve([]);
      if (url === '/investments') return Promise.resolve([]);
      throw new Error(`Unexpected url ${url}`);
    });
  });

  it('renders interpolated numeric years in the admin investments tab', async () => {
    const currentYear = new Date().getFullYear();
    const yearOneLabel = `Année N (${currentYear})`;
    const yearTwoLabel = `Année N+1 (${currentYear + 1})`;

    render(
      <GlobalContext.Provider
        value={{
          roles: [],
          structures: [{ _id: 'structure-1', name: 'Structure Alpha' }],
          notify: vi.fn(),
        }}
      >
        <ManageInvestments />
      </GlobalContext.Provider>,
    );

    fireEvent.change(screen.getByLabelText('Structure'), {
      target: { value: 'Structure Alpha' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Appliquer' }));

    await waitFor(() => {
      expect(api.api).toHaveBeenCalledWith('/investments?structure=structure-1');
    });

    expect(await screen.findByRole('heading', { name: yearOneLabel })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: yearTwoLabel })).toBeInTheDocument();

    expect(screen.getAllByText(yearOneLabel).length).toBeGreaterThan(1);
    expect(screen.getAllByText(yearTwoLabel).length).toBeGreaterThan(1);
  });
});

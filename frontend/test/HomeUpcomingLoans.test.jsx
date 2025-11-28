import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/Home.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';

vi.mock('../src/api.js', () => ({ api: vi.fn() }));
import { api } from '../src/api.js';

const user = {
  structure: { _id: 'struct1', name: 'Structure 1' },
  firstName: 'User',
};

const borrower = { _id: 'struct1', name: 'Borrower' };

const baseLoan = {
  borrower,
  owner: { _id: 'owner', name: 'Owner' },
  items: [{ quantity: 1 }],
  endDate: '2100-02-05T00:00:00Z',
};

describe('Home upcoming loans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('excludes non accepted loans from upcoming list', async () => {
    api.mockResolvedValueOnce([
      {
        ...baseLoan,
        _id: 'accepted',
        status: 'accepted',
        startDate: '2100-02-01T00:00:00Z',
        owner: { _id: 'owner-accepted', name: 'Owner Accepted' },
      },
      {
        ...baseLoan,
        _id: 'pending',
        status: 'pending',
        startDate: '2100-03-01T00:00:00Z',
        owner: { _id: 'owner-pending', name: 'Owner Pending' },
      },
      {
        ...baseLoan,
        _id: 'cancelled',
        status: 'cancelled',
        startDate: '2100-04-01T00:00:00Z',
        owner: { _id: 'owner-cancelled', name: 'Owner Cancelled' },
      },
      {
        ...baseLoan,
        _id: 'refused',
        status: 'refused',
        startDate: '2100-05-01T00:00:00Z',
        owner: { _id: 'owner-refused', name: 'Owner Refused' },
      },
    ]);

    const { container } = render(
      <AuthContext.Provider value={{ user }}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await waitFor(() => expect(api).toHaveBeenCalledWith('/loans'));

    expect(await screen.findByText(/Owner Accepted/)).toBeTruthy();
    expect(screen.queryByText(/Owner Pending/)).toBeNull();
    expect(screen.queryByText(/Owner Cancelled/)).toBeNull();
    expect(screen.queryByText(/Owner Refused/)).toBeNull();

    const upcomingCards = container.querySelectorAll('.card.accepted');
    expect(upcomingCards.length).toBe(1);
  });
});

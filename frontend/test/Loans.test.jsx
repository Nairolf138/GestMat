import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import Loans from '../src/Loans.jsx';
import i18n from '../src/i18n.js';
import { AuthContext } from '../src/AuthContext.jsx';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

const dayMs = 24 * 60 * 60 * 1000;
const isoDaysFromNow = (days) => new Date(Date.now() + days * dayMs).toISOString();

const renderLoans = ({ structureId = 's1', initialEntry = '/loans' } = {}) =>
  render(
    <MemoryRouter
      initialEntries={[initialEntry]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthContext.Provider value={{ user: { structure: { _id: structureId } } }}>
        <Loans />
      </AuthContext.Provider>
    </MemoryRouter>,
  );

describe('Loans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'prompt').mockReturnValue('');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('updates loan status', async () => {
    api.api
      .mockResolvedValueOnce([
        {
          _id: 'l1',
          owner: { _id: 's1', name: 'S1' },
          borrower: { _id: 's2', name: 'S2' },
          items: [{ equipment: { name: 'Eq1' }, quantity: 1 }],
          status: 'pending',
        },
      ])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([]);

    const { getByText } = renderLoans();

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    fireEvent.click(getByText('Accepter'));
    await waitFor(() =>
      expect(api.api).toHaveBeenCalledWith(
        '/loans/l1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'accepted', decisionNote: '' }),
        }),
      ),
    );
  });

  it('renders a vehicle loan item with registration number and fixed quantity', async () => {
    api.api.mockResolvedValue([
      {
        _id: 'l-veh',
        owner: { _id: 's1', name: 'S1' },
        borrower: { _id: 's2', name: 'S2' },
        items: [
          {
            kind: 'vehicle',
            vehicle: {
              _id: 'veh1',
              name: 'Camion atelier',
              registrationNumber: 'AB-123-CD',
            },
          },
        ],
        status: 'accepted',
      },
    ]);

    renderLoans();

    await waitFor(() => expect(api.api).toHaveBeenCalledWith('/loans'));

    expect(screen.getByText('Camion atelier (AB-123-CD) x1')).toBeInTheDocument();
  });

  it('filters out finished/refused/cancelled loans while keeping pending/upcoming/ongoing and history link', async () => {
    api.api.mockResolvedValue([
      {
        _id: 'owner-pending',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's2', name: 'Borrower S2' },
        items: [{ equipment: { name: 'Pending Owner Loan' }, quantity: 1 }],
        status: 'pending',
        startDate: isoDaysFromNow(2),
        endDate: isoDaysFromNow(3),
      },
      {
        _id: 'owner-upcoming',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's3', name: 'Borrower S3' },
        items: [{ equipment: { name: 'Upcoming Owner Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(3),
        endDate: isoDaysFromNow(8),
      },
      {
        _id: 'owner-active',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's4', name: 'Borrower S4' },
        items: [{ equipment: { name: 'Active Owner Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(-2),
        endDate: isoDaysFromNow(3),
      },
      {
        _id: 'owner-finished',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's5', name: 'Borrower S5' },
        items: [{ equipment: { name: 'Finished Owner Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(-8),
        endDate: isoDaysFromNow(-1),
      },
      {
        _id: 'owner-refused',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's6', name: 'Borrower S6' },
        items: [{ equipment: { name: 'Refused Owner Loan' }, quantity: 1 }],
        status: 'refused',
        startDate: isoDaysFromNow(1),
        endDate: isoDaysFromNow(2),
      },
      {
        _id: 'owner-cancelled',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's7', name: 'Borrower S7' },
        items: [{ equipment: { name: 'Cancelled Owner Loan' }, quantity: 1 }],
        status: 'cancelled',
        startDate: isoDaysFromNow(1),
        endDate: isoDaysFromNow(2),
      },
      {
        _id: 'borrower-upcoming',
        owner: { _id: 's8', name: 'Owner S8' },
        borrower: { _id: 's1', name: 'Borrower S1' },
        items: [{ equipment: { name: 'Upcoming Borrower Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(4),
        endDate: isoDaysFromNow(5),
      },
      {
        _id: 'borrower-active',
        owner: { _id: 's9', name: 'Owner S9' },
        borrower: { _id: 's1', name: 'Borrower S1' },
        items: [{ equipment: { name: 'Active Borrower Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(-1),
        endDate: isoDaysFromNow(4),
      },
      {
        _id: 'borrower-finished',
        owner: { _id: 's10', name: 'Owner S10' },
        borrower: { _id: 's1', name: 'Borrower S1' },
        items: [{ equipment: { name: 'Finished Borrower Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(-10),
        endDate: isoDaysFromNow(-5),
      },
    ]);

    renderLoans();

    await waitFor(() => expect(api.api).toHaveBeenCalledWith('/loans'));

    const historyLink = screen.getByRole('link', {
      name: i18n.t('loans.history.view_all'),
    });
    expect(historyLink).toBeInTheDocument();
    expect(historyLink).toHaveAttribute('href', '/loans/history');

    expect(screen.getByText(/Pending Owner Loan/)).toBeInTheDocument();
    expect(screen.getByText(/Upcoming Owner Loan/)).toBeInTheDocument();
    expect(screen.getByText(/Active Owner Loan/)).toBeInTheDocument();
    expect(screen.queryByText(/Finished Owner Loan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refused Owner Loan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cancelled Owner Loan/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: i18n.t('loans.as_borrower') }));

    expect(screen.getByText(/Upcoming Borrower Loan/)).toBeInTheDocument();
    expect(screen.getByText(/Active Borrower Loan/)).toBeInTheDocument();
    expect(screen.queryByText(/Finished Borrower Loan/)).not.toBeInTheDocument();
  });

  it('does not render completed loans in current sections when only completed loans are returned', async () => {
    api.api.mockResolvedValue([
      {
        _id: 'finished-only',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's2', name: 'Borrower S2' },
        items: [{ equipment: { name: 'Finished Only Loan' }, quantity: 1 }],
        status: 'accepted',
        startDate: isoDaysFromNow(-8),
        endDate: isoDaysFromNow(-1),
      },
      {
        _id: 'cancelled-only',
        owner: { _id: 's1', name: 'Owner S1' },
        borrower: { _id: 's3', name: 'Borrower S3' },
        items: [{ equipment: { name: 'Cancelled Only Loan' }, quantity: 1 }],
        status: 'cancelled',
        startDate: isoDaysFromNow(1),
        endDate: isoDaysFromNow(2),
      },
      {
        _id: 'refused-only',
        owner: { _id: 's4', name: 'Owner S4' },
        borrower: { _id: 's1', name: 'Borrower S1' },
        items: [{ equipment: { name: 'Refused Only Loan' }, quantity: 1 }],
        status: 'refused',
        startDate: isoDaysFromNow(1),
        endDate: isoDaysFromNow(2),
      },
    ]);

    renderLoans();

    await waitFor(() => expect(api.api).toHaveBeenCalledWith('/loans'));

    expect(screen.queryByText(/Finished Only Loan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Cancelled Only Loan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Refused Only Loan/)).not.toBeInTheDocument();

    const emptyMessages = screen.getAllByText(i18n.t('home.no_loans'));
    expect(emptyMessages.length).toBeGreaterThan(0);
  });
});

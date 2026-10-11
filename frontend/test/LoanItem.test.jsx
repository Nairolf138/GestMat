import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import LoanItem from '../src/LoanItem.jsx';
import '../src/i18n.js';

const baseLoan = {
  _id: 'loan-1',
  owner: { name: 'Structure prêteuse' },
  borrower: { name: 'Structure emprunteuse' },
  startDate: '2020-01-10T00:00:00.000Z',
  endDate: '2020-01-12T00:00:00.000Z',
  items: [{ name: 'Perceuse', quantity: 1 }],
};

const renderBorrowerLoan = (overrides = {}) =>
  render(
    <LoanItem
      loan={{ ...baseLoan, ...overrides }}
      isOwner={false}
      refresh={() => {}}
    />,
  );

describe('LoanItem borrower actions', () => {
  it('keeps a day-based equipment loan date-only', () => {
    renderBorrowerLoan({ status: 'pending' });
    expect(screen.getByText('Demande de matériel')).toBeInTheDocument();
    expect(screen.getByText(/10\/01\/2020 – 12\/01\/2020/)).toBeInTheDocument();
    expect(screen.queryByText('Créneau demandé')).not.toBeInTheDocument();
  });

  it('uses the saved requester identity when the current account has no name', () => {
    renderBorrowerLoan({
      status: 'pending',
      requestedBy: { username: 'jmartin' },
      requesterIdentity: { firstName: 'Jeanne', lastName: 'Martin' },
      items: [{ kind: 'vehicle', vehicle: { name: 'Camion' } }],
    });
    expect(screen.getByText('Demandeur :').parentElement).toHaveTextContent(
      'Jeanne Martin',
    );
  });

  it('shows cancel for a pending borrower request even after the start date', () => {
    renderBorrowerLoan({ status: 'pending' });

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('keeps accepted borrower requests cancellable only before the start date', () => {
    const futureStart = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    ).toISOString();
    const futureEnd = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { rerender } = renderBorrowerLoan({ status: 'accepted' });

    expect(
      screen.queryByRole('button', { name: 'Annuler' }),
    ).not.toBeInTheDocument();

    rerender(
      <LoanItem
        loan={{
          ...baseLoan,
          status: 'accepted',
          startDate: futureStart,
          endDate: futureEnd,
        }}
        isOwner={false}
        refresh={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Annuler' })).toBeInTheDocument();
  });

  it('does not show cancel for closed borrower request statuses', () => {
    const { rerender } = renderBorrowerLoan({ status: 'refused' });

    expect(
      screen.queryByRole('button', { name: 'Annuler' }),
    ).not.toBeInTheDocument();

    rerender(
      <LoanItem
        loan={{ ...baseLoan, status: 'cancelled' }}
        isOwner={false}
        refresh={() => {}}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Annuler' }),
    ).not.toBeInTheDocument();
  });
});

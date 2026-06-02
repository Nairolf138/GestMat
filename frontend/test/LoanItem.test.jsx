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

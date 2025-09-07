import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Loans from '../src/Loans.jsx';
import '../src/i18n.js';
import { AuthContext } from '../src/AuthContext.jsx';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Loans', () => {
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

    const { getByText } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider value={{ user: { structure: { _id: 's1' } } }}>
          <Loans />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    fireEvent.click(getByText('Accepter'));
    await waitFor(() =>
      expect(api.api).toHaveBeenCalledWith(
        '/loans/l1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ status: 'accepted' }),
        }),
      ),
    );
  });
});

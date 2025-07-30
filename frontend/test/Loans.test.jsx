import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Loans from '../src/Loans.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Loans', () => {
  it('submits new loan with selected IDs', async () => {
    api.api
      .mockResolvedValueOnce([]) // initial /loans
      .mockResolvedValueOnce([{ _id: 'eq1', name: 'Eq1' }]) // equipments
      .mockResolvedValueOnce({}) // post
      .mockResolvedValueOnce([]); // refresh loans

    const { container, getByText } = render(
      <MemoryRouter>
        <GlobalContext.Provider value={{ roles: [], structures: [{ _id: 's1', name: 'S1' }] }}>
          <Loans />
        </GlobalContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    fireEvent.change(container.querySelector('select[name="owner"]'), {
      target: { value: 's1' },
    });
    fireEvent.change(container.querySelector('select[name="equipment"]'), {
      target: { value: 'eq1' },
    });
    fireEvent.change(container.querySelector('input[name="quantity"]'), {
      target: { value: '2' },
    });
    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-03' },
    });
    fireEvent.submit(getByText('Envoyer').closest('form'));
    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(4));
    expect(api.api).toHaveBeenNthCalledWith(
      3,
      '/loans',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          owner: 's1',
          items: [{ equipment: 'eq1', quantity: 2 }],
          startDate: '2024-01-01',
          endDate: '2024-01-03',
        }),
      })
    );
  });
});

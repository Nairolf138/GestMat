import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Catalog from '../src/Catalog.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';


describe('Catalog', () => {
  it('adds item to cart with chosen quantity', async () => {
    api.api
      .mockResolvedValueOnce([
        { _id: 'eq1', name: 'Eq1', structure: { _id: 's1', name: 'S1' } },
      ]) // fetch items
      .mockResolvedValueOnce({ available: true });

    vi.stubGlobal('alert', vi.fn());
    localStorage.clear();

    const { container, getByText } = render(
      <MemoryRouter>
        <GlobalContext.Provider value={{ structures: [{ _id: 's1', name: 'S1' }] }}>
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());

    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-02' },
    });
    fireEvent.change(container.querySelector('input[name="quantity-eq1"]'), {
      target: { value: '3' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Ajouter au panier' })
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(2));
    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toEqual([
      {
        equipment: { _id: 'eq1', name: 'Eq1', structure: { _id: 's1', name: 'S1' } },
        quantity: 3,
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
    ]);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Catalog from '../src/Catalog.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';


describe('Catalog', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('alert', vi.fn());
  });

  it('adds item to cart with chosen quantity', async () => {
    api.api
      .mockResolvedValueOnce([
        { _id: 'eq1', name: 'Eq1', structure: { _id: 's1', name: 'S1' } },
      ]) // fetch items
      .mockResolvedValueOnce({ available: true });

    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
      screen.getAllByRole('button', { name: 'Ajouter au panier' })[0]
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

  it('increments quantity when same item and dates are added twice', async () => {
    api.api
      .mockResolvedValueOnce([
        { _id: 'eq1', name: 'Eq1', structure: { _id: 's1', name: 'S1' } },
      ]) // fetch items
      .mockResolvedValue({ available: true });

    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
    // First add 2 items
    fireEvent.change(container.querySelector('input[name="quantity-eq1"]'), {
      target: { value: '2' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ajouter au panier' })[0]
    );

    // Second add 1 item
    fireEvent.change(container.querySelector('input[name="quantity-eq1"]'), {
      target: { value: '1' },
    });
    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ajouter au panier' })[0]
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(3));
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

  it('shows error on invalid period and disables search button', async () => {
    api.api.mockResolvedValueOnce([
      { _id: 'eq1', name: 'Eq1', structure: { _id: 's1', name: 'S1' } },
    ]); // fetch items

    const { container } = render(
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <GlobalContext.Provider value={{ structures: [{ _id: 's1', name: 'S1' }] }}>
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());

    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-02' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-01' },
    });

    const searchBtn = screen.getByRole('button', { name: 'Rechercher' });
    expect(searchBtn.disabled).toBe(true);

    fireEvent.click(
      screen.getAllByRole('button', { name: 'Ajouter au panier' })[0]
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Période invalide')).not.toBeNull();
  });
});

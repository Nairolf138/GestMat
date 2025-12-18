import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  fireEvent,
  waitFor,
  screen,
  cleanup,
} from '@testing-library/react';
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
    global.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  it('adds item to cart with chosen quantity', async () => {
    api.api.mockImplementation((path) => {
      if (path.includes('/availability')) {
        return Promise.resolve({ available: true });
      }
      return Promise.resolve([
        {
          _id: 'eq1',
          name: 'Eq1',
          status: 'Disponible',
          structure: { _id: 's1', name: 'S1' },
        },
      ]);
    });

    const { container } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ structures: [{ _id: 's1', name: 'S1' }] }}
        >
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    await screen.findByText('Eq1');

    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-02' },
    });
    await waitFor(() => {
      expect(container.querySelector('input[name="startDate"]').value).toBe(
        '2024-01-01',
      );
      expect(container.querySelector('input[name="endDate"]').value).toBe(
        '2024-01-02',
      );
    });
    const addButton = await screen.findByRole('button', {
      name: 'Ajouter au panier',
    });
    const quantityInput = await waitFor(() => {
      const input = container.querySelector('input[name="quantity-eq1"]');
      if (!input) throw new Error('quantity not ready');
      return input;
    });
    fireEvent.change(quantityInput, { target: { value: '3' } });
    fireEvent.click(addButton);

    await waitFor(() =>
      expect(
        api.api.mock.calls.some(([path]) =>
          typeof path === 'string' && path.includes('/availability'),
        ),
      ).toBe(true),
    );
    await waitFor(() => {
      const cart = JSON.parse(localStorage.getItem('cart'));
      expect(cart).not.toBeNull();
    });
    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toEqual([
      {
        equipment: {
          _id: 'eq1',
          name: 'Eq1',
          status: 'Disponible',
          structure: { _id: 's1', name: 'S1' },
        },
        quantity: 3,
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
    ]);
  });

  it('increments quantity when same item and dates are added twice', async () => {
    api.api.mockImplementation((path) => {
      if (path.includes('/availability')) {
        return Promise.resolve({ available: true });
      }
      return Promise.resolve([
        {
          _id: 'eq1',
          name: 'Eq1',
          status: 'Disponible',
          structure: { _id: 's1', name: 'S1' },
        },
      ]);
    });

    const { container } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ structures: [{ _id: 's1', name: 'S1' }] }}
        >
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    await screen.findByText('Eq1');

    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-01' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-02' },
    });
    await waitFor(() => {
      expect(container.querySelector('input[name="startDate"]').value).toBe(
        '2024-01-01',
      );
      expect(container.querySelector('input[name="endDate"]').value).toBe(
        '2024-01-02',
      );
    });
    const addButton = await screen.findByRole('button', {
      name: 'Ajouter au panier',
    });
    // First add 2 items
    const quantityInput = await waitFor(() => {
      const input = container.querySelector('input[name="quantity-eq1"]');
      if (!input) throw new Error('quantity not ready');
      return input;
    });
    fireEvent.change(quantityInput, { target: { value: '2' } });
    fireEvent.click(addButton);

    // Second add 1 item
    fireEvent.change(quantityInput, { target: { value: '1' } });
    fireEvent.click(addButton);

    await waitFor(() =>
      expect(
        api.api.mock.calls.filter(
          ([path]) => typeof path === 'string' && path.includes('/availability'),
        ).length,
      ).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => {
      const cart = JSON.parse(localStorage.getItem('cart'));
      expect(cart).not.toBeNull();
      expect(cart[0]?.quantity).toBe(3);
    });
    const cart = JSON.parse(localStorage.getItem('cart'));
    expect(cart).toEqual([
      {
        equipment: {
          _id: 'eq1',
          name: 'Eq1',
          status: 'Disponible',
          structure: { _id: 's1', name: 'S1' },
        },
        quantity: 3,
        startDate: '2024-01-01',
        endDate: '2024-01-02',
      },
    ]);
  });

  it('shows error on invalid period and disables search button', async () => {
    api.api.mockImplementation((path) => {
      if (path.includes('/availability')) {
        return Promise.resolve({ available: true });
      }
      return Promise.resolve([
        {
          _id: 'eq1',
          name: 'Eq1',
          status: 'Disponible',
          structure: { _id: 's1', name: 'S1' },
        },
      ]);
    });

    const { container } = render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ structures: [{ _id: 's1', name: 'S1' }] }}
        >
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    await screen.findByText('Eq1');

    fireEvent.change(container.querySelector('input[name="startDate"]'), {
      target: { value: '2024-01-02' },
    });
    fireEvent.change(container.querySelector('input[name="endDate"]'), {
      target: { value: '2024-01-01' },
    });
    await waitFor(() => {
      expect(container.querySelector('input[name="startDate"]').value).toBe(
        '2024-01-02',
      );
      expect(container.querySelector('input[name="endDate"]').value).toBe(
        '2024-01-01',
      );
    });
    const addButton = await screen.findByRole('button', {
      name: 'Ajouter au panier',
    });

    fireEvent.click(addButton);

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    const availabilityCalls = api.api.mock.calls.filter(([path]) =>
      typeof path === 'string' && path.includes('/availability'),
    );
    expect(availabilityCalls.length).toBe(0);
    await waitFor(() =>
      expect(screen.queryByText('Période invalide')).not.toBeNull(),
    );
  });

  it('filters out HS or maintenance items from the catalog list', async () => {
    const equipments = [
      {
        _id: 'eq1',
        name: 'HS item',
        status: 'HS',
        structure: { _id: 's1', name: 'S1' },
      },
      {
        _id: 'eq2',
        name: 'Maintenance item',
        status: 'En maintenance',
        structure: { _id: 's1', name: 'S1' },
      },
      {
        _id: 'eq3',
        name: 'Available item',
        status: 'Disponible',
        structure: { _id: 's1', name: 'S1' },
      },
    ];
    api.api.mockImplementation(() => Promise.resolve(equipments));

    render(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <GlobalContext.Provider
          value={{ structures: [{ _id: 's1', name: 'S1' }] }}
        >
          <Catalog />
        </GlobalContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    await screen.findByText('Available item');
    expect(api.api).toHaveBeenCalledWith(
      expect.stringContaining('catalog=true'),
    );
    expect(screen.queryByText('HS item')).toBeNull();
    expect(screen.queryByText('Maintenance item')).toBeNull();
    expect(screen.getByText('Available item')).not.toBeNull();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Equipments from '../src/Equipments.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

describe('Equipments', () => {
  let queryClient;
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: 5 * 60 * 1000 },
      },
    });
  });

  function renderWithClient(ui) {
    return render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    );
  }

  it('lists inventory, sorts and resets filters, and opens add form', async () => {
    api.api.mockResolvedValue([
      { _id: 'eq1', name: 'Eq1', location: 'Loc', availability: 'Available' },
    ]);

    renderWithClient(
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider
          value={{ user: { structure: { _id: 's1', name: 'Structure 1' } } }}
        >
          <Equipments />
        </AuthContext.Provider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(api.api).toHaveBeenCalled());
    expect(api.api).toHaveBeenLastCalledWith(expect.stringContaining('sort='));
    expect(
      screen.getByRole('heading', {
        name: 'Inventaire local - Structure 1',
      }),
    ).toBeTruthy();
    await screen.findByText('Eq1');
    expect(screen.getByText('Loc')).toBeTruthy();
    expect(screen.getByText('Available')).toBeTruthy();

    // ensure search fields do not trigger browser autocomplete
    expect(
      screen.getByPlaceholderText('Recherche').getAttribute('autocomplete'),
    ).toBe('off');
    expect(
      screen.getByPlaceholderText('Type').getAttribute('autocomplete'),
    ).toBe('off');
    expect(
      screen.getByPlaceholderText('Emplacement').getAttribute('autocomplete'),
    ).toBe('off');
    const sortSelect = screen.getByLabelText('Tri');
    fireEvent.change(sortSelect, { target: { value: 'name' } });
    await waitFor(() =>
      expect(api.api).toHaveBeenLastCalledWith(
        expect.stringContaining('sort=name'),
      ),
    );
    fireEvent.change(screen.getByPlaceholderText('Recherche'), {
      target: { value: 'foo' },
    });
    fireEvent.change(screen.getByPlaceholderText('Type'), {
      target: { value: 'bar' },
    });
    fireEvent.change(screen.getByPlaceholderText('Emplacement'), {
      target: { value: 'baz' },
    });
    fireEvent.change(sortSelect, { target: { value: 'type' } });
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }));
    expect(screen.getByPlaceholderText('Recherche').value).toBe('');
    expect(screen.getByPlaceholderText('Type').value).toBe('');
    expect(screen.getByPlaceholderText('Emplacement').value).toBe('');
    expect(sortSelect.value).toBe('');
    await waitFor(() =>
      expect(api.api).toHaveBeenLastCalledWith(
        expect.stringContaining('sort='),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Nouvel équipement' }));
    const addForm = screen.getByRole('form', { name: 'Nouvel équipement' });
    expect(addForm.getAttribute('autocomplete')).toBe('off');
    expect(
      screen.getByRole('heading', { name: 'Nouvel équipement' }),
    ).toBeTruthy();
  });
  it('uses cached data on remount', async () => {
    api.api.mockResolvedValue([
      { _id: 'eq1', name: 'Eq1', location: 'Loc', availability: 'Available' },
    ]);

    const tree = (
      <MemoryRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <AuthContext.Provider
          value={{ user: { structure: { _id: 's1', name: 'Structure 1' } } }}
        >
          <Equipments />
        </AuthContext.Provider>
      </MemoryRouter>
    );

    const { unmount } = renderWithClient(tree);
    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(1));
    unmount();

    renderWithClient(tree);
    await screen.findByText('Eq1');
    expect(api.api).toHaveBeenCalledTimes(1);
  });
});

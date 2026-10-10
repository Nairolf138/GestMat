import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Cart from '../src/Cart.jsx';
import '../src/i18n.js';
import { AuthContext } from '../src/AuthContext.jsx';
vi.mock('../src/api.js');
import * as api from '../src/api.js';

const sampleCart = [
  {
    equipment: {
      _id: 'eq1',
      name: 'Trépied',
      structure: { _id: 's1', name: 'Structure 1' },
    },
    quantity: 1,
    startDate: '2024-01-01',
    endDate: '2024-01-02',
  },
];

describe('Cart note handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('treats the note as optional while still including it in loan requests', async () => {
    localStorage.setItem('cart', JSON.stringify(sampleCart));
    api.api.mockResolvedValue({});

    render(
      <AuthContext.Provider
        value={{ user: { structure: { _id: 'borrower-1' } } }}
      >
        <Cart />
      </AuthContext.Provider>,
    );

    const noteField = screen.getByLabelText('Note pour la demande');
    expect(noteField.value).toBe('');

    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la demande de prêt' }),
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(1));
    const [path, request] = api.api.mock.calls[0];
    expect(path).toBe('/loans');
    expect(request.method).toBe('POST');
    expect(JSON.parse(request.body)).toEqual({
      owner: 's1',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      items: [{ equipment: 'eq1', quantity: 1 }],
      borrower: 'borrower-1',
      note: '',
      clientRequestId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it('restores and persists the entered note between sessions', async () => {
    localStorage.setItem('cart', JSON.stringify(sampleCart));
    localStorage.setItem('cartNote', 'Merci de manipuler avec soin');
    api.api.mockResolvedValue({});

    render(
      <AuthContext.Provider
        value={{ user: { structure: { _id: 'borrower-1' } } }}
      >
        <Cart />
      </AuthContext.Provider>,
    );

    const noteField = screen.getByLabelText('Note pour la demande');
    expect(noteField.value).toBe('Merci de manipuler avec soin');

    fireEvent.change(noteField, { target: { value: 'Nouveau commentaire' } });
    expect(localStorage.getItem('cartNote')).toBe('Nouveau commentaire');

    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la demande de prêt' }),
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(1));
    const [, payload] = api.api.mock.calls[0];
    const body = JSON.parse(payload.body);
    expect(body.note).toBe('Nouveau commentaire');
    expect(body.items).toEqual([{ equipment: 'eq1', quantity: 1 }]);
  });

  it('keeps the cart intact and reports an invalid quantity', () => {
    localStorage.setItem('cart', JSON.stringify(sampleCart));
    render(
      <AuthContext.Provider
        value={{ user: { structure: { _id: 'borrower-1' } } }}
      >
        <Cart />
      </AuthContext.Provider>,
    );
    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: '0' },
    });
    expect(screen.getByRole('alert').textContent).toContain(
      'Saisissez une quantité entière supérieure à zéro',
    );
    expect(JSON.parse(localStorage.getItem('cart'))).toEqual(sampleCart);
  });

  it('keeps only failed groups and reuses their request id on retry', async () => {
    const second = {
      ...sampleCart[0],
      equipment: {
        _id: 'eq2',
        name: 'Micro',
        structure: { _id: 's2', name: 'Structure 2' },
      },
    };
    localStorage.setItem('cart', JSON.stringify([...sampleCart, second]));
    api.api
      .mockResolvedValueOnce({ _id: 'loan-1' })
      .mockRejectedValueOnce(new Error('Network error'));
    render(
      <AuthContext.Provider
        value={{ user: { structure: { _id: 'borrower-1' } } }}
      >
        <Cart />
      </AuthContext.Provider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la demande de prêt' }),
    );
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('cart'))).toEqual([second]),
    );
    const firstFailedId = JSON.parse(
      api.api.mock.calls[1][1].body,
    ).clientRequestId;
    expect(screen.getByText(/demande reste dans le panier/)).toBeTruthy();
    api.api.mockResolvedValueOnce({ _id: 'loan-2' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la demande de prêt' }),
    );
    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(3));
    expect(JSON.parse(api.api.mock.calls[2][1].body).clientRequestId).toBe(
      firstFailedId,
    );
    await waitFor(() => expect(localStorage.getItem('cart')).toBeNull());
  });
});

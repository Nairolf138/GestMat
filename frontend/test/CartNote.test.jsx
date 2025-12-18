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
      <AuthContext.Provider value={{ user: { structure: { _id: 'borrower-1' } } }}>
        <Cart />
      </AuthContext.Provider>,
    );

    const noteField = screen.getByLabelText('Note pour la demande');
    expect(noteField.value).toBe('');

    fireEvent.click(
      screen.getByRole('button', { name: 'Valider la demande de prêt' }),
    );

    await waitFor(() => expect(api.api).toHaveBeenCalledTimes(1));
    expect(api.api).toHaveBeenCalledWith(
      '/loans',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          owner: 's1',
          startDate: '2024-01-01',
          endDate: '2024-01-02',
          items: [{ equipment: 'eq1', quantity: 1 }],
          borrower: 'borrower-1',
          note: '',
        }),
      }),
    );
  });

  it('restores and persists the entered note between sessions', async () => {
    localStorage.setItem('cart', JSON.stringify(sampleCart));
    localStorage.setItem('cartNote', 'Merci de manipuler avec soin');
    api.api.mockResolvedValue({});

    render(
      <AuthContext.Provider value={{ user: { structure: { _id: 'borrower-1' } } }}>
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
});

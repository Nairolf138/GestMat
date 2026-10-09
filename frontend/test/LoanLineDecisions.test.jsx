import { it, expect, vi, afterEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from '@testing-library/react';
import LoanLineDecisions from '../src/components/LoanLineDecisions.jsx';
import '../src/i18n.js';
vi.mock('../src/api', () => ({ api: vi.fn() }));
import { api } from '../src/api';
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const loan = {
  _id: 'loan',
  items: [
    {
      lineId: 'mac',
      equipment: { name: 'MacAura' },
      quantity: 4,
      decisionVersion: '[4,"2026-10-09","2026-10-10"]',
      decision: { status: 'pending' },
      permissions: { canDecide: true },
    },
    {
      lineId: 'parfect',
      equipment: { name: 'Parfect' },
      quantity: 2,
      decision: { status: 'pending' },
      permissions: { canDecide: true },
    },
    {
      lineId: 'sound',
      equipment: { name: 'Console' },
      quantity: 1,
      decision: { status: 'pending' },
      permissions: { canDecide: false },
    },
  ],
};
it('sends independent whole-line decisions in one save and hides unauthorized controls', async () => {
  api.mockResolvedValue({});
  const refresh = vi.fn();
  render(<LoanLineDecisions loan={loan} refresh={refresh} />);
  expect(screen.getAllByRole('combobox')).toHaveLength(2);
  fireEvent.change(screen.getByLabelText('Décision pour MacAura x4'), {
    target: { value: 'accepted' },
  });
  fireEvent.change(screen.getByLabelText('Décision pour Parfect x2'), {
    target: { value: 'refused' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Enregistrer les décisions' }),
  );
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  const payload = JSON.parse(api.mock.calls[0][1].body);
  expect(payload.decisions).toEqual([
    {
      lineId: 'mac',
      status: 'accepted',
      expectedStatus: 'pending',
      expectedVersion: '[4,"2026-10-09","2026-10-10"]',
    },
    { lineId: 'parfect', status: 'refused', expectedStatus: 'pending' },
  ]);
});
it('shows the original actor and handles a stale decision failure without losing choices', async () => {
  api.mockRejectedValue(new Error('Ligne déjà traitée'));
  const refresh = vi.fn();
  render(
    <LoanLineDecisions
      loan={{
        ...loan,
        items: [
          loan.items[0],
          {
            ...loan.items[1],
            decision: {
              status: 'refused',
              actor: { firstName: 'Jean', lastName: 'Martin' },
              note: 'Pas disponible',
            },
          },
        ],
      }}
      refresh={refresh}
    />,
  );
  expect(screen.getByText('Jean Martin')).toBeTruthy();
  expect(screen.getByText('Pas disponible')).toBeTruthy();
  fireEvent.change(screen.getByLabelText('Décision pour MacAura x4'), {
    target: { value: 'accepted' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Enregistrer les décisions' }),
  );
  expect(await screen.findByText('Ligne déjà traitée')).toBeTruthy();
  expect(refresh).not.toHaveBeenCalled();
  expect(screen.getByLabelText('Décision pour MacAura x4').value).toBe(
    'accepted',
  );
});

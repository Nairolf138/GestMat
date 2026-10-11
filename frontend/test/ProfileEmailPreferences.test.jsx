import React from 'react';
import { it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Profile from '../src/Profile.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import { GlobalContext } from '../src/GlobalContext.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js', () => ({ api: vi.fn() }));
import { api } from '../src/api.js';

it('keeps old opt-outs and saves vehicle preferences independently', async () => {
  const user = {
    _id: 'user-1',
    username: 'alice',
    firstName: 'Alice',
    lastName: 'Martin',
    email: 'alice@example.test',
    role: 'Autre',
    structure: '',
    preferences: {
      emailNotifications: {
        loanRequests: false,
        loanStatusChanges: false,
        returnReminders: false,
      },
    },
  };
  api.mockImplementation((_url, options) =>
    Promise.resolve({ ...user, ...JSON.parse(options.body) }),
  );
  render(
    <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
      <GlobalContext.Provider value={{ structures: [] }}>
        <Profile />
      </GlobalContext.Provider>
    </AuthContext.Provider>,
  );

  const equipmentRequests = screen.getByLabelText(
    'Nouvelles demandes de matériel',
  );
  const vehicleRequests = screen.getByLabelText(
    'Nouvelles réservations de véhicules',
  );
  expect(equipmentRequests.checked).toBe(false);
  expect(vehicleRequests.checked).toBe(false);
  fireEvent.click(vehicleRequests);
  expect(vehicleRequests.checked).toBe(true);
  expect(equipmentRequests.checked).toBe(false);

  fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
  await waitFor(() => expect(api).toHaveBeenCalled());
  const payload = JSON.parse(api.mock.calls[0][1].body);
  expect(payload.preferences.emailNotifications.loanRequests).toBe(false);
  expect(payload.preferences.emailNotifications.vehicleRequests).toBe(true);
});

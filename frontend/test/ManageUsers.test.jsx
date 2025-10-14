import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageUsers from '../src/admin/ManageUsers.jsx';
import '../src/i18n.js';
vi.mock('../src/api.js');
import * as api from '../src/api.js';
import { AUTRE_ROLE } from '../roles';
import { canManageEquipment } from '../src/utils.js';

describe('ManageUsers', () => {
  it('loads roles and saves selected role', async () => {
    api.api.mockImplementation((url, opts = {}) => {
      if (url === '/roles') return Promise.resolve(['Autre', 'Administrateur']);
      if (url.startsWith('/users') && (!opts.method || opts.method === 'GET')) {
        return Promise.resolve([{ _id: '1', username: 'u1', role: 'Autre' }]);
      }
      if (url === '/users/1' && opts.method === 'PUT') {
        return Promise.resolve({});
      }
      return Promise.resolve([]);
    });

    render(<ManageUsers />);

    await screen.findByText('u1', { exact: false });
    fireEvent.click(screen.getByRole('button', { name: 'Éditer' }));

    await screen.findByRole('option', { name: 'Administrateur' });

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'Administrateur' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => {
      const call = api.api.mock.calls.find(
        (c) => c[0] === '/users/1' && c[1]?.method === 'PUT',
      );
      expect(call).toBeTruthy();
      expect(call[1].body).toBe(
        JSON.stringify({ firstName: '', lastName: '', role: 'Administrateur' }),
      );
    });
  });

  it('does not allow Autre role to manage equipment', () => {
    expect(canManageEquipment(AUTRE_ROLE)).toBe(false);
  });
});

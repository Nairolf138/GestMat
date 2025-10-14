import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from '../src/Home.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';
import { AUTRE_ROLE } from '../roles';

vi.mock('../src/api.js', () => ({ api: vi.fn() }));
import { api } from '../src/api.js';

describe('Home dashboard summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not request stats for non-admin users', async () => {
    api.mockImplementation((path) => {
      if (path === '/loans') return Promise.resolve([]);
      throw new Error(`Unexpected path ${path}`);
    });

    render(
      <AuthContext.Provider value={{ user: { role: AUTRE_ROLE }, setUser: vi.fn() }}>
        <MemoryRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <Home />
        </MemoryRouter>
      </AuthContext.Provider>,
    );

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/loans');
    });

    const calledStats = api.mock.calls.some(([path]) => path === '/stats/loans');
    expect(calledStats).toBe(false);
  });
});

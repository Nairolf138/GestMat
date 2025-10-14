import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import DashboardSummary from '../src/components/DashboardSummary.jsx';
import { AuthContext } from '../src/AuthContext.jsx';
import '../src/i18n.js';
import { ADMIN_ROLE, AUTRE_ROLE } from '../roles';

vi.mock('../src/api.js', () => ({ api: vi.fn() }));
import { api } from '../src/api.js';

describe('DashboardSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithUser = (user) =>
    render(
      <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
        <DashboardSummary />
      </AuthContext.Provider>,
    );

  it('returns null for non-admin users without fetching stats', () => {
    api.mockImplementation(() => Promise.reject(new Error('should not fetch')));
    const { container } = renderWithUser({ role: AUTRE_ROLE });
    expect(container.firstChild).toBeNull();
    expect(api).not.toHaveBeenCalled();
  });

  it('loads stats for administrators', async () => {
    api.mockResolvedValueOnce([
      { _id: 'pending', count: 3 },
      { _id: 'ongoing', count: 2 },
      { _id: 'upcoming', count: 1 },
    ]);

    const { getByText } = renderWithUser({ role: ADMIN_ROLE });

    await waitFor(() => {
      expect(api).toHaveBeenCalled();
      expect(api.mock.calls[0][0]).toBe('/stats/loans');
    });

    expect(getByText('En attente')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('En cours')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('À venir')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
  });
});

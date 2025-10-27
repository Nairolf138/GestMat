import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
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

  const renderWithUser = (user, counts) =>
    render(
      <AuthContext.Provider value={{ user, setUser: vi.fn() }}>
        <DashboardSummary counts={counts} />
      </AuthContext.Provider>,
    );

  it('renders summary cards for any user without fetching stats', () => {
    const { container, getByText } = renderWithUser({ role: AUTRE_ROLE });
    expect(container.querySelector('.card-grid')).not.toBeNull();
    expect(getByText('En attente')).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });

  it('displays provided counts for administrators without triggering API calls', () => {
    const { getByText } = renderWithUser(
      { role: ADMIN_ROLE },
      { pending: 3, ongoing: 2, upcoming: 1 },
    );

    expect(getByText('En attente')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('En cours')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('À venir')).toBeTruthy();
    expect(getByText('1')).toBeTruthy();
    expect(api).not.toHaveBeenCalled();
  });
});

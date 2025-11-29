import React, { useContext, useEffect } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, AuthProvider } from '../src/AuthContext.jsx';

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: () => ({ data: { id: 1 }, status: 'success' }),
  };
});

const DEFAULT_LIMIT = 30 * 60 * 1000;
const EXTENDED_LIMIT = 7 * 24 * 60 * 60 * 1000;

function renderWithProviders(ui, client) {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <QueryClientProvider client={client}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('AuthProvider stay logged in preference', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    );
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('uses default inactivity limit when stay logged in is disabled', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const queryClient = new QueryClient();

    function Consumer() {
      const { stayLoggedInPreference } = useContext(AuthContext);
      return (
        <div data-testid="preference-value">
          {stayLoggedInPreference ? 'true' : 'false'}
        </div>
      );
    }

    renderWithProviders(<Consumer />, queryClient);

    await waitFor(() =>
      expect(screen.getByTestId('preference-value').textContent).toBe('false'),
    );

    const inactivityCall = setTimeoutSpy.mock.calls.find(
      ([, delay]) => delay === DEFAULT_LIMIT,
    );
    expect(inactivityCall).toBeTruthy();
    expect(Number(localStorage.getItem('lastActivity'))).toBeGreaterThan(0);
  });

  it('extends inactivity timeout and resets activity when preference is enabled', async () => {
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const queryClient = new QueryClient();
    const initialTimestamp = Date.now() - 1000;
    localStorage.setItem('lastActivity', initialTimestamp.toString());

    function Consumer() {
      const { setStayLoggedInPreference } = useContext(AuthContext);
      useEffect(() => {
        setStayLoggedInPreference(true);
      }, [setStayLoggedInPreference]);
      return null;
    }

    renderWithProviders(<Consumer />, queryClient);

    await waitFor(() => {
      expect(
        setTimeoutSpy.mock.calls.some(([, delay]) => delay === EXTENDED_LIMIT),
      ).toBe(true);
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    const updatedActivity = Number(localStorage.getItem('lastActivity'));
    expect(updatedActivity).toBeGreaterThan(initialTimestamp);
    expect(localStorage.getItem('stayLoggedIn')).toBe('true');
  });
});

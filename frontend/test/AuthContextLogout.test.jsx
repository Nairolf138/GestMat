import { it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../src/AuthContext.jsx';
import React from 'react';

it('does not call /auth/logout when no user is logged in', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({}),
    })
  );
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div />
      </AuthProvider>
    </QueryClientProvider>
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch).not.toHaveBeenCalledWith(
    expect.stringContaining('/auth/logout'),
    expect.any(Object)
  );
  vi.unstubAllGlobals();
});

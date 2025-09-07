import { it, expect, vi } from 'vitest';
import { api } from '../src/api.js';

it('retries request after refresh on 401', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      }),
  );
  await api('/test');
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('/test'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/test'),
    expect.any(Object),
  );
  vi.unstubAllGlobals();
});

it('throws when refresh fails', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}),
      }),
  );
  await expect(api('/test')).rejects.toThrow();
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('/test'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
  vi.unstubAllGlobals();
});

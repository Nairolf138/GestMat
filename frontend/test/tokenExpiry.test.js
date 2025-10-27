import { it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it('retries request after refresh on 401', async () => {
  const { api } = await import('../src/api.js');
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
        json: () => Promise.resolve({ csrfToken: 'token' }),
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
    expect.stringContaining('/auth/csrf'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    4,
    expect.stringContaining('/test'),
    expect.any(Object),
  );
});

it('throws when refresh fails', async () => {
  const { api } = await import('../src/api.js');
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
        json: () => Promise.resolve({ csrfToken: 'token' }),
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
    expect.stringContaining('/auth/csrf'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
});

import { it, expect, vi } from 'vitest';
import { api } from '../src/api.js';

it('uses JSON headers without Authorization', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({}),
  }));
  await api('/test');
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/test'),
    expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    }),
  );
  expect(fetch).toHaveBeenCalledWith(
    expect.any(String),
    expect.objectContaining({
      headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }),
  );
  vi.unstubAllGlobals();
});

it('returns uniform error objects', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({
          message: 'Bad Request',
          errors: [{ path: 'name', msg: 'Required' }],
        }),
    }),
  );
  await expect(api('/test')).rejects.toEqual({
    code: 400,
    message: 'Bad Request',
    fields: { name: 'Required' },
  });
  vi.unstubAllGlobals();
});

it('wraps network failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
  await expect(api('/test')).rejects.toEqual({
    code: 'NETWORK_ERROR',
    message: 'boom',
    fields: undefined,
  });
  vi.unstubAllGlobals();
});

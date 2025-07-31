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

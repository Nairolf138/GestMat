import { it, expect, vi } from 'vitest';
import { api } from '../src/api.js';

it('adds Authorization header when token exists', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({})
  }));
  localStorage.setItem('token', 'abc');
  await api('/test');
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/test'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer abc' })
    })
  );
  localStorage.clear();
});

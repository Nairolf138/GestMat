import { it, expect, vi } from 'vitest';
import { api } from '../src/api.js';

const makeToken = (exp) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.sig`;
};

it('refreshes expired token', async () => {
  const oldExp = Math.floor(Date.now() / 1000) - 10;
  const newExp = Math.floor(Date.now() / 1000) + 3600;
  const oldToken = makeToken(oldExp);
  const newToken = makeToken(newExp);
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ token: newToken }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    }));
  localStorage.setItem('token', oldToken);
  localStorage.setItem('tokenExp', String(oldExp));
  await api('/test');
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/test'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${newToken}` }),
    }),
  );
  expect(localStorage.getItem('token')).toBe(newToken);
  expect(Number(localStorage.getItem('tokenExp'))).toBe(newExp);
});

it('removes token when refresh fails', async () => {
  const oldExp = Math.floor(Date.now() / 1000) - 10;
  const oldToken = makeToken(oldExp);
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    }));
  localStorage.setItem('token', oldToken);
  localStorage.setItem('tokenExp', String(oldExp));
  await api('/test');
  expect(fetch).toHaveBeenNthCalledWith(
    1,
    expect.stringContaining('/auth/refresh'),
    expect.any(Object),
  );
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/test'),
    expect.objectContaining({
      headers: expect.not.objectContaining({ Authorization: expect.anything() }),
    }),
  );
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('tokenExp')).toBeNull();
});

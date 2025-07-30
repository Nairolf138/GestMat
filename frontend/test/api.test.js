import { it, expect, vi } from 'vitest';
import { api } from '../src/api.js';

const makeToken = (exp) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp }));
  return `${header}.${payload}.sig`;
};

it('adds Authorization header when token exists', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({})
  }));
  const token = makeToken(Math.floor(Date.now() / 1000) + 3600);
  localStorage.setItem('token', token);
  localStorage.setItem('tokenExp', String(Math.floor(Date.now() / 1000) + 3600));
  await api('/test');
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/test'),
    expect.objectContaining({
      headers: expect.objectContaining({ Authorization: `Bearer ${token}` })
    })
  );
  localStorage.clear();
});

import jwtDecode from 'jwt-decode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function refreshToken() {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Refresh error');
    const { exp } = jwtDecode(data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('tokenExp', exp);
    return data.token;
  } catch (err) {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExp');
    return null;
  }
}

async function getValidToken() {
  let token = localStorage.getItem('token');
  if (!token) return null;
  let exp = Number(localStorage.getItem('tokenExp'));
  if (!exp) {
    try {
      exp = jwtDecode(token).exp;
      localStorage.setItem('tokenExp', exp);
    } catch {
      localStorage.removeItem('token');
      return null;
    }
  }
  if (Date.now() >= exp * 1000) {
    token = await refreshToken();
  }
  return token;
}

export async function api(path, options = {}) {
  const token = await getValidToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'API error');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Network error');
  }
}

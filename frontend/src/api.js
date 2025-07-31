const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getCsrfToken() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function refreshToken() {
  try {
    const token = getCsrfToken();
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { 'CSRF-Token': token } : {},
    });
    if (!res.ok) throw new Error('Refresh error');
    return true;
  } catch {
    return false;
  }
}

export async function api(path, options = {}, retry = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCsrfToken();
    if (token) headers['CSRF-Token'] = token;
  }
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      credentials: 'include',
    });
    if (res.status === 401 && retry) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return api(path, options, false);
      }
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'API error');
    return data;
  } catch (err) {
    throw new Error(err.message || 'Network error');
  }
}


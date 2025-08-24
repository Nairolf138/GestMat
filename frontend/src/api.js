const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

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
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {}
    try {
      if (typeof navigator === 'undefined' || !navigator.userAgent.includes('jsdom')) {
        window.location.href = '/login';
      }
    } catch {}
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
    if (!res.ok) {
      let fields;
      if (data.errors) {
        fields = Array.isArray(data.errors)
          ? data.errors.reduce((acc, curr) => {
              if (curr.path) acc[curr.path] = curr.msg;
              return acc;
            }, {})
          : data.errors;
      }
      throw { code: res.status, message: data.message || 'API error', fields };
    }
    return data;
  } catch (err) {
    const error = {
      code: err.code || 'NETWORK_ERROR',
      message: err.message || 'Network error',
      fields: err.fields || err.fieldErrors,
    };
    errorHandler(error);
    throw error;
  }
}

let errorHandler = () => {};
export function setErrorHandler(handler) {
  errorHandler = typeof handler === 'function' ? handler : () => {};
}


import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache results for five minutes to limit network requests
      staleTime: 5 * 60 * 1000,
    },
  },
});

const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export class ApiError extends Error {
  constructor(message, code, fields) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.fields = fields;
  }
}

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

let cachedCsrfToken = '';
let pendingCsrfRequest = null;

async function requestCsrfToken() {
  const res = await fetch(`${API_URL}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Unable to fetch CSRF token');
  }
  const data = await res.json().catch(() => ({}));
  const token = typeof data.csrfToken === 'string' ? data.csrfToken : '';
  cachedCsrfToken = token;
  return token;
}

async function ensureCsrfToken() {
  const cookieToken = getCsrfTokenFromCookie();
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }
  if (!pendingCsrfRequest) {
    pendingCsrfRequest = requestCsrfToken().finally(() => {
      pendingCsrfRequest = null;
    });
  }
  try {
    return await pendingCsrfRequest;
  } catch (err) {
    cachedCsrfToken = '';
    throw err;
  }
}

async function refreshToken() {
  try {
    let token = getCsrfTokenFromCookie();
    if (!token) {
      token = await ensureCsrfToken();
    }
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
      if (
        typeof navigator === 'undefined' ||
        !navigator.userAgent.includes('jsdom')
      ) {
        window.location.href = '/login';
      }
    } catch {}
    return false;
  }
}

/**
 * Perform a JSON fetch to the API.
 * `options.timeout` (ms) aborts the request after the given delay (default 10 000).
 */
export async function api(path, options = {}, retry = true) {
  const { timeout = 10000, signal, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const headers = {
    ...(fetchOptions.headers || {}),
  };
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    let token = getCsrfTokenFromCookie();
    if (!token) {
      token = await ensureCsrfToken();
    }
    if (token) headers['CSRF-Token'] = token;
  }
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
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
      throw new ApiError(data.message || 'API error', res.status, fields);
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const error = new ApiError('Request timed out', 'ABORT_ERROR');
      errorHandler(error);
      throw error;
    }
    const error =
      err instanceof ApiError
        ? err
        : new ApiError(
            err.message || 'Network error',
            err.code || 'NETWORK_ERROR',
            err.fields || err.fieldErrors,
          );
    if (!(err instanceof ApiError) && err.stack) {
      error.stack = err.stack;
    }
    errorHandler(error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

let errorHandler = () => {};
export function setErrorHandler(handler) {
  errorHandler = typeof handler === 'function' ? handler : () => {};
}

export async function apiDownload(path, options = {}, retry = true) {
  const { timeout = 10000, signal, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const headers = { ...(fetchOptions.headers || {}) };
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    let token = getCsrfTokenFromCookie();
    if (!token) {
      token = await ensureCsrfToken();
    }
    if (token) headers['CSRF-Token'] = token;
  }
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
      signal: controller.signal,
    });
    if (res.status === 401 && retry) {
      const refreshed = await refreshToken();
      if (refreshed) {
        return apiDownload(path, options, false);
      }
    }
    if (!res.ok) {
      let message = 'API error';
      try {
        const data = await res.clone().json();
        message = data.message || message;
      } catch {
        try {
          message = await res.clone().text();
        } catch {}
      }
      throw new ApiError(message, res.status);
    }
    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match ? match[1] : undefined;
    return { blob, filename };
  } catch (err) {
    if (err.name === 'AbortError') {
      const error = new ApiError('Request timed out', 'ABORT_ERROR');
      errorHandler(error);
      throw error;
    }
    const error =
      err instanceof ApiError
        ? err
        : new ApiError(
            err.message || 'Network error',
            err.code || 'NETWORK_ERROR',
            err.fields || err.fieldErrors,
          );
    if (!(err instanceof ApiError) && err.stack) {
      error.stack = err.stack;
    }
    errorHandler(error);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

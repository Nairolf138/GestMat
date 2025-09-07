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
  const headers = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };
  const method = (fetchOptions.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = getCsrfToken();
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

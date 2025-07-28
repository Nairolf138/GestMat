const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, options = {}) {
  const token = localStorage.getItem('token');
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

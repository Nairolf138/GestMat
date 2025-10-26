function normalizeApiPrefix(raw) {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const withoutTrailing = trimmed.replace(/\/+$/u, '');
  if (!withoutTrailing) {
    return '';
  }
  const withoutLeading = withoutTrailing.replace(/^\/+/, '');
  if (!withoutLeading) {
    return '';
  }
  return `/${withoutLeading}`;
}

function getApiPrefix() {
  const raw = process.env.API_PREFIX ?? '/api';
  return normalizeApiPrefix(raw);
}

function withApiPrefix(path = '/') {
  const prefix = getApiPrefix();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!prefix) {
    return normalizedPath;
  }
  return `${prefix}${normalizedPath === '/' ? '' : normalizedPath}`;
}

module.exports = {
  getApiPrefix,
  withApiPrefix,
};

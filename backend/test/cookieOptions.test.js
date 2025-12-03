const test = require('node:test');
const assert = require('assert');

const cookieOptionsPath = '../src/utils/cookieOptions';
const configPath = '../src/config';

process.env.JWT_SECRET = 'test';

function loadCookieOptions() {
  delete require.cache[require.resolve(cookieOptionsPath)];
  delete require.cache[require.resolve(configPath)];
  return require(cookieOptionsPath).cookieOptions;
}

function withEnv(envOverrides, callback) {
  const originalEnv = {};

  for (const [key, value] of Object.entries(envOverrides)) {
    originalEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return callback();
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test('secure is true when API_URL uses https', () => {
  const options = withEnv({ API_URL: 'https://example.com/api' }, loadCookieOptions);
  assert.strictEqual(options.secure, true);
});

test('secure is false when API_URL uses http', () => {
  const options = withEnv({ API_URL: 'http://localhost:5000/api' }, loadCookieOptions);
  assert.strictEqual(options.secure, false);
});

test('sameSite defaults to lax', () => {
  const options = withEnv({ API_URL: 'http://localhost:5000/api', COOKIE_SAME_SITE: undefined }, loadCookieOptions);
  assert.strictEqual(options.sameSite, 'lax');
});

test('sameSite can be configured', () => {
  const options = withEnv(
    { API_URL: 'https://example.com/api', COOKIE_SAME_SITE: 'none' },
    loadCookieOptions,
  );
  assert.strictEqual(options.sameSite, 'none');
});

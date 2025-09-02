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

test('secure is true in production', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  const options = loadCookieOptions();
  assert.strictEqual(options.secure, true);
  process.env.NODE_ENV = originalEnv;
});

test('secure is false in non-production', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  const options = loadCookieOptions();
  assert.strictEqual(options.secure, false);
  process.env.NODE_ENV = originalEnv;
});

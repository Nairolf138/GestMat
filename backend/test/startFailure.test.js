const test = require('node:test');
const assert = require('assert');

test('start exits process if db connection fails', async () => {
  process.env.JWT_SECRET = 'test';
  const { start } = require('../src/index');
  let exitCode;
  const originalExit = process.exit;
  process.exit = (code) => { exitCode = code; };
  try {
    const server = await start(() => Promise.reject(new Error('db fail')));
    if (server) server.close();
  } finally {
    process.exit = originalExit;
    delete require.cache[require.resolve('../src/index')];
  }
  assert.strictEqual(exitCode, 1);
});

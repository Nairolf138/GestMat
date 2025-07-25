const test = require('node:test');
const assert = require('assert');
const { start } = require('../src/index');

// simulate connectDB failure and verify process exits

test('start exits process if db connection fails', async () => {
  let exitCode;
  const originalExit = process.exit;
  process.exit = (code) => { exitCode = code; };
  try {
    await start(() => Promise.reject(new Error('db fail')));
  } finally {
    process.exit = originalExit;
  }
  assert.strictEqual(exitCode, 1);
});

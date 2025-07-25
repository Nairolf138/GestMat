const test = require('node:test');
const assert = require('assert');

// ensure server fails to load when JWT_SECRET is not defined

test('server fails to start without JWT_SECRET', () => {
  const original = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  const indexPath = require.resolve('../src/index');
  delete require.cache[indexPath];
  assert.throws(() => require('../src/index'), /JWT_SECRET/);
  if (original !== undefined) {
    process.env.JWT_SECRET = original;
  } else {
    delete process.env.JWT_SECRET;
  }
  delete require.cache[indexPath];
});

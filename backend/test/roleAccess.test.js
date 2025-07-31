const test = require('node:test');
const assert = require('assert');
const { canModify } = require('../src/utils/roleAccess');

test('Autre role permissions', () => {
  assert.strictEqual(canModify('Autre', 'Autre'), true);
  assert.strictEqual(canModify('Autre', 'Son'), false);
});

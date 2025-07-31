const test = require('node:test');
const assert = require('assert');
const { canModify } = require('../src/utils/roleAccess');

test('Autre role permissions allow all types', () => {
  assert.strictEqual(canModify('Autre', 'Son'), true);
  assert.strictEqual(canModify('Autre', 'Lumière'), true);
});

test('Régisseur(se) Son permissions', () => {
  assert.strictEqual(canModify('Régisseur(se) Son', 'Son'), true);
  assert.strictEqual(canModify('Régisseur(se) Son', 'Vidéo'), true);
  assert.strictEqual(canModify('Régisseur(se) Son', 'Plateau'), false);
});

test('Régisseur(se) Plateau permissions', () => {
  assert.strictEqual(canModify('Régisseur(se) Plateau', 'Autre'), true);
  assert.strictEqual(canModify('Régisseur(se) Plateau', 'Son'), false);
});

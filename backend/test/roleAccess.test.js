const test = require('node:test');
const assert = require('assert');
const { canModify, ALL_TYPES, roleMap } = require('../src/utils/roleAccess');
const roles = require('../src/config/roles');

test('Autre role permissions allow all types', () => {
  assert.strictEqual(canModify('Autre', 'Son'), true);
  assert.strictEqual(canModify('Autre', 'Lumière'), true);
});

test('Regisseur Son permissions', () => {
  assert.strictEqual(canModify('Régisseur(se) Son', 'Son'), true);
  assert.strictEqual(canModify('Régisseur(se) Son', 'Vidéo'), true);
  assert.strictEqual(canModify('Régisseur(se) Son', 'Plateau'), false);
});

test('Regisseur Lumiere permissions', () => {
  assert.strictEqual(canModify('Régisseur(se) Lumière', 'Lumière'), true);
  assert.strictEqual(canModify('Régisseur(se) Lumière', 'Son'), false);
});

test('Regisseur Plateau permissions', () => {
  assert.strictEqual(canModify('Régisseur(se) Plateau', 'Autre'), true);
  assert.strictEqual(canModify('Régisseur(se) Plateau', 'Son'), false);
});

test('Regisseur General permissions cover all types', () => {
  for (const type of ALL_TYPES) {
    assert.strictEqual(canModify('Régisseur(se) Général(e)', type), true);
  }
});

const exportedRoles = new Set(
  Object.values(roles).filter((role) => typeof role === 'string'),
);

test('roleMap includes all roles from config', () => {
  for (const role of exportedRoles) {
    assert.ok(roleMap[role], `${role} missing from roleMap`);
  }
});

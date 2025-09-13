const test = require('node:test');
const assert = require('assert');
const { canModify, ALL_TYPES, roleMap } = require('../src/utils/roleAccess');
const roles = require('../src/config/roles');
const {
  AUTRE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  REGISSEUR_GENERAL_ROLE,
} = roles;

test('Autre role permissions allow all types', () => {
  assert.strictEqual(canModify(AUTRE_ROLE, 'Son'), true);
  assert.strictEqual(canModify(AUTRE_ROLE, 'Lumière'), true);
});

test('Regisseur Son permissions', () => {
  assert.strictEqual(canModify(REGISSEUR_SON_ROLE, 'Son'), true);
  assert.strictEqual(canModify(REGISSEUR_SON_ROLE, 'Vidéo'), true);
  assert.strictEqual(canModify(REGISSEUR_SON_ROLE, 'Plateau'), false);
});

test('Regisseur Lumiere permissions', () => {
  assert.strictEqual(canModify(REGISSEUR_LUMIERE_ROLE, 'Lumière'), true);
  assert.strictEqual(canModify(REGISSEUR_LUMIERE_ROLE, 'Son'), false);
});

test('Regisseur Plateau permissions', () => {
  assert.strictEqual(canModify(REGISSEUR_PLATEAU_ROLE, 'Autre'), true);
  assert.strictEqual(canModify(REGISSEUR_PLATEAU_ROLE, 'Son'), false);
});

test('Regisseur General permissions cover all types', () => {
  for (const type of ALL_TYPES) {
    assert.strictEqual(canModify(REGISSEUR_GENERAL_ROLE, type), true);
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

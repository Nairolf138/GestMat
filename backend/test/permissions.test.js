const test = require('node:test');
const assert = require('assert');
const permissions = require('../src/config/permissions');
const roles = require('../src/config/roles');

test('MANAGE_LOANS includes all regisseur roles', () => {
  const { PERMISSIONS, MANAGE_LOANS } = permissions;
  const {
    REGISSEUR_GENERAL_ROLE,
    REGISSEUR_LUMIERE_ROLE,
    REGISSEUR_SON_ROLE,
    REGISSEUR_PLATEAU_ROLE,
  } = roles;
  const allowed = new Set(PERMISSIONS[MANAGE_LOANS]);
  [
    REGISSEUR_GENERAL_ROLE,
    REGISSEUR_LUMIERE_ROLE,
    REGISSEUR_SON_ROLE,
    REGISSEUR_PLATEAU_ROLE,
  ].forEach((role) => {
    assert.ok(allowed.has(role), `${role} missing from MANAGE_LOANS`);
  });
});

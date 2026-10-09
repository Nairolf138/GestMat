const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./utils/workflowFixture');
const {
  createLoanRequest,
  listLoans,
  updateLoanRequest,
  deleteLoanRequest,
} = require('../src/services/loanService');
test('equipment requests follow the complete current role/domain matrix', async (t) => {
  const f = await fixture(t);
  await createLoanRequest(
    f.db,
    f.payload(['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre']),
    f.user('requester'),
  );
  const matrix = {
    general: ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'],
    sound: ['Son', 'Vidéo', 'Autre'],
    light: ['Lumière', 'Vidéo', 'Autre'],
    stage: ['Plateau', 'Vidéo', 'Autre'],
    other: ['Autre'],
    outside: [],
  };
  for (const [name, types] of Object.entries(matrix)) {
    const loans = await listLoans(f.db, f.user(name));
    assert.deepEqual(
      loans.flatMap((loan) => loan.items.map((item) => item.equipment.type)),
      types,
      name,
    );
  }
});
test('a new occupant handles preceding requests regardless of their author; Autre never gains Son rights', async (t) => {
  const f = await fixture(t);
  const loan = await createLoanRequest(
    f.db,
    f.payload(['Autre']),
    f.user('requester'),
  );
  const decision = await updateLoanRequest(
    f.db,
    f.user('other'),
    loan._id.toString(),
    { status: 'accepted' },
  );
  assert.equal(decision.status, 'accepted');
  const sound = await createLoanRequest(
    f.db,
    f.payload(['Son']),
    f.user('requester'),
  );
  await assert.rejects(
    updateLoanRequest(f.db, f.user('other'), sound._id.toString(), {
      status: 'accepted',
    }),
    /eligible|denied/,
  );
  await assert.rejects(
    deleteLoanRequest(f.db, f.user('outside'), sound._id.toString()),
    /denied/,
  );
});

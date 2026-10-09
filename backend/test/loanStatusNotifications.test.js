const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./utils/workflowFixture');
const {
  createLoanRequest,
  updateLoanRequest,
} = require('../src/services/loanService');
test('status mail targets only changed domains and keeps the deciding actor', async (t) => {
  const f = await fixture(t);
  const loan = await createLoanRequest(
    f.db,
    f.payload(['Son', 'Lumière']),
    f.user('requester'),
  );
  f.messages.length = 0;
  await updateLoanRequest(f.db, f.user('sound'), loan._id.toString(), {
    status: 'refused',
    decisionNote: 'Indisponible',
  });
  assert.deepEqual(
    f.messages
      .filter((mail) => mail.to)
      .map((mail) => mail.to)
      .sort(),
    ['general@example.test', 'requester@example.test', 'sound@example.test'],
  );
  assert.equal(f.messages.filter((mail) => mail.bcc).length, 1);
  for (const mail of f.messages) {
    assert.ok(mail.text.includes('sound Person'));
    assert.ok(mail.text.includes('Indisponible'));
    assert.ok(!mail.text.includes('Lumière x'));
  }
});
test('archive still receives one event when no ordinary address remains', async (t) => {
  const f = await fixture(t);
  const loan = await createLoanRequest(f.db, f.payload(), f.user('requester'));
  await f.db.collection('users').updateMany({}, { $unset: { email: '' } });
  f.messages.length = 0;
  await updateLoanRequest(f.db, f.user('sound'), loan._id.toString(), {
    status: 'accepted',
  });
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].bcc, 'archive@example.test');
  assert.equal(f.messages[0].to, undefined);
});

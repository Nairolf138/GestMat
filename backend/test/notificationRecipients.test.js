const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./utils/workflowFixture');
const {
  getLoanNotificationTargets,
  getLoanRecipientsByRole,
} = require('../src/utils/getLoanRecipients');
test('notification preferences and domains both restrict recipients', async (t) => {
  const f = await fixture(t);
  await f.db.collection('users').updateOne(
    { _id: f.accounts.requester._id },
    {
      $set: {
        preferences: { emailNotifications: { returnReminders: false } },
      },
    },
  );
  const trace = [];
  const targets = await getLoanNotificationTargets(
    f.db,
    f.payload(['Son']),
    'returnReminders',
    { requireSystemAlerts: true, trace: (entry) => trace.push(entry) },
  );
  assert.deepEqual(targets.map((target) => target.email).sort(), [
    'general@example.test',
    'sound@example.test',
  ]);
  assert.ok(
    trace.some(
      (entry) =>
        entry.identifier === f.accounts.requester._id.toString() &&
        entry.reason.includes('opt-out'),
    ),
  );
});
test('vehicles target only requester and named managers, deduplicating identical addresses', async (t) => {
  const f = await fixture(t);
  const vehicle = (
    await f.db.collection('vehicles').insertOne({
      name: 'Van',
      structure: f.owner,
      managerIds: [f.accounts.outside._id],
    })
  ).insertedId;
  await f.db
    .collection('users')
    .updateOne(
      { _id: f.accounts.requester._id },
      { $set: { email: f.accounts.outside.email } },
    );
  const groups = await getLoanRecipientsByRole(
    f.db,
    [{ kind: 'vehicle', vehicle }],
    {
      ownerId: f.owner.toString(),
      borrowerId: f.borrower.toString(),
      requestedById: f.accounts.requester._id.toString(),
    },
  );
  assert.deepEqual(
    [
      ...groups.ownerRecipients,
      ...groups.borrowerRecipients,
      ...groups.requesterRecipients,
    ],
    ['outside@example.test'],
  );
});

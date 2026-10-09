const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./utils/workflowFixture');
const {
  migrateVehicleManagers,
} = require('../src/services/vehicleManagerMigration');
test('dry-run writes nothing; apply assigns all owner Generals, preserves manual managers and is idempotent', async (t) => {
  const f = await fixture(t);
  const legacy = (
    await f.db
      .collection('vehicles')
      .insertOne({ name: 'Legacy', structure: f.owner })
  ).insertedId;
  const manual = (
    await f.db.collection('vehicles').insertOne({
      name: 'Manual',
      structure: f.owner,
      managerIds: [f.accounts.outside._id],
    })
  ).insertedId;
  const report = await migrateVehicleManagers(f.db);
  assert.equal(report.planned.length, 1);
  assert.equal(report.blocked.length, 0);
  assert.equal(
    (await f.db.collection('vehicles').findOne({ _id: legacy })).managerIds,
    undefined,
  );
  await migrateVehicleManagers(f.db, true);
  assert.deepEqual(
    (await f.db.collection('vehicles').findOne({ _id: legacy })).managerIds,
    [f.accounts.general._id],
  );
  assert.deepEqual(
    (await f.db.collection('vehicles').findOne({ _id: manual })).managerIds,
    [f.accounts.outside._id],
  );
  assert.equal((await migrateVehicleManagers(f.db, true)).planned.length, 0);
});
test('a missing responsible person blocks the entire apply without a partial migration', async (t) => {
  const f = await fixture(t);
  await f.db.collection('vehicles').insertMany([
    { name: 'Valid', structure: f.owner },
    { name: 'Orphan', structure: f.borrower },
  ]);
  await f.db.collection('users').deleteOne({ _id: f.accounts.requester._id });
  const report = await migrateVehicleManagers(f.db);
  assert.equal(report.blocked.length, 1);
  await assert.rejects(migrateVehicleManagers(f.db, true), /blocked/);
  assert.equal(
    await f.db
      .collection('vehicles')
      .countDocuments({ managerIds: { $exists: true } }),
    0,
  );
});

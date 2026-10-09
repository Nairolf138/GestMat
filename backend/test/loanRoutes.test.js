const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { ObjectId } = require('mongodb');
const { fixture, withApiPrefix: api } = require('./utils/workflowFixture');
const {
  checkEquipmentAvailability,
} = require('../src/utils/checkAvailability');
test('HTTP lifecycle reserves stock, records a decision, archives deletion and releases stock', async (t) => {
  const f = await fixture(t);
  const created = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send({ ...f.payload(), note: 'Fragile' })
      .expect(200)
  ).body;
  const path = api(`/loans/${created._id}`);
  assert.equal(created.note, 'Fragile');
  assert.equal(
    (
      await checkEquipmentAvailability(
        f.db,
        f.equipment.Son._id.toString(),
        new Date(f.startDate),
        new Date(f.endDate),
        1,
      )
    ).availableQty,
    6,
  );
  const accepted = (
    await request(f.app)
      .put(path)
      .set(f.headers('sound'))
      .send({ status: 'accepted', decisionNote: 'Disponible' })
      .expect(200)
  ).body;
  assert.equal(accepted.items[0].decision.actor.firstName, 'sound');
  assert.equal(accepted.items[0].decision.note, 'Disponible');
  await request(f.app).delete(path).set(f.headers('requester')).expect(200);
  const listing = await request(f.app)
    .get(api('/loans'))
    .set(f.headers('requester'));
  assert.equal(listing.status, 200, JSON.stringify(listing.body));
  assert.equal(listing.body.length, 0);
  const archived = (
    await request(f.app).get(path).set(f.headers('requester')).expect(200)
  ).body;
  assert.equal(archived.archived, true);
  assert.ok(archived.history.some((entry) => entry.action === 'deleted'));
  assert.equal(
    (
      await checkEquipmentAvailability(
        f.db,
        f.equipment.Son._id.toString(),
        new Date(f.startDate),
        new Date(f.endDate),
        1,
      )
    ).availableQty,
    10,
  );
});
test('missing or unrelated requests cannot be read, modified or deleted', async (t) => {
  const f = await fixture(t);
  await request(f.app)
    .get(api(`/loans/${new ObjectId()}`))
    .set(f.headers('requester'))
    .expect(404);
  const loan = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send(f.payload())
      .expect(200)
  ).body;
  await request(f.app)
    .get(api(`/loans/${loan._id}`))
    .set(f.headers('outside'))
    .expect(404);
  await request(f.app)
    .delete(api(`/loans/${loan._id}`))
    .set(f.headers('outside'))
    .expect(403);
  assert.ok(
    await f.db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(loan._id) }),
  );
});
test('direct equipment entry is accepted by its authorized owner; own equipment request is refused', async (t) => {
  const f = await fixture(t);
  const result = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('sound'))
      .send({ ...f.payload(), direct: true })
      .expect(200)
  ).body;
  assert.equal(result.status, 'accepted');
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('sound'))
    .send({ ...f.payload(), borrower: f.owner.toString() })
    .expect(403);
});

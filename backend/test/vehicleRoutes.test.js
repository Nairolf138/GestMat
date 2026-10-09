const { test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { fixture, withApiPrefix: api } = require('./utils/workflowFixture');
test('vehicle metadata is optional; named manager across structures controls editing and deletion', async (t) => {
  const f = await fixture(t);
  const created = (
    await request(f.app)
      .post(api('/vehicles'))
      .set(f.headers('general'))
      .send({
        name: 'Van',
        structure: f.owner.toString(),
        managerIds: [f.accounts.outside._id.toString()],
      })
      .expect(200)
  ).body;
  const path = api(`/vehicles/${created._id}`);
  assert.equal(created.status, 'available');
  assert.equal(created.usage, undefined);
  const publicView = (
    await request(f.app).get(path).set(f.headers('other')).expect(200)
  ).body;
  assert.equal(publicView.permissions.canEdit, false);
  await request(f.app)
    .put(path)
    .set(f.headers('general'))
    .send({ name: 'Unauthorized edit' })
    .expect(403);
  await request(f.app)
    .put(path)
    .set(f.headers('outside'))
    .send({
      status: 'maintenance',
      maintenance: { nextServiceDate: '2099-01-01' },
    })
    .expect(200);
  await request(f.app).delete(path).set(f.headers('outside')).expect(200);
});
test('only admin or owner General assigns managers, from all structures; protected fields rejected', async (t) => {
  const f = await fixture(t);
  const created = (
    await request(f.app)
      .post(api('/vehicles'))
      .set(f.headers('general'))
      .send({ name: 'Van', structure: f.owner.toString() })
      .expect(200)
  ).body;
  assert.deepEqual(created.managerIds, [f.accounts.general._id.toString()]);
  const path = api(`/vehicles/${created._id}`);
  const candidates = (
    await request(f.app)
      .get(api(`/vehicles/manager-candidates?vehicleId=${created._id}`))
      .set(f.headers('general'))
      .expect(200)
  ).body;
  assert.ok(
    candidates.some(
      (candidate) => candidate._id === f.accounts.outside._id.toString(),
    ),
  );
  await request(f.app)
    .put(path)
    .set(f.headers('outside'))
    .send({ managerIds: [f.accounts.outside._id.toString()] })
    .expect(403);
  await request(f.app)
    .put(path)
    .set(f.headers('general'))
    .send({ managerIds: [f.accounts.outside._id.toString()] })
    .expect(200);
  await request(f.app)
    .put(path)
    .set(f.headers('outside'))
    .send({ reservations: [] })
    .expect(400);
  await request(f.app)
    .put(path)
    .set(f.headers('outside'))
    .send({ structure: f.outside.toString() })
    .expect(403);
  await request(f.app)
    .delete(api(`/users/${f.accounts.outside._id}`))
    .set(f.headers('admin'))
    .expect(409);
});
test('invalid usage and missing managers are rejected; all accounts can browse availability', async (t) => {
  const f = await fixture(t);
  await request(f.app)
    .post(api('/vehicles'))
    .set(f.headers('general'))
    .send({ name: 'Van', usage: 'invalid', structure: f.owner.toString() })
    .expect(400);
  await request(f.app)
    .post(api('/vehicles'))
    .set(f.headers('stage'))
    .send({ name: 'Van', structure: f.owner.toString() })
    .expect(403);
  await request(f.app)
    .post(api('/vehicles'))
    .set(f.headers('general'))
    .send({ name: 'Van', structure: f.owner.toString(), managerIds: [] })
    .expect(400);
  await request(f.app)
    .post(api('/vehicles'))
    .set(f.headers('general'))
    .send({ name: 'Van', structure: f.owner.toString() })
    .expect(200);
  const result = (
    await request(f.app)
      .get(
        api(
          `/vehicles?availableStart=${f.startDate}&availableEnd=${f.endDate}`,
        ),
      )
      .set(f.headers('other'))
      .expect(200)
  ).body;
  assert.equal(result.length, 1);
});

test('a manager cannot delete a vehicle while a reservation still needs a decision', async (t) => {
  const f = await fixture(t);
  const vehicle = (
    await request(f.app)
      .post(api('/vehicles'))
      .set(f.headers('general'))
      .send({ name: 'Van', structure: f.owner.toString() })
      .expect(200)
  ).body;
  const booking = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send({
        owner: f.owner.toString(),
        borrower: f.borrower.toString(),
        startDate: f.startDate,
        endDate: f.endDate,
        items: [{ kind: 'vehicle', vehicle: vehicle._id, quantity: 1 }],
      })
      .expect(200)
  ).body;
  const path = api(`/vehicles/${vehicle._id}`);
  await request(f.app).delete(path).set(f.headers('general')).expect(400);
  await request(f.app)
    .put(api(`/loans/${booking._id}`))
    .set(f.headers('general'))
    .send({
      decisions: [{ lineId: booking.items[0].lineId, status: 'refused' }],
    })
    .expect(200);
  await request(f.app).delete(path).set(f.headers('general')).expect(200);
});

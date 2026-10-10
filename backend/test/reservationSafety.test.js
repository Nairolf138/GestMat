const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { ObjectId } = require('mongodb');
const { fixture, withApiPrefix: api } = require('./utils/workflowFixture');

test('usable inventory stock and inclusive end day protect same-day loans', async (t) => {
  const f = await fixture(t);
  const equipment = f.equipment.Son;
  await f.db
    .collection('equipments')
    .updateOne(
      { _id: equipment._id },
      { $set: { totalQty: 5, availableQty: 2 } },
    );
  const first = {
    owner: f.owner.toString(),
    borrower: f.borrower.toString(),
    startDate: '2099-01-01',
    endDate: '2099-01-01',
    items: [{ equipment: equipment._id.toString(), quantity: 1 }],
  };
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send(first)
    .expect(200);
  const onDay = (
    await request(f.app)
      .get(
        api(
          `/equipments/${equipment._id}/availability?start=2099-01-01&end=2099-01-01`,
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.equal(onDay.availableQty, 1);
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send({
      ...first,
      items: [{ equipment: equipment._id.toString(), quantity: 2 }],
    })
    .expect(400);
  const nextDay = (
    await request(f.app)
      .get(
        api(
          `/equipments/${equipment._id}/availability?start=2099-01-02&end=2099-01-02`,
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.equal(nextDay.availableQty, 2);
  const inventory = (
    await request(f.app)
      .get(api('/equipments?all=true&startDate=2099-01-01&endDate=2099-01-01'))
      .set(f.headers('general'))
      .expect(200)
  ).body;
  const row = inventory.find((item) => item._id === equipment._id.toString());
  assert.equal(row.availableQty, 2);
  assert.equal(row.availability, '1/5');
});

test('vehicle hours allow an adjacent booking and reject an overlapping one', async (t) => {
  const f = await fixture(t);
  const vehicle = (
    await request(f.app)
      .post(api('/vehicles'))
      .set(f.headers('general'))
      .send({ name: 'VL', structure: f.owner.toString() })
      .expect(200)
  ).body;
  const booking = (startDate, endDate) => ({
    owner: f.owner.toString(),
    borrower: f.borrower.toString(),
    startDate,
    endDate,
    timeZone: 'Europe/Paris',
    items: [{ kind: 'vehicle', vehicle: vehicle._id }],
  });
  const first = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send(booking('2099-01-01T08:00:00.000Z', '2099-01-01T11:00:00.000Z'))
      .expect(200)
  ).body;
  assert.equal(first.reservationMode, 'time');
  assert.equal(first.timeZone, 'Europe/Paris');
  assert.ok(
    f.messages.some(
      (message) =>
        message.text?.includes('09:00') &&
        message.text?.includes('Europe/Paris'),
    ),
  );
  await request(f.app)
    .put(api(`/loans/${first._id}`))
    .set(f.headers('general'))
    .send({
      decisions: [{ lineId: first.items[0].lineId, status: 'accepted' }],
    })
    .expect(200);
  const storedVehicle = await f.db
    .collection('vehicles')
    .findOne({ _id: new ObjectId(vehicle._id) });
  assert.equal(storedVehicle.reservations[0].timeZone, 'Europe/Paris');
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send(booking('2099-01-01T10:00:00.000Z', '2099-01-01T12:00:00.000Z'))
    .expect(400);
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send(booking('2099-01-01T11:00:00.000Z', '2099-01-01T13:00:00.000Z'))
    .expect(200);
  const available = (
    await request(f.app)
      .get(
        api(
          '/vehicles?availableStart=2099-01-01T11:00:00.000Z&availableEnd=2099-01-01T13:00:00.000Z',
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.ok(available.some((item) => item._id === vehicle._id));
  const unavailable = (
    await request(f.app)
      .get(
        api(
          '/vehicles?availableStart=2099-01-01T10:00:00.000Z&availableEnd=2099-01-01T12:00:00.000Z',
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.ok(!unavailable.some((item) => item._id === vehicle._id));
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send(booking('2099-01-01T08:00:00.000Z', '2099-01-01T08:00:00.000Z'))
    .expect(400);
});

test('replaying a cart group creates one loan and rejects changed content', async (t) => {
  const f = await fixture(t);
  await f.db.collection('loanrequests').createIndex(
    { requestedBy: 1, clientRequestId: 1 },
    {
      unique: true,
      partialFilterExpression: { clientRequestId: { $type: 'string' } },
    },
  );
  const body = {
    ...f.payload(),
    clientRequestId: 'b72450ee-4b87-43a0-bbdc-3d8137072781',
  };
  const first = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send(body)
      .expect(200)
  ).body;
  const again = (
    await request(f.app)
      .post(api('/loans'))
      .set(f.headers('requester'))
      .send(body)
      .expect(200)
  ).body;
  assert.equal(again._id, first._id);
  assert.equal(
    await f.db
      .collection('loanrequests')
      .countDocuments({ clientRequestId: body.clientRequestId }),
    1,
  );
  await request(f.app)
    .post(api('/loans'))
    .set(f.headers('requester'))
    .send({ ...body, note: 'changed' })
    .expect(400);
});

test('legacy calendar reservations still occupy their final day', async (t) => {
  const f = await fixture(t);
  await f.db.collection('loanrequests').insertOne({
    owner: f.owner,
    borrower: f.borrower,
    status: 'accepted',
    startDate: new Date('2099-02-01T00:00:00.000Z'),
    endDate: new Date('2099-02-02T00:00:00.000Z'),
    items: [
      {
        equipment: f.equipment.Son._id,
        quantity: 10,
        decision: { status: 'accepted' },
      },
    ],
  });
  const endDay = (
    await request(f.app)
      .get(
        api(
          `/equipments/${f.equipment.Son._id}/availability?start=2099-02-02&end=2099-02-02`,
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.equal(endDay.availableQty, 0);
  const followingDay = (
    await request(f.app)
      .get(
        api(
          `/equipments/${f.equipment.Son._id}/availability?start=2099-02-03&end=2099-02-03`,
        ),
      )
      .set(f.headers('requester'))
      .expect(200)
  ).body;
  assert.equal(followingDay.availableQty, 10);
});

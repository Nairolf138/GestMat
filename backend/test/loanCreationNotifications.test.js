process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { ADMIN_ROLE } = require('../src/config/roles');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('loan creation stores note and includes it in notification emails', async () => {
  const { db, client, mongod } = await createDb();

  const [owner, borrower] = await Promise.all([
    db.collection('structures').insertOne({ name: 'Owner' }),
    db.collection('structures').insertOne({ name: 'Borrower' }),
  ]);

  const equipment = await db.collection('equipments').insertOne({
    name: 'Camera',
    type: 'Video',
    totalQty: 2,
    structure: owner.insertedId,
  });

  const requesterId = new ObjectId();
  await db.collection('users').insertMany([
    {
      _id: requesterId,
      structure: borrower.insertedId,
      role: ADMIN_ROLE,
      email: 'requester@example.test',
    },
    {
      _id: new ObjectId(),
      structure: owner.insertedId,
      role: ADMIN_ROLE,
      email: 'owner@example.test',
    },
  ]);

  const mailer = require('../src/utils/sendMail');
  const sent = [];
  const originalNotify = process.env.NOTIFY_EMAIL;
  const originalSendMail = mailer.sendMail;
  process.env.NOTIFY_EMAIL = 'notify@example.test';
  mailer.sendMail = async (options) => {
    sent.push(options);
  };

  const payload = {
    owner: owner.insertedId.toString(),
    borrower: borrower.insertedId.toString(),
    items: [{ equipment: equipment.insertedId.toString(), quantity: 1 }],
    startDate: '2024-02-01',
    endDate: '2024-02-03',
    note: 'Handle with care',
  };

  const { createLoanRequest } = require('../src/services/loanService');
  const loan = await createLoanRequest(
    db,
    { id: requesterId.toString(), role: ADMIN_ROLE },
    payload,
  );

  const stored = await db
    .collection('loanrequests')
    .findOne({ _id: loan._id });
  assert.strictEqual(loan.note, payload.note);
  assert.strictEqual(stored.note, payload.note);

  assert.ok(sent.length > 0, 'a creation email should be sent');
  assert.ok(
    sent.some((message) => String(message.text).includes(payload.note)),
    'the plain-text email should include the note',
  );
  assert.ok(
    sent.some((message) => String(message.html).includes(payload.note)),
    'the HTML email should include the note',
  );

  mailer.sendMail = originalSendMail;
  process.env.NOTIFY_EMAIL = originalNotify;
  await client.close();
  await mongod.stop();
});

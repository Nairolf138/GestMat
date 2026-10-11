process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { REGISSEUR_GENERAL_ROLE } = require('../src/config/roles');
const mailer = require('../src/utils/sendMail');
const {
  queueMail,
  processMailOutbox,
} = require('../src/services/mailOutboxService');

test('the outbox retries only failed recipients and deduplicates repeated events', async (t) => {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  t.after(async () => {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  });
  const db = client.db();
  const originalSendMail = mailer.sendMail;
  const sent = [];
  let failSecond = true;
  mailer.sendMail = async (message) => {
    if (message.to === 'second@example.test' && failSecond) {
      failSecond = false;
      throw new Error('temporary SMTP failure');
    }
    sent.push(message.to);
  };

  const first = { to: 'first@example.test', subject: 'Décision', text: 'OK' };
  const second = { to: 'second@example.test', subject: 'Décision', text: 'OK' };
  await queueMail(db, 'loan:1:revision:2:first', first);
  await queueMail(db, 'loan:1:revision:2:second', second);
  await queueMail(db, 'loan:1:revision:2:first', first);
  await processMailOutbox(db);

  assert.deepEqual(sent, ['first@example.test']);
  assert.equal(await db.collection('mailOutbox').countDocuments(), 2);
  await db
    .collection('mailOutbox')
    .updateOne(
      { _id: 'loan:1:revision:2:second' },
      { $set: { nextAttemptAt: new Date(0) } },
    );
  await processMailOutbox(db);
  assert.deepEqual(sent, ['first@example.test', 'second@example.test']);
  assert.equal(
    await db.collection('mailOutbox').countDocuments({ status: 'sent' }),
    2,
  );
});

test('queued reminders are dropped after their date or source record changes', async (t) => {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const originalSendMail = mailer.sendMail;
  t.after(async () => {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  });
  const db = client.db();
  const sent = [];
  mailer.sendMail = async (message) => sent.push(message);
  const loanId = new ObjectId();
  const originalStart = new Date(Date.now() + 60 * 60 * 1000);
  await db.collection('loanrequests').insertOne({
    _id: loanId,
    status: 'accepted',
    startDate: new Date(originalStart.getTime() + 60 * 60 * 1000),
  });
  await queueMail(
    db,
    'stale-start',
    { to: 'user@example.test', subject: 'Rappel', text: 'Ancienne date' },
    originalStart,
    {
      kind: 'loan-start',
      resourceId: String(loanId),
      date: originalStart.toISOString(),
    },
  );
  await queueMail(
    db,
    'expired-start',
    { to: 'user@example.test', subject: 'Rappel', text: 'Trop tard' },
    new Date(0),
  );
  const changedLoanId = new ObjectId();
  await db.collection('loanrequests').insertOne({
    _id: changedLoanId,
    status: 'partial',
    startDate: originalStart,
    items: [{ lineId: 'old-line', decision: { status: 'refused' } }],
  });
  await queueMail(
    db,
    'changed-line',
    { to: 'user@example.test', subject: 'Rappel', text: 'Ancienne décision' },
    originalStart,
    {
      kind: 'loan-start',
      resourceId: String(changedLoanId),
      date: originalStart.toISOString(),
      lineIds: ['old-line'],
    },
  );
  await processMailOutbox(db);
  assert.equal(sent.length, 0);
  assert.equal(
    await db.collection('mailOutbox').countDocuments({ status: 'expired' }),
    3,
  );
});

test('a line decision survives an unrelated revision while stale creation and cancellation are handled', async (t) => {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const originalSendMail = mailer.sendMail;
  t.after(async () => {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  });
  const db = client.db();
  const loanId = new ObjectId();
  const firstAt = new Date();
  const secondAt = new Date(firstAt.getTime() + 1000);
  await db.collection('loanrequests').insertOne({
    _id: loanId,
    status: 'pending',
    revision: 2,
    items: [
      { lineId: 'son', decision: { status: 'accepted', at: firstAt } },
      { lineId: 'light', decision: { status: 'refused', at: secondAt } },
    ],
  });
  const sent = [];
  mailer.sendMail = async (message) => sent.push(message);
  const resourceId = String(loanId);
  await queueMail(
    db,
    'created',
    { to: 'user@example.test', subject: 'Création', text: 'old' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 0,
      eventType: 'state',
    },
  );
  await queueMail(
    db,
    'first-decision',
    { to: 'user@example.test', subject: 'Son', text: 'son accepted' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 1,
      eventType: 'decision',
      decisions: [
        { lineId: 'son', status: 'accepted', at: firstAt.toISOString() },
      ],
    },
  );
  await queueMail(
    db,
    'second-decision',
    { to: 'user@example.test', subject: 'Lumière', text: 'light refused' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 2,
      eventType: 'decision',
      decisions: [
        { lineId: 'light', status: 'refused', at: secondAt.toISOString() },
      ],
    },
  );
  await processMailOutbox(db);
  assert.deepEqual(
    sent.map((mail) => mail.text),
    ['son accepted', 'light refused'],
  );
  assert.equal(
    await db
      .collection('mailOutbox')
      .findOne({ _id: 'created' })
      .then((row) => row.status),
    'expired',
  );

  const archivedAt = new Date();
  await db.collection('loanrequests').updateOne(
    { _id: loanId },
    {
      $set: { archived: true, archivedAt, status: 'cancelled' },
    },
  );
  await queueMail(
    db,
    'late-edit',
    { to: 'user@example.test', subject: 'Modification', text: 'stale edit' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 2,
      eventType: 'state',
    },
  );
  await queueMail(
    db,
    'cancellation',
    { to: 'user@example.test', subject: 'Annulation', text: 'cancelled' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 2,
      eventType: 'cancelled',
      archivedAt: archivedAt.toISOString(),
    },
  );
  await processMailOutbox(db);
  assert.deepEqual(
    sent.map((mail) => mail.text),
    ['son accepted', 'light refused', 'cancelled'],
  );
  assert.equal(
    await db
      .collection('mailOutbox')
      .findOne({ _id: 'late-edit' })
      .then((row) => row.status),
    'expired',
  );
  await db.collection('users').insertOne({ email: 'archive@example.test' });
  await queueMail(
    db,
    'legacy-archive',
    { bcc: 'archive@example.test', subject: 'Archive', text: 'all lines' },
    undefined,
    {
      kind: 'loan-event',
      resourceId,
      revision: 2,
      eventType: 'cancelled',
      archivedAt: archivedAt.toISOString(),
    },
  );
  await processMailOutbox(db);
  assert.equal(sent.length, 3);
  assert.equal(
    await db
      .collection('mailOutbox')
      .findOne({ _id: 'legacy-archive' })
      .then((row) => row.status),
    'expired',
  );
});

test('a queued loan mail is dropped when its recipient loses access', async (t) => {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const originalSendMail = mailer.sendMail;
  t.after(async () => {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  });
  const db = client.db();
  const owner = new ObjectId();
  const borrower = new ObjectId();
  const outsider = new ObjectId();
  const userId = new ObjectId();
  const equipmentId = new ObjectId();
  const loanId = new ObjectId();
  await db.collection('structures').insertMany([
    { _id: owner, name: 'Owner' },
    { _id: borrower, name: 'Borrower' },
  ]);
  await db.collection('equipments').insertOne({
    _id: equipmentId,
    name: 'Console',
    type: 'Son',
    structure: owner,
  });
  await db.collection('users').insertOne({
    _id: userId,
    structure: owner,
    role: REGISSEUR_GENERAL_ROLE,
    email: 'manager@example.test',
  });
  const loan = {
    _id: loanId,
    owner,
    borrower,
    requestedBy: new ObjectId(),
    status: 'accepted',
    revision: 1,
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 48 * 60 * 60 * 1000),
    items: [
      {
        lineId: 'line-1',
        kind: 'equipment',
        equipment: equipmentId,
        quantity: 1,
        decision: { status: 'accepted' },
      },
    ],
  };
  await db.collection('loanrequests').insertOne(loan);
  const sent = [];
  mailer.sendMail = async () => {
    throw new Error('SMTP unavailable');
  };
  const { deliverLoanNotification } = require('../src/utils/getLoanRecipients');
  const { loanStatusTemplate } = require('../src/utils/mailTemplates');
  await deliverLoanNotification(
    db,
    loan,
    ({ loan: scopedLoan, role }) =>
      loanStatusTemplate({ loan: scopedLoan, role, status: 'accepted' }),
    'loanStatusChanges',
    { eventKey: `loan:${loanId}:revision:1` },
  );
  await db
    .collection('users')
    .updateOne({ _id: userId }, { $set: { structure: outsider } });
  mailer.sendMail = async (message) => sent.push(message);
  await db
    .collection('mailOutbox')
    .updateOne(
      { _id: `loan:${loanId}:revision:1:recipient:manager@example.test` },
      { $set: { nextAttemptAt: new Date(0) } },
    );
  await processMailOutbox(db);
  assert.equal(sent.length, 0);
  assert.equal(
    await db.collection('mailOutbox').countDocuments({ status: 'expired' }),
    1,
  );
});

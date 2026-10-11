process.env.JWT_SECRET = 'test';
process.env.API_URL = 'http://localhost:5000/api';

const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('overdue loan alerts respect systemAlerts preference', async () => {
  const { db, client, mongod } = await createDb();
  const owner = await db.collection('structures').insertOne({ name: 'Owner' });
  const borrower = await db
    .collection('structures')
    .insertOne({ name: 'Borrower' });
  const equipment = await db.collection('equipments').insertOne({
    name: 'Console',
    type: 'Lumiere',
    structure: owner.insertedId,
  });

  await db.collection('users').insertOne({
    structure: owner.insertedId,
    role: 'ADMIN',
    email: 'owner@example.test',
    preferences: {
      emailNotifications: {
        accountUpdates: true,
        loanRequests: true,
        loanStatusChanges: true,
        returnReminders: true,
        systemAlerts: false,
      },
    },
  });

  await db.collection('loanrequests').insertOne({
    owner: owner.insertedId,
    borrower: borrower.insertedId,
    items: [{ equipment: equipment.insertedId, quantity: 1 }],
    requestedBy: new ObjectId(),
    status: 'accepted',
    startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  const mailer = require('../src/utils/sendMail');
  const sent = [];
  mailer.sendMail = async (options) => {
    sent.push(options);
  };

  const { processOverdueLoans } = require('../src/services/overdueService');
  await processOverdueLoans(db);

  assert.strictEqual(sent.length, 0);

  await client.close();
  await mongod.stop();
});

test('annual report emails exclude members without system alerts', async () => {
  const { db, client, mongod } = await createDb();
  const structureId = new ObjectId();
  await db
    .collection('structures')
    .insertOne({ _id: structureId, name: 'Structure A' });

  await db.collection('users').insertOne({
    structure: structureId,
    role: 'ADMIN',
    email: 'member@example.test',
    preferences: {
      emailNotifications: {
        accountUpdates: true,
        loanRequests: true,
        loanStatusChanges: true,
        returnReminders: true,
        systemAlerts: false,
      },
    },
  });

  await db.collection('loanrequests').insertOne({
    owner: structureId,
    borrower: structureId,
    status: 'accepted',
    startDate: new Date('2024-02-01T00:00:00Z'),
    endDate: new Date('2024-02-05T00:00:00Z'),
    items: [{ equipment: new ObjectId(), quantity: 1 }],
  });

  const mailer = require('../src/utils/sendMail');
  const sent = [];
  mailer.sendMail = async (options) => {
    sent.push(options);
  };

  const { generateAnnualReports } = require('../src/services/reportService');
  const result = await generateAnnualReports(db, {
    now: new Date('2024-09-15T12:00:00Z'),
    sendEmails: true,
  });

  assert.strictEqual(result.emailed, 0);
  assert.strictEqual(sent.length, 0);

  const storedReport = await db.collection('reports').findOne({ structureId });
  assert.ok(storedReport);
  assert.deepStrictEqual(storedReport.recipients, []);

  await client.close();
  await mongod.stop();
});

test('annual reports use private recipient envelopes and retry failed deliveries', async () => {
  const { db, client, mongod } = await createDb();
  try {
    const structureId = new ObjectId();
    await db.collection('structures').insertOne({
      _id: structureId,
      name: 'Structure A',
    });
    await db.collection('users').insertMany([
      { structure: structureId, email: 'one@example.test' },
      { structure: structureId, email: 'two@example.test' },
      {
        structure: structureId,
        email: 'no-report@example.test',
        preferences: { emailNotifications: { annualReports: false } },
      },
    ]);
    const mailer = require('../src/utils/sendMail');
    const originalSendMail = mailer.sendMail;
    const sent = [];
    let failSecond = true;
    mailer.sendMail = async (message) => {
      if (message.to === 'two@example.test' && failSecond) {
        failSecond = false;
        throw new Error('temporary SMTP failure');
      }
      sent.push(message);
    };
    try {
      const {
        generateAnnualReports,
      } = require('../src/services/reportService');
      const {
        processMailOutbox,
      } = require('../src/services/mailOutboxService');
      const result = await generateAnnualReports(db, {
        now: new Date('2024-09-15T12:00:00Z'),
      });
      assert.equal(result.emailed, 1);
      assert.deepEqual(
        sent.map((mail) => mail.to),
        ['one@example.test'],
      );
      assert.ok(sent[0].attachments?.[0]?.content);
      let report = await db.collection('reports').findOne({ structureId });
      assert.equal(report.sentAt, undefined);

      await db
        .collection('mailOutbox')
        .updateOne(
          { _id: `report:${report._id}:recipient:two@example.test` },
          { $set: { nextAttemptAt: new Date(0) } },
        );
      await processMailOutbox(db);
      report = await db.collection('reports').findOne({ structureId });
      assert.deepEqual(
        sent.map((mail) => mail.to),
        ['one@example.test', 'two@example.test'],
      );
      assert.ok(report.sentAt);
      assert.equal(report.deliveredRecipients.length, 2);
    } finally {
      mailer.sendMail = originalSendMail;
    }
  } finally {
    await client.close();
    await mongod.stop();
  }
});

test('a queued annual report is not sent after its recipient leaves the structure', async () => {
  const { db, client, mongod } = await createDb();
  const mailer = require('../src/utils/sendMail');
  const originalSendMail = mailer.sendMail;
  try {
    const structureId = new ObjectId();
    await db.collection('structures').insertOne({
      _id: structureId,
      name: 'Structure A',
    });
    const memberId = new ObjectId();
    await db.collection('users').insertOne({
      _id: memberId,
      structure: structureId,
      email: 'former-member@example.test',
    });
    mailer.sendMail = async () => {
      throw new Error('temporary SMTP failure');
    };
    const { generateAnnualReports } = require('../src/services/reportService');
    await generateAnnualReports(db, {
      now: new Date('2024-09-15T12:00:00Z'),
    });
    const report = await db.collection('reports').findOne({ structureId });
    assert.ok(report);

    await db
      .collection('users')
      .updateOne({ _id: memberId }, { $set: { structure: new ObjectId() } });
    const sent = [];
    mailer.sendMail = async (message) => sent.push(message);
    await db
      .collection('mailOutbox')
      .updateOne(
        { _id: `report:${report._id}:recipient:former-member@example.test` },
        { $set: { nextAttemptAt: new Date(0) } },
      );
    const { processMailOutbox } = require('../src/services/mailOutboxService');
    await processMailOutbox(db);
    assert.equal(sent.length, 0);
    assert.equal(
      await db.collection('mailOutbox').countDocuments({ status: 'expired' }),
      1,
    );
  } finally {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  }
});

test('legacy preview reports without a delivery flag are never emailed on a later run', async () => {
  const { db, client, mongod } = await createDb();
  const mailer = require('../src/utils/sendMail');
  const originalSendMail = mailer.sendMail;
  try {
    const structureId = new ObjectId();
    await db.collection('structures').insertOne({
      _id: structureId,
      name: 'Structure A',
      email: 'structure@example.test',
    });
    const {
      generateAnnualReports,
      getAnnualReportPeriod,
    } = require('../src/services/reportService');
    const period = getAnnualReportPeriod(new Date('2024-09-15T12:00:00Z'));
    await db.collection('reports').insertOne({
      structureId,
      periodStart: period.start,
      periodEnd: period.end,
      recipients: ['structure@example.test'],
      pdf: Buffer.from('legacy preview'),
    });
    const sent = [];
    mailer.sendMail = async (message) => sent.push(message);
    const result = await generateAnnualReports(db, {
      now: new Date('2024-09-15T12:00:00Z'),
      sendEmails: true,
    });
    assert.equal(result.skipped, 1);
    assert.equal(result.emailed, 0);
    assert.equal(sent.length, 0);
    assert.equal(await db.collection('mailOutbox').countDocuments(), 0);
  } finally {
    mailer.sendMail = originalSendMail;
    await client.close();
    await mongod.stop();
  }
});

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
  const borrower = await db.collection('structures').insertOne({ name: 'Borrower' });
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
  await db.collection('structures').insertOne({ _id: structureId, name: 'Structure A' });

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

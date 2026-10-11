process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const mailer = require('../src/utils/sendMail');
const {
  processVehicleComplianceReminders,
} = require('../src/services/vehicleComplianceService');

test('vehicle document reminders reach opted-in managers privately once', async (t) => {
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
  const managers = [new ObjectId(), new ObjectId(), new ObjectId()];
  await db.collection('users').insertMany([
    { _id: managers[0], email: 'one@example.test' },
    { _id: managers[1], email: 'two@example.test' },
    {
      _id: managers[2],
      email: 'opted-out@example.test',
      preferences: { emailNotifications: { vehicleReminders: false } },
    },
  ]);
  const expiryDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
  const vehicle = await db.collection('vehicles').insertOne({
    name: 'Clio',
    registrationNumber: 'AB-123-CD',
    managerIds: managers,
    insurance: { expiryDate },
  });
  const sent = [];
  mailer.sendMail = async (message) => sent.push(message);

  await processVehicleComplianceReminders(db);
  await processVehicleComplianceReminders(db);

  assert.deepEqual(sent.map((message) => message.to).sort(), [
    'one@example.test',
    'two@example.test',
  ]);
  assert.ok(sent.every((message) => !message.to.includes(',')));
  assert.ok(sent.every((message) => /assurance/i.test(message.subject)));
  assert.equal(
    await db.collection('mailOutbox').countDocuments({ status: 'sent' }),
    2,
  );
  const stored = await db.collection('vehicles').findOne({
    _id: vehicle.insertedId,
  });
  assert.ok(stored.complianceReminders.insuranceReminderSentAt);
});

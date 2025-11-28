process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { AUTRE_ROLE, ADMIN_ROLE } = require('../src/config/roles');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // ignore cache clear errors
  }
}

function reloadUsersRoute() {
  clearModule('../src/config');
  clearModule('../src/config/index');
  clearModule('../src/routes/users');
  return require('../src/routes/users');
}

function loadLoanServiceWithNotify(notifyEmail) {
  if (notifyEmail === undefined) {
    delete process.env.NOTIFY_EMAIL;
  } else {
    process.env.NOTIFY_EMAIL = notifyEmail;
  }

  clearModule('../src/config');
  clearModule('../src/config/index');
  clearModule('../src/services/loanService');

  return require('../src/services/loanService');
}

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('email notification preferences', async (t) => {
  await t.test('skips account update emails when disabled', async () => {
    delete process.env.NOTIFY_EMAIL;
    clearModule('../src/config');
    clearModule('../src/config/index');

    const mailer = require('../src/utils/sendMail');
    const sent = [];
    mailer.sendMail = async (options) => {
      sent.push(options);
    };

    const { notifyAccountUpdate } = reloadUsersRoute();

    await notifyAccountUpdate(
      {
        username: 'alice',
        email: 'alice@example.test',
        preferences: {
          emailNotifications: {
            accountUpdates: false,
            loanRequests: true,
            loanStatusChanges: true,
            returnReminders: true,
            systemAlerts: true,
          },
        },
      },
      ['mot de passe'],
    );

    assert.strictEqual(sent.length, 0);
  });

  await t.test('falls back to admin when user disabled account updates', async () => {
    process.env.NOTIFY_EMAIL = 'admin@example.test';
    clearModule('../src/config');
    clearModule('../src/config/index');

    const mailer = require('../src/utils/sendMail');
    const sent = [];
    mailer.sendMail = async (options) => {
      sent.push(options);
    };

    const { notifyAccountUpdate } = reloadUsersRoute();

    await notifyAccountUpdate(
      {
        username: 'bob',
        email: 'bob@example.test',
        preferences: {
          emailNotifications: {
            accountUpdates: false,
            loanRequests: true,
            loanStatusChanges: true,
            returnReminders: true,
            systemAlerts: true,
          },
        },
      },
      ['adresse e-mail'],
    );

    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].to, 'admin@example.test');
  });

  await t.test('ignores structure notifications when preferences are off', async () => {
    const { db, client, mongod } = await createDb();

    const [owner, borrower] = await Promise.all([
      db.collection('structures').insertOne({ name: 'Owner' }),
      db.collection('structures').insertOne({ name: 'Borrower' }),
    ]);

    const requesterId = new ObjectId();
    const equipment = await db.collection('equipments').insertOne({
      name: 'Console',
      type: 'Lumiere',
      structure: owner.insertedId,
    });

    await db.collection('users').insertMany([
      {
        _id: requesterId,
        structure: borrower.insertedId,
        role: AUTRE_ROLE,
        email: 'requester@example.test',
        preferences: {
          emailNotifications: {
            accountUpdates: true,
            structureUpdates: false,
            systemAlerts: true,
          },
        },
      },
      {
        _id: new ObjectId(),
        structure: owner.insertedId,
        role: AUTRE_ROLE,
        email: 'owner@example.test',
        preferences: {
          emailNotifications: {
            accountUpdates: true,
            structureUpdates: false,
            systemAlerts: true,
          },
        },
      },
    ]);

    const loan = await db.collection('loanrequests').insertOne({
      owner: owner.insertedId,
      borrower: borrower.insertedId,
      items: [{ equipment: equipment.insertedId, quantity: 1 }],
      requestedBy: requesterId,
      status: 'pending',
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    });

    const mailer = require('../src/utils/sendMail');
    const sent = [];
    mailer.sendMail = async (options) => {
      sent.push(options);
    };

    const { updateLoanRequest } = loadLoanServiceWithNotify(undefined);

    await updateLoanRequest(
      db,
      { id: new ObjectId().toString(), role: ADMIN_ROLE },
      loan.insertedId.toString(),
      { status: 'accepted' },
    );

    assert.strictEqual(sent.length, 0);

    await client.close();
    await mongod.stop();
  });
});

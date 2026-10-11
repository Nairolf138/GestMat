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
    const { db, client, mongod } = await createDb();
    const user = {
      _id: new ObjectId(),
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
    };
    await db.collection('users').insertOne(user);
    delete process.env.NOTIFY_EMAIL;
    clearModule('../src/config');
    clearModule('../src/config/index');

    const mailer = require('../src/utils/sendMail');
    const sent = [];
    mailer.sendMail = async (options) => {
      sent.push(options);
    };

    const { notifyAccountUpdate } = reloadUsersRoute();

    await notifyAccountUpdate(db, user, ['mot de passe']);

    assert.strictEqual(sent.length, 0);
    assert.strictEqual(await db.collection('mailOutbox').countDocuments(), 0);
    await client.close();
    await mongod.stop();
  });

  await t.test(
    'falls back to admin when user disabled account updates',
    async () => {
      const { db, client, mongod } = await createDb();
      const user = {
        _id: new ObjectId(),
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
      };
      await db.collection('users').insertOne(user);
      process.env.NOTIFY_EMAIL = 'admin@example.test';
      clearModule('../src/config');
      clearModule('../src/config/index');

      const mailer = require('../src/utils/sendMail');
      const sent = [];
      mailer.sendMail = async (options) => {
        sent.push(options);
      };

      const { notifyAccountUpdate } = reloadUsersRoute();

      await notifyAccountUpdate(db, user, ['adresse e-mail']);

      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].to, 'admin@example.test');
      await client.close();
      await mongod.stop();
    },
  );

  await t.test(
    'keeps account recipients private and drops an old address',
    async () => {
      const { db, client, mongod } = await createDb();
      const user = {
        _id: new ObjectId(),
        username: 'charlie',
        email: 'old@example.test',
        preferences: { emailNotifications: { accountUpdates: true } },
      };
      await db.collection('users').insertOne(user);
      process.env.NOTIFY_EMAIL = 'admin@example.test';
      const mailer = require('../src/utils/sendMail');
      const sent = [];
      mailer.sendMail = async (message) => {
        if (message.to === 'old@example.test')
          throw new Error('temporary SMTP failure');
        sent.push(message);
      };
      const { notifyAccountUpdate } = reloadUsersRoute();
      await notifyAccountUpdate(db, user, ['mot de passe']);
      assert.deepStrictEqual(
        sent.map((message) => message.to),
        ['admin@example.test'],
      );
      assert.equal(sent[0].bcc, undefined);

      await db
        .collection('users')
        .updateOne({ _id: user._id }, { $set: { email: 'new@example.test' } });
      await db
        .collection('mailOutbox')
        .updateOne(
          { 'message.to': 'old@example.test' },
          { $set: { nextAttemptAt: new Date(0) } },
        );
      const {
        processMailOutbox,
      } = require('../src/services/mailOutboxService');
      await processMailOutbox(db);
      assert.equal(
        await db.collection('mailOutbox').countDocuments({ status: 'expired' }),
        1,
      );
      await client.close();
      await mongod.stop();
    },
  );

  await t.test(
    'ignores structure notifications when preferences are off',
    async () => {
      const { db, client, mongod } = await createDb();

      const [owner, borrower] = await Promise.all([
        db.collection('structures').insertOne({ name: 'Owner' }),
        db.collection('structures').insertOne({ name: 'Borrower' }),
      ]);

      const requesterId = new ObjectId();
      const equipment = await db.collection('equipments').insertOne({
        name: 'Console',
        type: 'Lumiere',
        totalQty: 2,
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

      const admin = (
        await db.collection('users').insertOne({ role: ADMIN_ROLE })
      ).insertedId;
      await updateLoanRequest(
        db,
        { id: admin.toString(), role: ADMIN_ROLE },
        loan.insertedId.toString(),
        { status: 'accepted' },
      );

      assert.strictEqual(sent.length, 0);

      await client.close();
      await mongod.stop();
    },
  );
});

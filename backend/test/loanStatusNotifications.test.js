process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { ADMIN_ROLE, AUTRE_ROLE } = require('../src/config/roles');

function clearModule(modulePath) {
  try {
    delete require.cache[require.resolve(modulePath)];
  } catch (error) {
    // ignore cache clear errors
  }
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

async function seedLoan(db, { requesterEmail, ownerHasContact }) {
  const [owner, borrower] = await Promise.all([
    db.collection('structures').insertOne({ name: 'Owner' }),
    db.collection('structures').insertOne({ name: 'Borrower' }),
  ]);
  const equipment = await db.collection('equipments').insertOne({
    name: 'Mic',
    type: 'Son',
    structure: owner.insertedId,
  });

  const requesterId = new ObjectId();
  const users = [
    { _id: requesterId, structure: borrower.insertedId, role: AUTRE_ROLE },
  ];

  if (requesterEmail) {
    users[0].email = requesterEmail;
  }

  if (ownerHasContact) {
    users.push({
      _id: new ObjectId(),
      structure: owner.insertedId,
      role: AUTRE_ROLE,
      email: 'owner@example.test',
    });
  }

  if (users.length) {
    await db.collection('users').insertMany(users);
  }

  const loan = await db.collection('loanrequests').insertOne({
    owner: owner.insertedId,
    borrower: borrower.insertedId,
    items: [{ equipment: equipment.insertedId, quantity: 1 }],
    requestedBy: requesterId,
    status: 'pending',
    startDate: new Date('2099-01-01'),
    endDate: new Date('2099-01-02'),
  });

  return { loanId: loan.insertedId };
}

test('loan status notification recipients', async (t) => {
  await t.test(
    'includes owner contacts, requester and NOTIFY_EMAIL',
    async () => {
      const { db, client, mongod } = await createDb();
      const { loanId } = await seedLoan(db, {
        requesterEmail: 'requester@example.test',
        ownerHasContact: true,
      });

      const mailer = require('../src/utils/sendMail');
      const sent = [];
      mailer.sendMail = async (options) => {
        sent.push(options);
      };

      const { updateLoanRequest } =
        loadLoanServiceWithNotify('alert@example.test');

      await updateLoanRequest(
        db,
        { id: new ObjectId().toString(), role: ADMIN_ROLE },
        loanId.toString(),
        { status: 'accepted' },
      );

      assert.strictEqual(sent.length, 1);
      const recipients = sent[0].to.split(',').sort();
      assert.deepStrictEqual(recipients, [
        'alert@example.test',
        'owner@example.test',
        'requester@example.test',
      ]);

      await client.close();
      await mongod.stop();
    },
  );

  await t.test(
    'falls back to NOTIFY_EMAIL when requester is missing email',
    async () => {
      const { db, client, mongod } = await createDb();
      const { loanId } = await seedLoan(db, {
        requesterEmail: undefined,
        ownerHasContact: false,
      });

      const mailer = require('../src/utils/sendMail');
      const sent = [];
      mailer.sendMail = async (options) => {
        sent.push(options);
      };

      const { updateLoanRequest } =
        loadLoanServiceWithNotify('alert@example.test');

      await updateLoanRequest(
        db,
        { id: new ObjectId().toString(), role: ADMIN_ROLE },
        loanId.toString(),
        { status: 'accepted' },
      );

      assert.strictEqual(sent.length, 1);
      assert.strictEqual(sent[0].to, 'alert@example.test');

      await client.close();
      await mongod.stop();
    },
  );

  await t.test('logs when no recipients are available', async () => {
    const { db, client, mongod } = await createDb();
    const { loanId } = await seedLoan(db, {
      requesterEmail: undefined,
      ownerHasContact: false,
    });

    const mailer = require('../src/utils/sendMail');
    const sent = [];
    mailer.sendMail = async (options) => {
      sent.push(options);
    };

    clearModule('../src/utils/logger');
    const warnings = [];
    const loggerStub = {
      warn: (...args) => warnings.push(args),
      error: () => {},
      info: () => {},
      debug: () => {},
    };
    require.cache[require.resolve('../src/utils/logger')] = {
      id: '../src/utils/logger',
      filename: '../src/utils/logger',
      loaded: true,
      exports: { __esModule: true, default: loggerStub },
    };

    const { updateLoanRequest } = loadLoanServiceWithNotify(undefined);

    await updateLoanRequest(
      db,
      { id: new ObjectId().toString(), role: ADMIN_ROLE },
      loanId.toString(),
      { status: 'accepted' },
    );

    assert.strictEqual(sent.length, 0);
    assert.ok(
      warnings.some((args) =>
        String(args[0]).includes(
          'Loan status notification not sent: no recipient email found',
        ),
      ),
    );

    delete require.cache[require.resolve('../src/utils/logger')];
    await client.close();
    await mongod.stop();
  });
});

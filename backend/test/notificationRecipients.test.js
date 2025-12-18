process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('assert');
const { ObjectId } = require('mongodb');
const { AUTRE_ROLE } = require('../src/config/roles');

function createStubDb({
  structures = [],
  users = [],
  equipments = [],
} = {}) {
  const collections = { structures, users, equipments };

  return {
    collection: (name) => {
      if (name === 'structures') {
        return {
          findOne: async (query) =>
            collections.structures.find(
              (s) => s._id?.toString?.() === query._id?.toString?.(),
            ) || null,
        };
      }

      if (name === 'equipments') {
        return {
          findOne: async (query) =>
            collections.equipments.find(
              (e) => e._id?.toString?.() === query._id?.toString?.(),
            ) || null,
        };
      }

      if (name === 'users') {
        return {
          findOne: async (query) =>
            collections.users.find((u) => u._id?.toString?.() === query._id?.toString?.()) ||
            null,
          find: (query) => ({
            toArray: async () =>
              collections.users.filter((u) =>
                query?.structure ? u.structure?.toString?.() === query.structure?.toString?.() : true,
              ),
          }),
        };
      }

      throw new Error(`Unknown collection ${name}`);
    },
  };
}

test('getLoanRecipientsByRole respecte les opt-in/opt-out', async () => {
  const ownerId = new ObjectId();
  const borrowerId = new ObjectId();
  const equipmentId = new ObjectId();
  const db = createStubDb({
    structures: [
      { _id: ownerId, name: 'Owner' },
      { _id: borrowerId, name: 'Borrower' },
    ],
    equipments: [{ _id: equipmentId, name: 'Console', type: 'Son', structure: ownerId }],
    users: [
      {
        _id: new ObjectId(),
        structure: ownerId,
        email: 'owner@example.test',
        role: AUTRE_ROLE,
        preferences: {
          emailNotifications: {
            accountUpdates: true,
            loanRequests: true,
            loanStatusChanges: true,
            returnReminders: true,
            systemAlerts: true,
            vehicleReminders: true,
          },
        },
      },
      {
        _id: new ObjectId(),
        structure: borrowerId,
        email: 'borrower@example.test',
        role: AUTRE_ROLE,
        preferences: {
          emailNotifications: {
            accountUpdates: true,
            loanRequests: true,
            loanStatusChanges: true,
            returnReminders: false,
            systemAlerts: false,
            vehicleReminders: true,
          },
        },
      },
    ],
  });

  const traces = [];
  const { getLoanRecipientsByRole } = require('../src/utils/getLoanRecipients');
  const recipients = await getLoanRecipientsByRole(
    db,
    [{ equipment: equipmentId }],
    {
      ownerId: ownerId.toString(),
      borrowerId: borrowerId.toString(),
      borrower: borrowerId,
      requestedBy: null,
      requestedById: null,
    },
    'returnReminders',
    { requireSystemAlerts: true, trace: (detail) => traces.push(detail) },
  );

  assert.deepStrictEqual(recipients.ownerRecipients, ['owner@example.test']);
  assert.deepStrictEqual(recipients.borrowerRecipients, []);
  assert.ok(
    traces.some(
      (trace) =>
        trace.role === 'borrower' &&
        trace.preference === 'returnReminders' &&
        String(trace.reason || '').includes('opt-out'),
    ),
  );
});

test('getLoanRecipients journalise explicitement en absence de destinataires', async () => {
  const loggerPath = require.resolve('../src/utils/logger');
  delete require.cache[loggerPath];
  const warnings = [];
  require.cache[loggerPath] = {
    id: loggerPath,
    filename: loggerPath,
    loaded: true,
    exports: {
      __esModule: true,
      default: {
        warn: (...args) => warnings.push(args),
        error: () => {},
        info: () => {},
        debug: () => {},
      },
    },
  };

  delete require.cache[require.resolve('../src/utils/getLoanRecipients')];
  const { getLoanRecipients } = require('../src/utils/getLoanRecipients');
  const db = createStubDb();

  const recipients = await getLoanRecipients(
    db,
    [],
    { ownerId: null, borrowerId: null, borrower: null, requestedById: null, requestedBy: null },
    'loanStatusChanges',
    { requireSystemAlerts: true },
  );

  assert.deepStrictEqual(recipients, []);
  assert.ok(
    warnings.some((args) =>
      String(args[0]).includes('Loan notification: no recipients found'),
    ),
  );

  delete require.cache[loggerPath];
});

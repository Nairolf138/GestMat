const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');

process.env.JWT_SECRET = 'test';
process.env.API_URL = 'http://localhost:5000/api';

const {
  collectStructureStats,
  getAnnualReportPeriod,
  renderReportPdf,
} = require('../src/services/reportService');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  const db = client.db();
  return { db, client, mongod };
}

test('collectStructureStats aggregates active and archived loans', async () => {
  const { db, client, mongod } = await createDb();
  const structureId = new ObjectId();
  const equipmentId = new ObjectId();
  const period = getAnnualReportPeriod(new Date('2024-09-15T12:00:00Z'));

  await db.collection('structures').insertOne({ _id: structureId, name: 'Test structure' });
  await db.collection('equipments').insertOne({ _id: equipmentId, name: 'Caméra', type: 'Video' });

  await db.collection('loanrequests').insertOne({
    owner: structureId,
    borrower: new ObjectId(),
    status: 'accepted',
    startDate: new Date('2024-02-01T00:00:00Z'),
    endDate: new Date('2024-02-05T00:00:00Z'),
    items: [{ equipment: equipmentId, quantity: 2 }],
  });

  await db.collection('loanrequests_archive').insertOne({
    owner: new ObjectId(),
    borrower: structureId,
    status: 'returned',
    startDate: new Date('2023-11-10T00:00:00Z'),
    endDate: new Date('2023-11-12T00:00:00Z'),
    items: [{ equipment: equipmentId, quantity: 1 }],
  });

  await db.collection('loanrequests').insertOne({
    owner: structureId,
    status: 'accepted',
    startDate: new Date('2022-01-01T00:00:00Z'),
  });

  const stats = await collectStructureStats(db, structureId, period);
  assert.strictEqual(stats.totalLoans, 2);
  assert.strictEqual(stats.roleCounts.owner, 1);
  assert.strictEqual(stats.roleCounts.borrower, 1);
  assert.strictEqual(stats.statusCounts.accepted, 1);
  assert.strictEqual(stats.statusCounts.returned, 1);
  assert.ok(stats.averageDurationDays > 2.9 && stats.averageDurationDays < 3.1);
  assert.strictEqual(stats.topEquipments[0].totalQuantity, 3);
  assert.strictEqual(stats.topEquipments[0].name, 'Caméra');

  await client.close();
  await mongod.stop();
});

test('renderReportPdf embeds summary text', async () => {
  const structure = { _id: new ObjectId(), name: 'Structure A' };
  const period = getAnnualReportPeriod(new Date('2024-09-15T12:00:00Z'));
  const stats = {
    totalLoans: 2,
    statusCounts: { accepted: 1, returned: 1 },
    roleCounts: { owner: 1, borrower: 1 },
    averageDurationDays: 3,
    topEquipments: [{ id: new ObjectId(), name: 'Caméra', type: 'Video', totalQuantity: 3 }],
  };

  const buffer = await renderReportPdf(structure, stats, period);
  const content = buffer.toString('latin1');
  const decoded = (content.match(/<([0-9A-Fa-f]+)>/g) || [])
    .map((token) => Buffer.from(token.slice(1, -1), 'hex').toString('latin1'))
    .join(' ')
    .replace(/\s+/g, '');
  const normalizedLabel = period.label.replace(/\s+/g, '');
  assert.ok(decoded.toLowerCase().includes('rapportannueldesprêts'));
  assert.ok(decoded.includes('StructureA'));
  assert.ok(decoded.includes(normalizedLabel));
});

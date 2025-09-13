process.env.JWT_SECRET = 'test';
const test = require('node:test');
const assert = require('assert');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const { listLoans, updateLoanRequest, deleteLoanRequest } = require('../src/services/loanService');
const {
  AUTRE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_GENERAL_ROLE,
} = require('../src/config/roles');

async function createDb() {
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  return { db: client.db(), client, mongod };
}

test('role based loan service permissions', async (t) => {
  const { db, client, mongod } = await createDb();
  const [s1, s2] = await Promise.all([
    db.collection('structures').insertOne({ name: 'S1' }),
    db.collection('structures').insertOne({ name: 'S2' }),
  ]);
  const s1Id = s1.insertedId;
  const s2Id = s2.insertedId;
  const [eqSonS1, eqPlateauS1, eqSonS2] = await Promise.all([
    db
      .collection('equipments')
      .insertOne({ name: 'ES1', type: 'Son', structure: s1Id }),
    db
      .collection('equipments')
      .insertOne({ name: 'EP1', type: 'Plateau', structure: s1Id }),
    db
      .collection('equipments')
      .insertOne({ name: 'ES2', type: 'Son', structure: s2Id }),
  ]);
  const userAutre = new ObjectId();
  const userRegSon = new ObjectId();
  const userRegGen = new ObjectId();
  await db.collection('users').insertMany([
    { _id: userAutre, structure: s1Id },
    { _id: userRegSon, structure: s1Id },
    { _id: userRegGen, structure: s1Id },
  ]);

  // seed loans for listLoans test
  await db.collection('loanrequests').insertMany([
    { owner: s1Id, borrower: s2Id, items: [{ equipment: eqSonS1.insertedId }] },
    { owner: s1Id, borrower: s2Id, items: [{ equipment: eqPlateauS1.insertedId }] },
    {
      owner: s2Id,
      borrower: s1Id,
      items: [{ equipment: eqSonS2.insertedId }],
      requestedBy: userAutre,
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    },
    {
      owner: s2Id,
      borrower: s1Id,
      items: [{ equipment: eqSonS2.insertedId }],
      requestedBy: userRegSon,
      startDate: new Date('2099-01-01'),
      endDate: new Date('2099-01-02'),
    },
  ]);

  await t.test('listLoans filters by equipment type', async () => {
    const regSonLoans = await listLoans(db, {
      id: userRegSon.toString(),
      role: REGISSEUR_SON_ROLE,
    });
    assert.strictEqual(regSonLoans.length, 3);
    assert.ok(
      regSonLoans.every((l) =>
        (l.items || []).every((it) => it.equipment.type !== 'Plateau'),
      ),
    );
    const autreLoans = await listLoans(db, {
      id: userAutre.toString(),
      role: AUTRE_ROLE,
    });
    assert.strictEqual(autreLoans.length, 4);
  });

  await t.test('Autre role permissions', async () => {
    // outgoing request owned by Autre user: can cancel but cannot accept
    const loanId = (
      await db.collection('loanrequests').insertOne({
        owner: s2Id,
        borrower: s1Id,
        items: [{ equipment: eqSonS2.insertedId }],
        requestedBy: userAutre,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    const upd = await updateLoanRequest(
      db,
      {
        id: userAutre.toString(),
        role: AUTRE_ROLE,
      },
      loanId,
      { status: 'cancelled' },
    );
    assert.strictEqual(upd.status, 'cancelled');
    await assert.rejects(() =>
      updateLoanRequest(
        db,
        { id: userAutre.toString(), role: AUTRE_ROLE },
        loanId,
        { status: 'accepted' },
      ),
    );
    const loan2 = (
      await db.collection('loanrequests').insertOne({
        owner: s2Id,
        borrower: s1Id,
        items: [{ equipment: eqSonS2.insertedId }],
        requestedBy: userRegSon,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    await assert.rejects(() =>
      deleteLoanRequest(
        db,
        { id: userAutre.toString(), role: AUTRE_ROLE },
        loan2,
      ),
    );

    // incoming request for Autre user's structure: can accept or refuse
    const incoming1 = (
      await db.collection('loanrequests').insertOne({
        owner: s1Id,
        borrower: s2Id,
        items: [{ equipment: eqSonS1.insertedId }],
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    const accepted = await updateLoanRequest(
      db,
      { id: userAutre.toString(), role: AUTRE_ROLE },
      incoming1,
      { status: 'accepted' },
    );
    assert.strictEqual(accepted.status, 'accepted');
    const incoming2 = (
      await db.collection('loanrequests').insertOne({
        owner: s1Id,
        borrower: s2Id,
        items: [{ equipment: eqSonS1.insertedId }],
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    const refused = await updateLoanRequest(
      db,
      { id: userAutre.toString(), role: AUTRE_ROLE },
      incoming2,
      { status: 'refused' },
    );
    assert.strictEqual(refused.status, 'refused');
  });

  await t.test('Regisseur Son role restrictions', async () => {
    const incomingSon = (
      await db.collection('loanrequests').insertOne({
        owner: s1Id,
        borrower: s2Id,
        items: [{ equipment: eqSonS1.insertedId }],
      })
    ).insertedId.toString();
    const accepted = await updateLoanRequest(
      db,
      { id: userRegSon.toString(), role: REGISSEUR_SON_ROLE },
      incomingSon,
      { status: 'accepted' },
    );
    assert.strictEqual(accepted.status, 'accepted');
    const incomingPlateau = (
      await db.collection('loanrequests').insertOne({
        owner: s1Id,
        borrower: s2Id,
        items: [{ equipment: eqPlateauS1.insertedId }],
      })
    ).insertedId.toString();
    await assert.rejects(
      () =>
        updateLoanRequest(
          db,
          { id: userRegSon.toString(), role: REGISSEUR_SON_ROLE },
          incomingPlateau,
          { status: 'accepted' },
        ),
    );
    const ownOutgoing = (
      await db.collection('loanrequests').insertOne({
        owner: s2Id,
        borrower: s1Id,
        items: [{ equipment: eqSonS2.insertedId }],
        requestedBy: userRegSon,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    const cancelled = await updateLoanRequest(
      db,
      { id: userRegSon.toString(), role: REGISSEUR_SON_ROLE },
      ownOutgoing,
      { status: 'cancelled' },
    );
    assert.strictEqual(cancelled.status, 'cancelled');
    const otherOutgoing = (
      await db.collection('loanrequests').insertOne({
        owner: s2Id,
        borrower: s1Id,
        items: [{ equipment: eqSonS2.insertedId }],
        requestedBy: userAutre,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    await assert.rejects(
      () =>
        deleteLoanRequest(
          db,
          { id: userRegSon.toString(), role: REGISSEUR_SON_ROLE },
          otherOutgoing,
        ),
    );
  });

  await t.test('Regisseur General can manage all structure loans', async () => {
    const incomingPlateau = (
      await db.collection('loanrequests').insertOne({
        owner: s1Id,
        borrower: s2Id,
        items: [{ equipment: eqPlateauS1.insertedId }],
      })
    ).insertedId.toString();
    const accepted = await updateLoanRequest(
      db,
      { id: userRegGen.toString(), role: REGISSEUR_GENERAL_ROLE },
      incomingPlateau,
      { status: 'accepted' },
    );
    assert.strictEqual(accepted.status, 'accepted');
    const otherOutgoing = (
      await db.collection('loanrequests').insertOne({
        owner: s2Id,
        borrower: s1Id,
        items: [{ equipment: eqSonS2.insertedId }],
        requestedBy: userAutre,
        startDate: new Date('2099-01-01'),
        endDate: new Date('2099-01-02'),
      })
    ).insertedId.toString();
    const del = await deleteLoanRequest(
      db,
      { id: userRegGen.toString(), role: REGISSEUR_GENERAL_ROLE },
      otherOutgoing,
    );
    assert.strictEqual(del.message, 'Loan request deleted');
  });

  await client.close();
  await mongod.stop();
});

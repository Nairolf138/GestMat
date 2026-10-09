const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET ||= 'test';
process.env.LOAN_ARCHIVE_EMAIL = 'archive@example.test';
const roles = require('../../src/config/roles');
const mailer = require('../../src/utils/sendMail');
const { withApiPrefix } = require('./apiPrefix');
async function fixture(t) {
  const server = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const client = await MongoClient.connect(server.getUri());
  const db = client.db();
  t.after(async () => {
    await client.close();
    await server.stop();
  });
  const owner = new ObjectId(),
    borrower = new ObjectId(),
    outside = new ObjectId();
  await db.collection('structures').insertMany([
    { _id: owner, name: 'Owner' },
    { _id: borrower, name: 'Borrower' },
    { _id: outside, name: 'Outside' },
  ]);
  const accounts = {};
  for (const [name, role, structure] of [
    ['admin', roles.ADMIN_ROLE, outside],
    ['general', roles.REGISSEUR_GENERAL_ROLE, owner],
    ['sound', roles.REGISSEUR_SON_ROLE, owner],
    ['light', roles.REGISSEUR_LUMIERE_ROLE, owner],
    ['stage', roles.REGISSEUR_PLATEAU_ROLE, owner],
    ['other', roles.AUTRE_ROLE, owner],
    ['requester', roles.REGISSEUR_GENERAL_ROLE, borrower],
    ['outside', roles.REGISSEUR_GENERAL_ROLE, outside],
  ]) {
    accounts[name] = {
      _id: new ObjectId(),
      username: name,
      firstName: name,
      lastName: 'Person',
      role,
      structure,
      email: `${name}@example.test`,
    };
  }
  await db.collection('users').insertMany(Object.values(accounts));
  const equipment = {};
  for (const type of ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'])
    equipment[type] = {
      _id: new ObjectId(),
      name: type,
      type,
      structure: owner,
      totalQty: 10,
    };
  await db.collection('equipments').insertMany(Object.values(equipment));
  const messages = [];
  mailer.sendMail = async (message) => messages.push(message);
  const app = express();
  app.use(express.json());
  app.locals.db = db;
  for (const resource of ['loans', 'vehicles', 'equipments', 'users'])
    app.use(
      withApiPrefix(`/${resource}`),
      require(`../../src/routes/${resource}`).default,
    );
  app.use((err, req, res, next) =>
    res.status(err.status || 500).json({ message: err.message }),
  );
  const headers = (name) => ({
    Authorization: `Bearer ${jwt.sign({ id: accounts[name]._id.toString(), role: accounts[name].role }, process.env.JWT_SECRET)}`,
  });
  const user = (name) => ({
    id: accounts[name]._id.toString(),
    role: accounts[name].role,
  });
  const startDate = new Date(Date.now() + 5 * 86400000).toISOString(),
    endDate = new Date(Date.now() + 7 * 86400000).toISOString();
  const payload = (types = ['Son']) => ({
    owner: owner.toString(),
    borrower: borrower.toString(),
    startDate,
    endDate,
    items: types.map((type) => ({
      equipment: equipment[type]._id.toString(),
      quantity: 4,
    })),
  });
  return {
    db,
    app,
    owner,
    borrower,
    outside,
    accounts,
    equipment,
    messages,
    headers,
    user,
    payload,
    startDate,
    endDate,
  };
}
module.exports = { fixture, roles, withApiPrefix };

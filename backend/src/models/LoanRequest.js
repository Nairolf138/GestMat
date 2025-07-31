const { ObjectId } = require('mongodb');

function _populate(db, loan) {
  return Promise.all([
    loan.borrower ? db.collection('structures').findOne({ _id: loan.borrower }).then(s => { loan.borrower = s; }) : null,
    loan.owner ? db.collection('structures').findOne({ _id: loan.owner }).then(s => { loan.owner = s; }) : null,
    loan.items ? Promise.all(loan.items.map(async item => {
      if (item.equipment) {
        item.equipment = await db.collection('equipments').findOne({ _id: item.equipment });
      }
    })) : null
  ]).then(() => loan);
}

async function findLoans(db) {
  const loans = await db.collection('loanrequests').find().toArray();
  await Promise.all(loans.map((loan) => _populate(db, loan)));
  return loans;
}

async function createLoan(db, data) {
  if (data.borrower) data.borrower = new ObjectId(data.borrower);
  if (data.owner) data.owner = new ObjectId(data.owner);
  if (data.items) {
    data.items = data.items.map(it => ({ ...it, equipment: new ObjectId(it.equipment) }));
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const result = await db.collection('loanrequests').insertOne(data);
  const loan = { _id: result.insertedId, ...data };
  return _populate(db, loan);
}

async function updateLoan(db, id, data) {
  if (data.borrower) data.borrower = new ObjectId(data.borrower);
  if (data.owner) data.owner = new ObjectId(data.owner);
  if (data.items) {
    data.items = data.items.map(it => ({ ...it, equipment: new ObjectId(it.equipment) }));
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const res = await db.collection('loanrequests').findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: data },
    { returnDocument: 'after' }
  );
  if (!res.value) return null;
  return _populate(db, res.value);
}

async function deleteLoan(db, id) {
  const res = await db.collection('loanrequests').deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

module.exports = {
  findLoans,
  createLoan,
  updateLoan,
  deleteLoan,
};

const { findLoans, createLoan, updateLoan, deleteLoan } = require('../models/LoanRequest');
const { sendMail } = require('../utils/sendMail');
const { getLoanRecipients } = require('../utils/getLoanRecipients');
const { getStructureEmails } = require('../utils/getStructureEmails');
const { findUserById } = require('../models/User');
const { ObjectId } = require('mongodb');
const { ADMIN_ROLE } = require('../config/roles');
const { forbidden, notFound, badRequest } = require('../utils/errors');
const { checkEquipmentAvailability } = require('../utils/checkAvailability');

async function listLoans(db, user) {
  if (user.role === ADMIN_ROLE) {
    return findLoans(db);
  }
  const u = await findUserById(db, user.id);
  const structId = u?.structure?.toString();
  const all = await findLoans(db);
  return all.filter(
    (l) =>
      l.owner?._id?.toString() === structId ||
      l.owner?.toString() === structId ||
      l.borrower?._id?.toString() === structId ||
      l.borrower?.toString() === structId
  );
}

async function createLoanRequest(db, data) {
  const start = data.startDate ? new Date(data.startDate) : null;
  const end = data.endDate ? new Date(data.endDate) : null;
  const items = data.items || [];

  await Promise.all(
    items.map(async (item) => {
      const avail = await checkEquipmentAvailability(
        db,
        item.equipment,
        start,
        end,
        item.quantity
      );
      if (!avail?.available) {
        throw badRequest('Quantity not available');
      }
    })
  );

  await Promise.all(
    items.map((item) =>
      db
        .collection('equipments')
        .updateOne(
          { _id: new ObjectId(item.equipment) },
          { $inc: { availableQty: -item.quantity } }
        )
    )
  );

  const loan = await createLoan(db, { ...data, status: 'pending' });
  try {
    const recipients = await getLoanRecipients(db, loan.owner, loan.items || []);
    if (recipients.length) {
      await sendMail({
        to: recipients.join(','),
        subject: 'Nouvelle demande de prêt',
        text: `Demande de prêt de ${loan.borrower?.name || ''} pour ${loan.owner?.name || ''}`,
      });
    }
  } catch (err) {
    console.error('mail error', err);
  }
  return loan;
}

async function updateLoanRequest(db, user, id, data) {
  const loan = await db.collection('loanrequests').findOne({ _id: new ObjectId(id) });
  if (!loan) throw notFound('Loan request not found');

  const u = await findUserById(db, user.id);
  if (user.role !== ADMIN_ROLE && u?.structure?.toString() !== loan.owner.toString()) {
    throw forbidden('Access denied');
  }

  if (data.status === 'refused' && loan.status !== 'refused') {
    await Promise.all(
      (loan.items || []).map((item) =>
        db
          .collection('equipments')
          .updateOne({ _id: item.equipment }, { $inc: { availableQty: item.quantity } })
      )
    );
  }
  if (data.status === 'accepted' && loan.status === 'refused') {
    const start = loan.startDate;
    const end = loan.endDate;
    await Promise.all(
      (loan.items || []).map(async (item) => {
        const avail = await checkEquipmentAvailability(
          db,
          item.equipment,
          start,
          end,
          item.quantity
        );
        if (!avail?.available) {
          throw badRequest('Quantity not available');
        }
      })
    );
    await Promise.all(
      (loan.items || []).map((item) =>
        db
          .collection('equipments')
          .updateOne(
            { _id: item.equipment },
            { $inc: { availableQty: -item.quantity } }
          )
      )
    );
  }
  const updated = await updateLoan(db, id, data);
  if (data.status) {
    try {
      const emails = await getStructureEmails(db, loan.borrower);
      if (emails.length) {
        await sendMail({
          to: emails.join(','),
          subject: `Demande ${data.status}`,
          text: `La demande ${updated._id} est maintenant ${data.status}`,
        });
      }
    } catch (err) {
      console.error('mail error', err);
    }
  }
  return updated;
}

async function deleteLoanRequest(db, user, id) {
  const loan = await db
    .collection('loanrequests')
    .findOne({ _id: new ObjectId(id) });
  if (!loan) throw notFound('Loan request not found');

  if (user.role !== ADMIN_ROLE) {
    const u = await findUserById(db, user.id);
    const structId = u?.structure?.toString();
    if (
      loan.owner?.toString() !== structId &&
      loan.borrower?.toString() !== structId
    ) {
      throw forbidden('Access denied');
    }
  }

  const removed = await deleteLoan(db, id);
  if (!removed) throw notFound('Loan request not found');
  if (loan.status !== 'refused') {
    await Promise.all(
      (loan.items || []).map((item) =>
        db
          .collection('equipments')
          .updateOne({ _id: item.equipment }, { $inc: { availableQty: item.quantity } })
      )
    );
  }
  return { message: 'Loan request deleted' };
}

module.exports = {
  listLoans,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
};


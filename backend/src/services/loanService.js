const { findLoans, createLoan, updateLoan, deleteLoan } = require('../models/LoanRequest');
const { sendMail } = require('../utils/sendMail');
const { getLoanRecipients } = require('../utils/getLoanRecipients');
const { getStructureEmails } = require('../utils/getStructureEmails');
const { findUserById } = require('../models/User');
const { ObjectId } = require('mongodb');
const { ADMIN_ROLE } = require('../config/roles');
const { forbidden, notFound, badRequest } = require('../utils/errors');
const { checkEquipmentAvailability } = require('../utils/checkAvailability');
const logger = require('../utils/logger');

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
  for (let attempt = 0; attempt < 5; attempt++) {
    const session = db.client.startSession();
    try {
      session.startTransaction();
      for (const item of items) {
        const avail = await checkEquipmentAvailability(
          db,
          item.equipment,
          start,
          end,
          item.quantity,
          session
        );
        if (!avail?.available) {
          throw badRequest('Quantity not available');
        }
        await db
          .collection('equipments')
          .updateOne(
            { _id: new ObjectId(item.equipment) },
            { $currentDate: { updatedAt: true } },
            { session }
          );
      }

      const loan = await createLoan(db, { ...data, status: 'pending' }, session);
      await session.commitTransaction();
      session.endSession();

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
        logger.error('mail error %o', err);
      }
      return loan;
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      if (err.code && attempt < 4) {
        continue; // retry once on write conflict
      }
      if (err.code) {
        throw badRequest('Quantity not available');
      }
      throw err;
    }
  }
}

async function updateLoanRequest(db, user, id, data) {
  const session = db.client.startSession();
  session.startTransaction();
  let updated;
  try {
    const loan = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id) }, { session });
    if (!loan) throw notFound('Loan request not found');

    const u = await findUserById(db, user.id);
    const structId = u?.structure?.toString();
    const isOwner = loan.owner?.toString() === structId;
    const isBorrower = loan.borrower?.toString() === structId;
    const now = new Date();
    if (
      user.role !== ADMIN_ROLE &&
      !isOwner &&
      !(isBorrower && new Date(loan.startDate) > now)
    ) {
      throw forbidden('Access denied');
    }

    if (data.status === 'refused' && loan.status !== 'refused') {
      for (const item of loan.items || []) {
        await db
          .collection('equipments')
          .updateOne(
            { _id: item.equipment },
            { $currentDate: { updatedAt: true } },
            { session }
          );
      }
    }
    if (data.status !== 'refused' && loan.status === 'refused') {
      const start = loan.startDate;
      const end = loan.endDate;
      for (const item of loan.items || []) {
        const avail = await checkEquipmentAvailability(
          db,
          item.equipment,
          start,
          end,
          item.quantity,
          session
        );
        if (!avail?.available) {
          throw badRequest('Quantity not available');
        }
        await db
          .collection('equipments')
          .updateOne(
            { _id: item.equipment },
            { $currentDate: { updatedAt: true } },
            { session }
          );
      }
    }
    updated = await updateLoan(db, id, data, session);
    await session.commitTransaction();

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
        logger.error('mail error %o', err);
      }
    }
    session.endSession();
    return updated;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

async function deleteLoanRequest(db, user, id) {
  const session = db.client.startSession();
  session.startTransaction();
  try {
    const loan = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id) }, { session });
    if (!loan) throw notFound('Loan request not found');

    if (user.role !== ADMIN_ROLE) {
      const u = await findUserById(db, user.id);
      const structId = u?.structure?.toString();
      const isOwner = loan.owner?.toString() === structId;
      const isBorrower = loan.borrower?.toString() === structId;
      if (!isOwner && !isBorrower) {
        throw forbidden('Access denied');
      }
      if (isBorrower && !isOwner) {
        const start = new Date(loan.startDate);
        if (loan.status !== 'pending' && start <= new Date()) {
          throw forbidden('Access denied');
        }
      }
    }

    for (const item of loan.items || []) {
      await db
        .collection('equipments')
        .updateOne(
          { _id: item.equipment },
          { $currentDate: { updatedAt: true } },
          { session }
        );
    }

    const removed = await deleteLoan(db, id, session);
    if (!removed) throw notFound('Loan request not found');
    await session.commitTransaction();
    session.endSession();
    return { message: 'Loan request deleted' };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

module.exports = {
  listLoans,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
};


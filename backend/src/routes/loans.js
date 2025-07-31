const express = require('express');
const {
  findLoans,
  createLoan,
  updateLoan,
  deleteLoan,
} = require('../models/LoanRequest');
const auth = require('../middleware/auth');
const { sendMail } = require('../utils/sendMail');
const { getLoanRecipients } = require('../utils/getLoanRecipients');
const { getStructureEmails } = require('../utils/getStructureEmails');
const { findUserById } = require('../models/User');
const { ObjectId } = require('mongodb');
const { ADMIN_ROLE } = require('../config/roles');
const validate = require('../middleware/validate');
const checkId = require('../middleware/checkObjectId');
const { createLoanValidator, updateLoanValidator } = require('../validators/loanValidator');
const { ApiError, forbidden, notFound, badRequest } = require('../utils/errors');
const { checkEquipmentAvailability } = require('../utils/checkAvailability');

const router = express.Router();

router.get('/', auth(), async (req, res) => {
  const db = req.app.locals.db;
  let loans;
  if (req.user.role === ADMIN_ROLE) {
    loans = await findLoans(db);
  } else {
    const user = await findUserById(db, req.user.id);
    const structId = user?.structure?.toString();
    const all = await findLoans(db);
    loans = all.filter(
      (l) =>
        l.owner?._id?.toString() === structId ||
        l.owner?.toString() === structId ||
        l.borrower?._id?.toString() === structId ||
        l.borrower?.toString() === structId
    );
  }
  res.json(loans);
});

router.post('/', auth(), createLoanValidator, validate, async (req, res, next) => {
  const db = req.app.locals.db;
  const start = req.body.startDate ? new Date(req.body.startDate) : null;
  const end = req.body.endDate ? new Date(req.body.endDate) : null;
  const items = req.body.items || [];
  try {
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
  } catch (err) {
    return next(err);
  }
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
  const loan = await createLoan(db, { ...req.body, status: 'pending' });
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
  res.json(loan);
});

router.put('/:id', auth(), checkId(), updateLoanValidator, validate, async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const loan = await db.collection('loanrequests').findOne({ _id: new ObjectId(req.params.id) });
    if (!loan) return next(notFound('Loan request not found'));

    const user = await findUserById(db, req.user.id);
    if (
      req.user.role !== ADMIN_ROLE &&
      user?.structure?.toString() !== loan.owner.toString()
    ) {
      return next(forbidden('Access denied'));
    }

    if (req.body.status === 'refused' && loan.status !== 'refused') {
      await Promise.all(
        (loan.items || []).map((item) =>
          db
            .collection('equipments')
            .updateOne({ _id: item.equipment }, { $inc: { availableQty: item.quantity } })
        )
      );
    }
    if (req.body.status === 'accepted' && loan.status === 'refused') {
      const start = loan.startDate;
      const end = loan.endDate;
      try {
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
      } catch (err) {
        return next(err);
      }
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
    const updated = await updateLoan(db, req.params.id, req.body);
    if (req.body.status) {
      try {
        const emails = await getStructureEmails(db, loan.borrower);
        if (emails.length) {
          await sendMail({
            to: emails.join(','),
            subject: `Demande ${req.body.status}`,
            text: `La demande ${updated._id} est maintenant ${req.body.status}`,
          });
        }
      } catch (err) {
        console.error('mail error', err);
      }
    }
    res.json(updated);
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

router.delete('/:id', auth(), checkId(), async (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const loan = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(req.params.id) });
    if (!loan) return next(notFound('Loan request not found'));

    if (req.user.role !== ADMIN_ROLE) {
      const user = await findUserById(db, req.user.id);
      const structId = user?.structure?.toString();
      if (
        loan.owner?.toString() !== structId &&
        loan.borrower?.toString() !== structId
      ) {
        return next(forbidden('Access denied'));
      }
    }

    const removed = await deleteLoan(db, req.params.id);
    if (!removed) return next(notFound('Loan request not found'));
    if (loan.status !== 'refused') {
      await Promise.all(
        (loan.items || []).map((item) =>
          db
            .collection('equipments')
            .updateOne({ _id: item.equipment }, { $inc: { availableQty: item.quantity } })
        )
      );
    }
    res.json({ message: 'Loan request deleted' });
  } catch (err) {
    next(badRequest('Invalid request'));
  }
});

module.exports = router;

import { Db, ObjectId } from 'mongodb';
import {
  findLoans,
  createLoan,
  updateLoan,
  deleteLoan,
  LoanRequest,
  LoanItem,
} from '../models/LoanRequest';
import { sendMail } from '../utils/sendMail';
import { getLoanRecipients } from '../utils/getLoanRecipients';
import { findUserById } from '../models/User';
import {
  ADMIN_ROLE,
  REGISSEUR_GENERAL_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  REGISSEUR_SON_ROLE,
  AUTRE_ROLE,
} from '../config/roles';
import { forbidden, notFound, badRequest } from '../utils/errors';
import { checkEquipmentAvailability } from '../utils/checkAvailability';
import logger from '../utils/logger';
import { canModify } from '../utils/roleAccess';
import type { AuthUser } from '../types';
import { NOTIFY_EMAIL } from '../config';
import {
  loanCreationTemplate,
  loanStatusTemplate,
} from '../utils/mailTemplates';

export async function listLoans(
  db: Db,
  user: AuthUser,
  page?: number,
  limit?: number,
): Promise<LoanRequest[] | { loans: LoanRequest[]; total: number }> {
  if (user.role === ADMIN_ROLE) {
    return findLoans(db, {}, page, limit);
  }
  const u = await findUserById(db, user.id);
  const structId = u?.structure?.toString();
  if (!structId)
    return page !== undefined && limit !== undefined
      ? { loans: [], total: 0 }
      : [];
  const id = new ObjectId(structId);
  const filter = {
    $or: [
      { owner: id },
      { 'owner._id': id },
      { borrower: id },
      { 'borrower._id': id },
    ],
  };
  const res = await findLoans(db, filter, page, limit);
  const structIdStr = structId;
  const filterFn = (loan: LoanRequest) => {
    const typeOk = (loan.items || []).some((item) =>
      canModify(user.role, (item.equipment as any)?.type),
    );
    if (!typeOk) return false;

    const req: any = loan.requestedBy;
    const reqId = req?._id?.toString?.() || req?.toString?.();
    const reqRole = req?.role;

    if (user.role === AUTRE_ROLE) {
      const borrowerId =
        (loan.borrower as any)?._id?.toString?.() ||
        (loan.borrower as any)?.toString?.();
      if (borrowerId === structIdStr) {
        return reqId === user.id;
      }
      return true;
    }

    if (
      [REGISSEUR_SON_ROLE, REGISSEUR_LUMIERE_ROLE, REGISSEUR_PLATEAU_ROLE].includes(
        user.role,
      )
    ) {
      if (reqId === user.id) return true;
      return (
        reqRole === REGISSEUR_GENERAL_ROLE || reqRole === AUTRE_ROLE
      );
    }

    return true;
  };
  if (Array.isArray(res)) {
    return res.filter(filterFn);
  }
  const loans = res.loans.filter(filterFn);
  return { loans, total: loans.length };
}

export async function getLoanRequestById(
  db: Db,
  id: string,
): Promise<LoanRequest | null> {
  const result = await findLoans(db, { _id: new ObjectId(id) });
  if (Array.isArray(result)) {
    return result[0] || null;
  }
  return result.loans[0] || null;
}

export async function createLoanRequest(
  db: Db,
  data: LoanRequest,
  user: AuthUser,
): Promise<LoanRequest> {
  const start = data.startDate ? new Date(data.startDate) : null;
  const end = data.endDate ? new Date(data.endDate) : null;
  const items = data.items || [];
  const u = await findUserById(db, user.id);
  const userStruct = u?.structure?.toString();
  const owner = (data.owner as any)?.toString();
  const borrower = (data.borrower as any)?.toString();
  if (
    (owner && borrower && owner === borrower) ||
    (userStruct && owner === userStruct)
  ) {
    throw forbidden('Cannot request loan for own structure');
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const session = (db as any).client.startSession();
    try {
      session.startTransaction();
      for (const item of items) {
        const avail = await checkEquipmentAvailability(
          db,
          item.equipment as any,
          start,
          end,
          item.quantity as number,
          session,
        );
        if (!avail?.available) {
          throw badRequest('Quantity not available');
        }
        await db
          .collection('equipments')
          .updateOne(
            { _id: new ObjectId(item.equipment as any) },
            { $currentDate: { updatedAt: true } },
            { session },
          );
      }

      const loan = await createLoan(
        db,
        { ...data, status: 'pending', requestedBy: user.id as any },
        session,
      );
      await session.commitTransaction();
      session.endSession();

      try {
        const primaryRecipients = await getLoanRecipients(
          db,
          loan.owner as any,
          items as any,
        );

        const fallbackRecipients: string[] = [];

        if (NOTIFY_EMAIL) {
          fallbackRecipients.push(NOTIFY_EMAIL);
        }

        const requesterEmail = (loan.requestedBy as any)?.email || (u as any)?.email;
        if (requesterEmail) {
          fallbackRecipients.push(requesterEmail);
        }

        const borrowerEmail = (loan.borrower as any)?.email;
        if (borrowerEmail) {
          fallbackRecipients.push(borrowerEmail);
        }

        const recipients = new Set<string>([...primaryRecipients, ...fallbackRecipients]);

        if (!primaryRecipients.length && recipients.size) {
          logger.warn(
            'Loan creation notification falling back to secondary recipients: %o',
            Array.from(recipients),
          );
        }

        const to = Array.from(recipients).join(',');

        if (to) {
          const { subject, text, html } = loanCreationTemplate({ loan });
          await sendMail({
            to,
            subject,
            text,
            html,
          });
        } else {
          logger.warn(
            'Loan creation notification not sent: no recipient email found for loan %s',
            loan._id,
          );
        }
      } catch (err) {
        logger.error('mail error %o', err);
      }
      return loan;
    } catch (err: any) {
      await session.abortTransaction();
      session.endSession();
      if (err.code && attempt < 4) {
        continue; // retry on write conflict
      }
      if (err.code) {
        throw badRequest('Quantity not available');
      }
      throw err;
    }
  }
  throw badRequest('Unable to create loan request');
}

export async function updateLoanRequest(
  db: Db,
  user: AuthUser,
  id: string,
  data: LoanRequest,
): Promise<LoanRequest | null> {
  const session = (db as any).client.startSession();
  session.startTransaction();
  let updated: LoanRequest | null;
  try {
    const loan = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id) }, { session });
    if (!loan) throw notFound('Loan request not found');

    const u = await findUserById(db, user.id);
    const structId = u?.structure?.toString();
    const isOwner = loan.owner?.toString() === structId;
    const isBorrower = loan.borrower?.toString() === structId;
    const isRequester = loan.requestedBy?.toString() === user.id;
    const now = new Date();
    const releaseStatuses = ['refused', 'cancelled'];
    const keys = Object.keys(data);
    const status = (data as any).status;
    const types = await Promise.all(
      (loan.items || []).map(async (item: LoanItem) => {
        const eq = await db
          .collection('equipments')
          .findOne({ _id: item.equipment as any }, {
            projection: { type: 1 },
            session,
          });
        return (eq as any)?.type as string | undefined;
      }),
    );

    if (user.role !== ADMIN_ROLE) {
      switch (user.role) {
        case AUTRE_ROLE: {
          if (status === 'accepted' || status === 'refused') {
            if (!isOwner || keys.some((k) => k !== 'status')) {
              throw forbidden('Access denied');
            }
          } else {
            if (status && status !== 'cancelled') {
              throw forbidden('Access denied');
            }
            if (!isBorrower || !isRequester || new Date(loan.startDate) <= now) {
              throw forbidden('Access denied');
            }
          }
          break;
        }
        case REGISSEUR_SON_ROLE:
        case REGISSEUR_LUMIERE_ROLE:
        case REGISSEUR_PLATEAU_ROLE: {
          if (status === 'accepted' || status === 'refused') {
            if (
              !isOwner ||
              keys.some((k) => k !== 'status') ||
              !types.every((t) => canModify(user.role, t))
            ) {
              throw forbidden('Access denied');
            }
          } else {
            if (status && status !== 'cancelled') {
              throw forbidden('Access denied');
            }
            if (!isBorrower || !isRequester || new Date(loan.startDate) <= now) {
              throw forbidden('Access denied');
            }
          }
          break;
        }
        case REGISSEUR_GENERAL_ROLE: {
          if (status === 'accepted' || status === 'refused') {
            if (!isOwner || keys.some((k) => k !== 'status')) {
              throw forbidden('Access denied');
            }
          } else {
            if (status && status !== 'cancelled') {
              throw forbidden('Access denied');
            }
            if (!isBorrower || new Date(loan.startDate) <= now) {
              throw forbidden('Access denied');
            }
          }
          break;
        }
        default:
          throw forbidden('Access denied');
      }
    }

    if (status === 'accepted' || status === 'refused') {
      (data as any).processedBy = user.id;
    }

    if (
      status &&
      releaseStatuses.includes(status) &&
      !releaseStatuses.includes(loan.status as any)
    ) {
      for (const item of loan.items || []) {
        await db
          .collection('equipments')
          .updateOne(
            { _id: item.equipment },
            { $currentDate: { updatedAt: true } },
            { session },
          );
      }
    }
    if (
      status &&
      !releaseStatuses.includes(status) &&
      releaseStatuses.includes(loan.status as any)
    ) {
      const start = loan.startDate;
      const end = loan.endDate;
      for (const item of loan.items || []) {
        const avail = await checkEquipmentAvailability(
          db,
          item.equipment as any,
          start,
          end,
          item.quantity as number,
          session,
        );
        if (!avail?.available) {
          throw badRequest('Quantity not available');
        }
        await db
          .collection('equipments')
          .updateOne(
            { _id: item.equipment },
            { $currentDate: { updatedAt: true } },
            { session },
          );
      }
    }
    updated = await updateLoan(db, id, data, session);
    await session.commitTransaction();

    const requesterId =
      (loan.requestedBy as any)?._id?.toString?.() ||
      (loan.requestedBy as any)?.toString?.();
    const requester = requesterId ? await findUserById(db, requesterId) : null;
    const actorName = `${u?.firstName ? `${u.firstName} ` : ''}${
      u?.lastName ?? ''
    }`.trim() || u?.username || undefined;

    if (status) {
      try {
        const ownerId =
          (loan.owner as any)?._id?.toString?.() || (loan.owner as any)?.toString?.();
        const ownerContacts = ownerId
          ? await getLoanRecipients(db, ownerId, (loan.items || []) as any)
          : [];
        const recipients = new Set<string>(ownerContacts);

        if (requester?.email) {
          recipients.add(requester.email);
        }

        if (NOTIFY_EMAIL) {
          recipients.add(NOTIFY_EMAIL);
        }

        const to = Array.from(recipients).join(',');

        if (!to) {
          logger.warn(
            'Loan status notification not sent: no recipient email found for loan %s',
            loan._id,
          );
        } else {
          const { subject, text, html } = loanStatusTemplate({
            loan: updated ?? loan,
            status,
            actor: actorName,
          });
          await sendMail({
            to,
            subject,
            text,
            html,
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

export async function deleteLoanRequest(
  db: Db,
  user: AuthUser,
  id: string,
): Promise<{ message: string }> {
  const session = (db as any).client.startSession();
  session.startTransaction();
  try {
    const loan = await db
      .collection('loanrequests')
      .findOne({ _id: new ObjectId(id) }, { session });
    if (!loan) throw notFound('Loan request not found');

    if (user.role !== ADMIN_ROLE) {
      const u = await findUserById(db, user.id);
      const structId = u?.structure?.toString();
      const isBorrower = loan.borrower?.toString() === structId;
      const isRequester = loan.requestedBy?.toString() === user.id;
      switch (user.role) {
        case AUTRE_ROLE:
        case REGISSEUR_SON_ROLE:
        case REGISSEUR_LUMIERE_ROLE:
        case REGISSEUR_PLATEAU_ROLE:
          if (!isBorrower || !isRequester) {
            throw forbidden('Access denied');
          }
          break;
        case REGISSEUR_GENERAL_ROLE:
          if (!isBorrower) {
            throw forbidden('Access denied');
          }
          break;
        default:
          if (!isBorrower) {
            throw forbidden('Access denied');
          }
      }
      const start = new Date(loan.startDate);
      if (loan.status !== 'pending' && start <= new Date()) {
        throw forbidden('Access denied');
      }
    }

    for (const item of loan.items || []) {
      await db
        .collection('equipments')
        .updateOne(
          { _id: item.equipment },
          { $currentDate: { updatedAt: true } },
          { session },
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

export default {
  listLoans,
  getLoanRequestById,
  createLoanRequest,
  updateLoanRequest,
  deleteLoanRequest,
};

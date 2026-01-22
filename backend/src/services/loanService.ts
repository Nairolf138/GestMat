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
import { getLoanRecipientsByRole } from '../utils/getLoanRecipients';
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

const CLOSED_STATUSES = ['refused', 'cancelled'];
const DUE_SOON_DAYS = 7;

function filterLoansForUser(
  loans: LoanRequest[],
  user: AuthUser,
  structId: string,
): LoanRequest[] {
  const filterFn = (loan: LoanRequest) => {
    const typeOk = (loan.items || []).some((item) =>
      canModify(user.role, (item.equipment as any)?.type),
    );
    if (!typeOk) return false;

    const req: any = loan.requestedBy;
    const reqId = req?._id?.toString?.() || req?.toString?.();

    if (user.role === AUTRE_ROLE) {
      const borrowerId =
        (loan.borrower as any)?._id?.toString?.() ||
        (loan.borrower as any)?.toString?.();
      if (borrowerId === structId) {
        return reqId === user.id;
      }
      return true;
    }

    if (
      [REGISSEUR_SON_ROLE, REGISSEUR_LUMIERE_ROLE, REGISSEUR_PLATEAU_ROLE].includes(
        user.role,
      )
    ) {
      return true;
    }

    return true;
  };

  return loans.filter(filterFn);
}

function normalizeLoanResults(
  result: LoanRequest[] | { loans: LoanRequest[]; total?: number },
): LoanRequest[] {
  return Array.isArray(result) ? result : result.loans;
}

export async function countPendingLoans(db: Db, user: AuthUser): Promise<number> {
  if (user.role === ADMIN_ROLE) {
    return db.collection('loanrequests').countDocuments({
      status: 'pending',
      archived: { $ne: true },
    });
  }

  const u = await findUserById(db, user.id);
  const structId = u?.structure?.toString();
  if (!structId) return 0;

  const ownerId = new ObjectId(structId);
  const filter = {
    status: 'pending',
    archived: { $ne: true },
    $or: [{ owner: ownerId }, { 'owner._id': ownerId }],
  };

  const result = await findLoans(db, filter);
  const loans = normalizeLoanResults(result);
  return filterLoansForUser(loans, user, structId).length;
}

export async function listLoans(
  db: Db,
  user: AuthUser,
  page?: number,
  limit?: number,
  includeArchived = false,
): Promise<LoanRequest[] | { loans: LoanRequest[]; total: number }> {
  // includeArchived=true merges active + archived loans, with pagination applied to the merged list.
  if (user.role === ADMIN_ROLE) {
    return findLoans(db, {}, page, limit, { includeArchived });
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
  const res = await findLoans(db, filter, page, limit, { includeArchived });
  if (Array.isArray(res)) {
    return filterLoansForUser(res, user, structId);
  }
  const loans = filterLoansForUser(res.loans, user, structId);

  let total = loans.length;
  if (page !== undefined && limit !== undefined) {
    const fullResults = await findLoans(db, filter, undefined, undefined, {
      includeArchived,
    });
    const allLoans = normalizeLoanResults(fullResults);
    total = filterLoansForUser(allLoans, user, structId).length;
  }

  return { loans, total };
}

export async function listDueSoonLoans(
  db: Db,
  user: AuthUser,
): Promise<LoanRequest[]> {
  const now = new Date();
  const soon = new Date(now.getTime() + DUE_SOON_DAYS * 24 * 60 * 60 * 1000);
  const baseFilter = {
    endDate: { $gte: now, $lte: soon },
    status: { $nin: CLOSED_STATUSES },
  } as const;

  if (user.role === ADMIN_ROLE) {
    const result = await findLoans(db, baseFilter);
    return normalizeLoanResults(result);
  }

  const u = await findUserById(db, user.id);
  const structId = u?.structure?.toString();
  if (!structId) return [];

  const id = new ObjectId(structId);
  const filter = {
    ...baseFilter,
    $or: [
      { owner: id },
      { 'owner._id': id },
      { borrower: id },
      { 'borrower._id': id },
    ],
  };

  const result = await findLoans(db, filter);
  const loans = normalizeLoanResults(result);
  return filterLoansForUser(loans, user, structId);
}

export async function getLoanRequestById(
  db: Db,
  id: string,
): Promise<LoanRequest | null> {
  const result = await findLoans(db, { _id: new ObjectId(id) });
  const loan = Array.isArray(result) ? result[0] : result.loans[0];
  if (loan) return loan;

  const archived = await findLoans(db, { _id: new ObjectId(id) }, undefined, undefined, {
    includeArchived: true,
  });
  return Array.isArray(archived) ? archived[0] || null : archived.loans[0] || null;
}

export async function createLoanRequest(
  db: Db,
  data: LoanRequest,
  user: AuthUser,
): Promise<LoanRequest> {
  const start = data.startDate ? new Date(data.startDate) : null;
  const end = data.endDate ? new Date(data.endDate) : null;
  const items = data.items || [];
  const { direct: directFlag, ...requestData } = data as any;
  const u = await findUserById(db, user.id);
  const userStruct = u?.structure?.toString();
  const owner = (data.owner as any)?.toString();
  const borrower = (data.borrower as any)?.toString();
  if (owner && borrower && owner === borrower) {
    throw forbidden('Cannot request loan for own structure');
  }

  const equipmentDetails = await Promise.all(
    items.map(async (item: LoanItem) => {
      const equipment = await db
        .collection('equipments')
        .findOne<{ type?: string; structure?: ObjectId }>({
          _id: new ObjectId(item.equipment as any),
        });
      if (!equipment) {
        throw notFound('Equipment not found');
      }
      const type = equipment.type;
      if (!canModify(user.role, type)) {
        throw forbidden('Access denied');
      }
      const structureId =
        (equipment.structure as any)?._id?.toString?.() ||
        (equipment.structure as any)?.toString?.();
      return { type, structureId };
    }),
  );

  const isDirectOwner = Boolean(userStruct && owner === userStruct);
  if (directFlag && !isDirectOwner) {
    throw forbidden('Direct loan entry requires ownership');
  }
  const status = isDirectOwner ? 'accepted' : 'pending';

  for (let attempt = 0; attempt < 5; attempt++) {
    const session = (db as any).client.startSession();
    try {
      session.startTransaction();
      for (const [index, item] of items.entries()) {
        const detail = equipmentDetails[index];
        if (
          isDirectOwner &&
          detail?.structureId &&
          owner &&
          detail.structureId !== owner
        ) {
          throw forbidden('Equipment must belong to the owner structure');
        }
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
        {
          ...requestData,
          status,
          requestedBy: user.id as any,
          processedBy: isDirectOwner ? (user.id as any) : undefined,
        },
        session,
      );
      await session.commitTransaction();
      session.endSession();

      try {
        const ownerId =
          (loan.owner as any)?._id?.toString?.() || (loan.owner as any)?.toString?.();
        const borrowerId =
          (loan.borrower as any)?._id?.toString?.() || (loan.borrower as any)?.toString?.();
        const requestedById =
          (loan.requestedBy as any)?._id?.toString?.() ||
          (loan.requestedBy as any)?.toString?.() ||
          (user.id as any)?.toString?.();

        const { ownerRecipients, borrowerRecipients, requesterRecipients } =
          await getLoanRecipientsByRole(db, items as any, {
            ownerId,
            borrowerId,
            borrower: loan.borrower,
            requestedById,
            requestedBy: loan.requestedBy,
          }, status === 'pending' ? 'loanRequests' : 'loanStatusChanges');

        const requesterSet = new Set(requesterRecipients);
        const borrowerSet = new Set(
          borrowerRecipients.filter((email) => !requesterSet.has(email)),
        );
        const ownerSet = new Set(
          ownerRecipients.filter(
            (email) => !requesterSet.has(email) && !borrowerSet.has(email),
          ),
        );

        if (!ownerSet.size && (borrowerSet.size || requesterSet.size)) {
          logger.warn(
            'Loan creation notification falling back to secondary recipients: %o',
            Array.from(new Set([...borrowerSet, ...requesterSet])),
          );
        }

        if (NOTIFY_EMAIL) {
          ownerSet.add(NOTIFY_EMAIL);
        }

        if (!ownerSet.size && !borrowerSet.size && !requesterSet.size) {
          logger.warn(
            'Loan creation notification not sent: no recipient email found for loan %s',
            loan._id,
          );
        } else {
          const sendCreationMail = async (
            recipients: Set<string>,
            role: 'owner' | 'borrower' | 'requester',
          ) => {
            if (!recipients.size) return;
            const to = Array.from(recipients).join(',');
            const { subject, text, html } =
              status === 'pending'
                ? loanCreationTemplate({ loan, role })
                : loanStatusTemplate({
                    loan,
                    status,
                    role,
                    actor:
                      `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim() ||
                      u?.username ||
                      undefined,
                  });
            await sendMail({ to, subject, text, html });
          };

          await Promise.all([
            sendCreationMail(ownerSet, 'owner'),
            sendCreationMail(borrowerSet, 'borrower'),
            sendCreationMail(requesterSet, 'requester'),
          ]);
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
    const decisionAllowedKeys = ['status', 'decisionNote'];
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
            if (!isOwner || keys.some((k) => !decisionAllowedKeys.includes(k))) {
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
              keys.some((k) => !decisionAllowedKeys.includes(k)) ||
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
            if (!isOwner || keys.some((k) => !decisionAllowedKeys.includes(k))) {
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
      const decisionNote = (data as any).decisionNote;
      if (typeof decisionNote === 'string') {
        const trimmed = decisionNote.trim();
        if (trimmed) {
          (data as any).decisionNote = trimmed;
        } else {
          delete (data as any).decisionNote;
        }
      } else {
        delete (data as any).decisionNote;
      }
    } else {
      delete (data as any).decisionNote;
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
        const borrowerId =
          (loan.borrower as any)?._id?.toString?.() || (loan.borrower as any)?.toString?.();
        const { ownerRecipients, borrowerRecipients, requesterRecipients } =
          await getLoanRecipientsByRole(db, (loan.items || []) as any, {
            ownerId,
            borrowerId,
            borrower: loan.borrower,
            requestedById: requesterId,
            requestedBy: requester ?? loan.requestedBy,
          }, 'loanStatusChanges');

        const requesterSet = new Set(requesterRecipients);
        const borrowerSet = new Set(
          borrowerRecipients.filter((email) => !requesterSet.has(email)),
        );
        const ownerSet = new Set(
          ownerRecipients.filter(
            (email) => !requesterSet.has(email) && !borrowerSet.has(email),
          ),
        );

        if (NOTIFY_EMAIL) {
          ownerSet.add(NOTIFY_EMAIL);
        }

        const sendStatusMail = async (
          recipients: Set<string>,
          role: 'owner' | 'borrower' | 'requester',
        ) => {
          if (!recipients.size) return;
          const to = Array.from(recipients).join(',');
          const { subject, text, html } = loanStatusTemplate({
            loan: updated ?? loan,
            status,
            actor: actorName,
            role,
          });
          await sendMail({ to, subject, text, html });
        };

        if (!ownerSet.size && !borrowerSet.size && !requesterSet.size) {
          logger.warn(
            'Loan status notification not sent: no recipient email found for loan %s',
            loan._id,
          );
        } else {
          await Promise.all([
            sendStatusMail(ownerSet, 'owner'),
            sendStatusMail(borrowerSet, 'borrower'),
            sendStatusMail(requesterSet, 'requester'),
          ]);
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
      const ownerId =
        (loan.owner as any)?._id?.toString?.() || (loan.owner as any)?.toString?.();
      const isBorrower = loan.borrower?.toString() === structId;
      const isRequester = loan.requestedBy?.toString() === user.id;
      const isOwner = ownerId === structId;
      const isCancelled = loan.status === 'cancelled';

      // Allow the lending structure to remove cancelled requests
      if (!(isCancelled && isOwner)) {
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

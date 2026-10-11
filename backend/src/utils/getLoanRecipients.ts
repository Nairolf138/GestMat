import { Db, ObjectId } from 'mongodb';
import {
  LoanItem,
  LoanRequest,
  populateLoanRequest,
} from '../models/LoanRequest';
import {
  canAccessEquipmentLine,
  idOf,
  loanLines,
  summarizeLines,
} from './loanLines';
import { vehicleManagerIds } from './vehicleAccess';
import {
  NotificationPreference,
  isNotificationEnabled,
} from './notificationPreferences';
import { processMailOutbox, queueMail } from '../services/mailOutboxService';
import logger from './logger';
import { LOAN_ARCHIVE_EMAIL } from '../config';

type RecipientRole = 'owner' | 'borrower' | 'requester';
interface Context {
  ownerId?: string | null;
  borrowerId?: string | null;
  borrower?: unknown;
  requestedById?: string | null;
  requestedBy?: unknown;
}
interface Options {
  requireSystemAlerts?: boolean;
  eventKey?: string;
  expiresAt?: Date;
  validity?: Extract<
    import('../services/mailOutboxService').MailValidity,
    { kind: 'loan-start' | 'loan-overdue' | 'loan-event' }
  >;
  trace?: (value: any) => void;
}
export type LoanNotificationPreference =
  | NotificationPreference
  | { equipment: NotificationPreference; vehicle: NotificationPreference };

function preferenceForItem(
  preference: LoanNotificationPreference,
  item: LoanItem,
): NotificationPreference {
  return typeof preference === 'string'
    ? preference
    : item.kind === 'vehicle'
      ? preference.vehicle
      : preference.equipment;
}
export interface LoanRecipientGroups {
  ownerRecipients: string[];
  borrowerRecipients: string[];
  requesterRecipients: string[];
}
export interface LoanNotificationTarget {
  email: string;
  role: RecipientRole;
  items: LoanItem[];
  userIds: string[];
}

export async function getLoanNotificationTargets(
  db: Db,
  loan: LoanRequest,
  preference: LoanNotificationPreference,
  options: Options = {},
): Promise<LoanNotificationTarget[]> {
  const populated = await populateLoanRequest(db, {
    ...loan,
    items: (loan.items || []).map((item) => ({ ...item })),
  });
  const items = loanLines(populated);
  const managers = new Map<string, string[]>();
  for (const item of items)
    if (item.kind === 'vehicle') {
      managers.set(
        idOf(item.vehicle),
        await vehicleManagerIds(db, item.vehicle),
      );
    }
  const structureIds = [
    ...new Set(
      [idOf(loan.owner), idOf(loan.borrower)].filter((id) =>
        ObjectId.isValid(id),
      ),
    ),
  ];
  const accountIds = [
    ...new Set(
      [idOf(loan.requestedBy), ...[...managers.values()].flat()].filter((id) =>
        ObjectId.isValid(id),
      ),
    ),
  ];
  const users = await db
    .collection('users')
    .find({
      $or: [
        { structure: { $in: structureIds.map((id) => new ObjectId(id)) } },
        { _id: { $in: accountIds.map((id) => new ObjectId(id)) } },
      ],
    })
    .toArray();
  const byEmail = new Map<string, LoanNotificationTarget>();
  for (const user of users) {
    if (
      !user.email ||
      (options.requireSystemAlerts &&
        !isNotificationEnabled(user as any, 'systemAlerts'))
    ) {
      options.trace?.({
        identifier: idOf(user),
        role: idOf(user.structure) === idOf(loan.owner) ? 'owner' : 'borrower',
        preference,
        reason: 'missing email or opt-out',
      });
      continue;
    }
    const relevant = items.filter(
      (item) =>
        isNotificationEnabled(
          user as any,
          preferenceForItem(preference, item),
        ) &&
        (item.kind === 'vehicle'
          ? idOf(user) === idOf(loan.requestedBy) ||
            (managers.get(idOf(item.vehicle)) || []).includes(idOf(user))
          : canAccessEquipmentLine(user, item, populated)),
    );
    if (!relevant.length) {
      options.trace?.({
        identifier: idOf(user),
        preference,
        reason: 'no relevant line, insufficient access or opt-out',
      });
      continue;
    }
    const email = String(user.email).trim().toLowerCase();
    if (!email) continue;
    const role: RecipientRole =
      idOf(user.structure) === idOf(loan.owner) ||
      relevant.some(
        (item) =>
          item.kind === 'vehicle' &&
          (managers.get(idOf(item.vehicle)) || []).includes(idOf(user)),
      )
        ? 'owner'
        : idOf(user) === idOf(loan.requestedBy) &&
            relevant.some((item) => item.kind === 'vehicle')
          ? 'requester'
          : 'borrower';
    const existing = byEmail.get(email);
    if (existing) {
      const known = new Set(existing.items.map((item) => item.lineId));
      existing.items.push(
        ...relevant.filter((item) => !known.has(item.lineId)),
      );
      if (!existing.userIds.includes(idOf(user)))
        existing.userIds.push(idOf(user));
    } else
      byEmail.set(email, {
        email,
        role,
        items: relevant,
        userIds: [idOf(user)],
      });
  }
  if (!byEmail.size) logger.warn('Loan notification: no recipients found');
  return [...byEmail.values()];
}

export async function getLoanRecipientsByRole(
  db: Db,
  items: any[],
  context: Context,
  preference: NotificationPreference = 'loanStatusChanges',
  options: Options = {},
): Promise<LoanRecipientGroups> {
  const loan: LoanRequest = {
    items,
    owner: context.ownerId as any,
    borrower: (context.borrowerId || context.borrower) as any,
    requestedBy: (context.requestedById || context.requestedBy) as any,
  };
  const targets = await getLoanNotificationTargets(
    db,
    loan,
    preference,
    options,
  );
  return {
    ownerRecipients: targets
      .filter((t) => t.role === 'owner')
      .map((t) => t.email),
    borrowerRecipients: targets
      .filter((t) => t.role === 'borrower')
      .map((t) => t.email),
    requesterRecipients: targets
      .filter((t) => t.role === 'requester')
      .map((t) => t.email),
  };
}

export async function getLoanRecipients(
  db: Db,
  items: any[],
  context: Context,
  preference: NotificationPreference = 'loanStatusChanges',
  options: Options = {},
): Promise<string[]> {
  const groups = await getLoanRecipientsByRole(
    db,
    items,
    context,
    preference,
    options,
  );
  return [
    ...new Set([
      ...groups.ownerRecipients,
      ...groups.borrowerRecipients,
      ...groups.requesterRecipients,
    ]),
  ];
}

export async function deliverLoanNotification(
  db: Db,
  loan: LoanRequest,
  template: (context: { loan: LoanRequest; role: RecipientRole }) => {
    subject: string;
    text: string;
    html: string;
  },
  preference: LoanNotificationPreference,
  options: Options = {},
): Promise<void> {
  const populated = await populateLoanRequest(db, {
    ...loan,
    items: (loan.items || []).map((item) => ({ ...item })),
  });
  const targets = await getLoanNotificationTargets(
    db,
    populated,
    preference,
    options,
  );
  const archiveEmail = LOAN_ARCHIVE_EMAIL?.trim().toLowerCase();
  const archiveAccount = archiveEmail
    ? await db.collection('users').findOne({
        email: {
          $regex: `^${archiveEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
          $options: 'i',
        },
      })
    : null;
  if (archiveAccount)
    logger.warn(
      'Loan archive address belongs to a user account; archive copy skipped',
    );
  const sendArchive = Boolean(archiveEmail && !archiveAccount);
  const eventKey =
    options.eventKey ||
    `loan:${idOf(loan)}:${String(loan.revision ?? 0)}:${String(loan.status ?? 'unknown')}:${typeof preference === 'string' ? preference : preference.equipment}`;
  const baseValidity: NonNullable<Options['validity']> = options.validity || {
    kind: 'loan-event',
    resourceId: idOf(loan),
    revision: Number(loan.revision || 0),
  };
  const preferences =
    typeof preference === 'string'
      ? { equipment: preference, vehicle: preference }
      : preference;
  for (const target of targets) {
    if (sendArchive && target.email === archiveEmail) continue;
    const lineIds = new Set(target.items.map((item) => item.lineId));
    const scoped = {
      ...populated,
      items: target.items,
      status: summarizeLines(target.items),
      history: ((populated.history || []) as any[]).filter(
        (entry) => !entry.lineId || lineIds.has(entry.lineId),
      ),
    };
    await queueMail(
      db,
      `${eventKey}:recipient:${target.email}`,
      {
        to: target.email,
        ...template({ loan: scoped, role: target.role }),
      },
      options.expiresAt,
      {
        ...baseValidity,
        recipient: {
          email: target.email,
          userIds: target.userIds,
          lineIds: target.items.map((item) => String(item.lineId)),
          preferences,
          requireSystemAlerts: options.requireSystemAlerts,
        },
      },
    );
  }
  // An archive is sent only when explicitly configured.
  if (sendArchive && archiveEmail)
    await queueMail(
      db,
      `${eventKey}:archive`,
      {
        bcc: archiveEmail,
        ...template({ loan: populated, role: 'owner' }),
      },
      options.expiresAt,
      baseValidity,
    );
  await processMailOutbox(db);
}

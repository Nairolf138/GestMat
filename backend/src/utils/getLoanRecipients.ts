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
import { sendMail } from './sendMail';
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
  trace?: (value: any) => void;
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
}

export async function getLoanNotificationTargets(
  db: Db,
  loan: LoanRequest,
  preference: NotificationPreference,
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
      !isNotificationEnabled(user as any, preference) ||
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
    const relevant = items.filter((item) =>
      item.kind === 'vehicle'
        ? idOf(user) === idOf(loan.requestedBy) ||
          (managers.get(idOf(item.vehicle)) || []).includes(idOf(user))
        : canAccessEquipmentLine(user, item, populated),
    );
    if (!relevant.length) continue;
    const email = String(user.email).trim().toLowerCase();
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
    } else byEmail.set(email, { email, role, items: relevant });
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
  preference: NotificationPreference,
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
  const deliveries: Promise<unknown>[] = [];
  for (const target of targets) {
    if (target.email === archiveEmail) continue;
    const lineIds = new Set(target.items.map((item) => item.lineId));
    const scoped = {
      ...populated,
      items: target.items,
      status: summarizeLines(target.items),
      history: ((populated.history || []) as any[]).filter(
        (entry) => !entry.lineId || lineIds.has(entry.lineId),
      ),
    };
    deliveries.push(
      sendMail({
        to: target.email,
        ...template({ loan: scoped, role: target.role }),
      }),
    );
  }
  // Separate BCC-only archive envelope: complete event, once, even if every user opted out.
  if (archiveEmail)
    deliveries.push(
      sendMail({
        bcc: archiveEmail,
        ...template({ loan: populated, role: 'owner' }),
      }),
    );
  for (const result of await Promise.allSettled(deliveries))
    if (result.status === 'rejected')
      logger.error('Loan mail delivery failed: %o', result.reason);
}

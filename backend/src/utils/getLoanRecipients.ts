import { Db, ObjectId } from 'mongodb';
import { canModify } from './roleAccess';
import {
  NotificationPreference,
  getNotificationStatus,
  isNotificationEnabled,
} from './notificationPreferences';
import logger from './logger';

type LoanRecipientRole = 'owner' | 'borrower' | 'requester';

interface LoanRecipientContext {
  ownerId?: string | null;
  borrowerId?: string | null;
  borrower?: unknown;
  requestedById?: string | null;
  requestedBy?: unknown;
}

export interface LoanRecipientGroups {
  ownerRecipients: string[];
  borrowerRecipients: string[];
  requesterRecipients: string[];
}

interface LoanItemRef {
  equipment: any;
}

interface RecipientFilterOptions {
  requireSystemAlerts?: boolean;
  trace?: (details: RecipientTrace) => void;
}

interface RecipientTrace {
  role: LoanRecipientRole | 'structure';
  identifier?: string;
  email?: string;
  preference?: NotificationPreference;
  reason: string;
}

function shouldNotify(
  user: any,
  preference: NotificationPreference,
  { requireSystemAlerts = false }: RecipientFilterOptions = {},
): { allowed: boolean; reason?: string } {
  const preferenceStatus = getNotificationStatus(user, preference);
  if (!preferenceStatus.enabled) {
    return {
      allowed: false,
      reason: `opt-out for ${preference} (${preferenceStatus.source})`,
    };
  }

  if (requireSystemAlerts && !isNotificationEnabled(user, 'systemAlerts')) {
    return { allowed: false, reason: 'opt-out for systemAlerts' };
  }

  return { allowed: true };
}

async function findOwnerRecipients(
  db: Db,
  items: LoanItemRef[],
  ownerId?: string | null,
  preference: NotificationPreference = 'loanStatusChanges',
  options: RecipientFilterOptions = {},
): Promise<string[]> {
  if (!ownerId) return [];

  const types = (
    await Promise.all(
      items.map(async (it) => {
        const eq = await db
          .collection('equipments')
          .findOne<{ type?: string }>({ _id: new ObjectId(it.equipment) });
        return eq?.type;
      }),
    )
  ).filter(Boolean) as string[];

  const users = await db
    .collection('users')
    .find({ structure: new ObjectId(ownerId) })
    .toArray();

  return users
    .filter((u: any) => {
      const result = shouldNotify(u, preference, options);
      if (!result.allowed) {
        options.trace?.({
          role: 'owner',
          identifier: u._id?.toString?.(),
          email: u.email,
          preference,
          reason: result.reason ?? 'notification disabled',
        });
      }
      if (!u.email) {
        options.trace?.({
          role: 'owner',
          identifier: u._id?.toString?.(),
          preference,
          reason: 'missing email',
        });
      }
      return (
        u.email &&
        result.allowed &&
        (!types.length || types.some((t) => canModify(u.role, t)))
      );
    })
    .map((u: any) => u.email as string);
}

async function findRequesterRecipients(
  db: Db,
  { requestedById, requestedBy }: LoanRecipientContext,
  preference: NotificationPreference = 'loanStatusChanges',
  options: RecipientFilterOptions = {},
): Promise<string[]> {
  const requesterEmail = (requestedBy as any)?.email;
  const normalizedEmail =
    typeof requesterEmail === 'string' && requesterEmail.trim() ? requesterEmail.trim() : null;
  const shouldReload =
    !requestedBy || !normalizedEmail || (requestedBy as any)?.preferences === undefined;
  const canReload = requestedById && ObjectId.isValid(requestedById);

  const requester =
    shouldReload && canReload
      ? await db
          .collection('users')
          .findOne<{ email?: string; preferences?: any }>({ _id: new ObjectId(requestedById) })
      : (requestedBy as any);

  if (!normalizedEmail && !requester?.email) {
    return [];
  }

  const emailToUse = normalizedEmail ?? requester?.email;
  const result = shouldNotify(requester, preference, options);
  if (!result.allowed) {
    options.trace?.({
      role: 'requester',
      identifier: requestedById ?? (requester as any)?._id?.toString?.(),
      email: emailToUse,
      preference,
      reason: result.reason ?? 'notification disabled',
    });
    return [];
  }

  if (emailToUse) {
    return [emailToUse];
  }

  return [];
}

async function findBorrowerRecipients(
  db: Db,
  { borrowerId, borrower }: LoanRecipientContext,
  preference: NotificationPreference = 'loanStatusChanges',
  options: RecipientFilterOptions = {},
): Promise<string[]> {
  const recipients: string[] = [];

  const borrowerEmail = (borrower as any)?.email;
  if (typeof borrowerEmail === 'string' && borrowerEmail.trim()) {
    recipients.push(borrowerEmail.trim());
  }

  if (!borrowerId || !ObjectId.isValid(borrowerId)) return recipients;

  const borrowerStructure = await db
    .collection('structures')
    .findOne<{ email?: string }>({ _id: new ObjectId(borrowerId) });

  if (borrowerStructure?.email && typeof borrowerStructure.email === 'string') {
    recipients.push(borrowerStructure.email);
  }

  const borrowerUsers = await db
    .collection('users')
    .find({ structure: new ObjectId(borrowerId) })
    .toArray();

  borrowerUsers
    .filter((u: any) => {
      const result = shouldNotify(u, preference, options);
      if (!result.allowed) {
        options.trace?.({
          role: 'borrower',
          identifier: u._id?.toString?.(),
          email: u.email,
          preference,
          reason: result.reason ?? 'notification disabled',
        });
      }
      if (!u.email) {
        options.trace?.({
          role: 'borrower',
          identifier: u._id?.toString?.(),
          preference,
          reason: 'missing email',
        });
      }
      return u.email && result.allowed;
    })
    .forEach((u: any) => recipients.push(u.email as string));

  return recipients;
}

export async function getLoanRecipientsByRole(
  db: Db,
  items: LoanItemRef[],
  context: LoanRecipientContext,
  preference: NotificationPreference = 'loanStatusChanges',
  options: RecipientFilterOptions = {},
): Promise<LoanRecipientGroups> {
  const trace = options.trace;
  const ownerRecipients = await findOwnerRecipients(
    db,
    items,
    context.ownerId,
    preference,
    options,
  );
  const borrowerRecipients = await findBorrowerRecipients(db, context, preference, options);
  const requesterRecipients = await findRequesterRecipients(db, context, preference, options);

  if (!ownerRecipients.length) {
    trace?.({
      role: 'owner',
      identifier: context.ownerId ?? undefined,
      reason: `no recipients resolved for preference ${preference}`,
    });
  }
  if (!borrowerRecipients.length) {
    trace?.({
      role: 'borrower',
      identifier: context.borrowerId ?? undefined,
      reason: `no recipients resolved for preference ${preference}`,
    });
  }
  if (!requesterRecipients.length) {
    trace?.({
      role: 'requester',
      identifier: context.requestedById ?? undefined,
      reason: `no recipients resolved for preference ${preference}`,
    });
  }

  return { ownerRecipients, borrowerRecipients, requesterRecipients };
}

export async function getLoanRecipients(
  db: Db,
  items: LoanItemRef[],
  context: LoanRecipientContext,
  preference: NotificationPreference = 'loanStatusChanges',
  options: RecipientFilterOptions = {},
): Promise<string[]> {
  const traces: RecipientTrace[] = [];
  const trace =
    options.trace ??
    ((details: RecipientTrace) => {
      traces.push(details);
    });

  const { ownerRecipients, borrowerRecipients, requesterRecipients } =
    await getLoanRecipientsByRole(db, items, context, preference, { ...options, trace });

  const recipients = Array.from(
    new Set([...ownerRecipients, ...borrowerRecipients, ...requesterRecipients]),
  );

  if (!recipients.length) {
    logger.warn(
      'Loan notification: no recipients found (owner: %s, borrower: %s, requester: %s, preference: %s). Trace: %o',
      context.ownerId ?? 'unknown',
      context.borrowerId ?? 'unknown',
      context.requestedById ?? 'unknown',
      preference,
      traces,
    );
  }

  return recipients;
}

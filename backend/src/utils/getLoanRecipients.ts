import { Db, ObjectId } from 'mongodb';
import { canModify } from './roleAccess';
import { isNotificationEnabled } from './notificationPreferences';

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

async function findOwnerRecipients(
  db: Db,
  items: LoanItemRef[],
  ownerId?: string | null,
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
    .filter(
      (u: any) =>
        u.email &&
        isNotificationEnabled(u, 'structureUpdates') &&
        (!types.length || types.some((t) => canModify(u.role, t))),
    )
    .map((u: any) => u.email as string);
}

async function findRequesterRecipients(
  db: Db,
  { requestedById, requestedBy }: LoanRecipientContext,
): Promise<string[]> {
  const requesterEmail = (requestedBy as any)?.email;
  if (typeof requesterEmail === 'string' && requesterEmail.trim()) {
    return [requesterEmail.trim()];
  }

  if (!requestedById || !ObjectId.isValid(requestedById)) return [];

  const requester = await db
    .collection('users')
    .findOne<{ email?: string; preferences?: any }>({ _id: new ObjectId(requestedById) });

  if (requester?.email && isNotificationEnabled(requester, 'structureUpdates')) {
    return [requester.email];
  }

  return [];
}

async function findBorrowerRecipients(
  db: Db,
  { borrowerId, borrower }: LoanRecipientContext,
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
    .filter((u: any) => u.email && isNotificationEnabled(u, 'structureUpdates'))
    .forEach((u: any) => recipients.push(u.email as string));

  return recipients;
}

export async function getLoanRecipientsByRole(
  db: Db,
  items: LoanItemRef[],
  context: LoanRecipientContext,
): Promise<LoanRecipientGroups> {
  const ownerRecipients = await findOwnerRecipients(db, items, context.ownerId);
  const borrowerRecipients = await findBorrowerRecipients(db, context);
  const requesterRecipients = await findRequesterRecipients(db, context);

  return { ownerRecipients, borrowerRecipients, requesterRecipients };
}

export async function getLoanRecipients(
  db: Db,
  items: LoanItemRef[],
  context: LoanRecipientContext,
): Promise<string[]> {
  const { ownerRecipients, borrowerRecipients, requesterRecipients } =
    await getLoanRecipientsByRole(db, items, context);

  return Array.from(
    new Set([...ownerRecipients, ...borrowerRecipients, ...requesterRecipients]),
  );
}

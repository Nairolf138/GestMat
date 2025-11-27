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

interface LoanItemRef {
  equipment: any;
}

export async function getLoanRecipients(
  db: Db,
  items: LoanItemRef[],
  { ownerId, borrowerId, borrower, requestedById, requestedBy }: LoanRecipientContext,
): Promise<string[]> {
  const recipients = new Set<string>();

  if (ownerId) {
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

    users
      .filter(
        (u: any) =>
          u.email &&
          isNotificationEnabled(u, 'structureUpdates') &&
          (!types.length || types.some((t) => canModify(u.role, t))),
      )
      .forEach((u: any) => recipients.add(u.email as string));
  }

  const requesterEmail = (requestedBy as any)?.email;
  if (typeof requesterEmail === 'string' && requesterEmail.trim()) {
    recipients.add(requesterEmail.trim());
  } else if (requestedById && ObjectId.isValid(requestedById)) {
    const requester = await db
      .collection('users')
      .findOne<{ email?: string; preferences?: any }>({ _id: new ObjectId(requestedById) });
    if (requester?.email && isNotificationEnabled(requester, 'structureUpdates')) {
      recipients.add(requester.email);
    }
  }

  const borrowerEmail = (borrower as any)?.email;
  if (typeof borrowerEmail === 'string' && borrowerEmail.trim()) {
    recipients.add(borrowerEmail.trim());
  }

  if (borrowerId && ObjectId.isValid(borrowerId)) {
    const borrowerStructure = await db
      .collection('structures')
      .findOne<{ email?: string }>({ _id: new ObjectId(borrowerId) });

    if (borrowerStructure?.email && typeof borrowerStructure.email === 'string') {
      recipients.add(borrowerStructure.email);
    }

    const borrowerUsers = await db
      .collection('users')
      .find({ structure: new ObjectId(borrowerId) })
      .toArray();

    borrowerUsers
      .filter((u: any) => u.email && isNotificationEnabled(u, 'structureUpdates'))
      .forEach((u: any) => recipients.add(u.email as string));
  }

  return Array.from(recipients);
}

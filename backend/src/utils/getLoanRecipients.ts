import { Db, ObjectId } from 'mongodb';
import { canModify } from './roleAccess';

interface LoanItemRef {
  equipment: any;
}

export async function getLoanRecipients(
  db: Db,
  ownerId: string,
  items: LoanItemRef[],
): Promise<string[]> {
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
  const emails = users
    .filter((u: any) => u.email && types.some((t) => canModify(u.role, t)))
    .map((u: any) => u.email as string);
  return [...new Set(emails)];
}

import { Db, ObjectId, ClientSession } from 'mongodb';

export interface LoanItem {
  equipment?: ObjectId | Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoanRequest {
  _id?: ObjectId;
  borrower?: ObjectId | Record<string, unknown>;
  owner?: ObjectId | Record<string, unknown>;
  requestedBy?: ObjectId | Record<string, unknown>;
  processedBy?: ObjectId | Record<string, unknown>;
  items?: LoanItem[];
  startDate?: Date;
  endDate?: Date;
  [key: string]: unknown;
}

async function _populate(
  db: Db,
  loan: LoanRequest,
  session?: ClientSession,
): Promise<LoanRequest> {
  await Promise.all([
    loan.borrower
      ? db
          .collection('structures')
          .findOne({ _id: loan.borrower as ObjectId }, { session })
          .then((s) => {
            loan.borrower = s || loan.borrower;
          })
      : null,
    loan.owner
      ? db
          .collection('structures')
          .findOne({ _id: loan.owner as ObjectId }, { session })
          .then((s) => {
            loan.owner = s || loan.owner;
          })
      : null,
    loan.requestedBy
      ? db
          .collection('users')
          .findOne({ _id: loan.requestedBy as ObjectId }, { session })
          .then((u) => {
            loan.requestedBy = u || loan.requestedBy;
          })
      : null,
    loan.processedBy
      ? db
          .collection('users')
          .findOne({ _id: loan.processedBy as ObjectId }, { session })
          .then((u) => {
            loan.processedBy = u || loan.processedBy;
          })
      : null,
    loan.items
      ? Promise.all(
          loan.items.map(async (item) => {
            if (item.equipment) {
              item.equipment =
                (await db
                  .collection('equipments')
                  .findOne({ _id: item.equipment as ObjectId }, { session })) ||
                item.equipment;
            }
          }),
        )
      : null,
  ]);
  return loan;
}

export async function findLoans(
  db: Db,
  filter: Record<string, unknown> = {},
): Promise<LoanRequest[]> {
  const loans = await db
    .collection<LoanRequest>('loanrequests')
    .find(filter)
    .toArray();
  await Promise.all(loans.map((loan) => _populate(db, loan)));
  return loans;
}

export async function createLoan(
  db: Db,
  data: LoanRequest,
  session?: ClientSession,
): Promise<LoanRequest> {
  if (data.borrower) data.borrower = new ObjectId(data.borrower as ObjectId);
  if (data.owner) data.owner = new ObjectId(data.owner as ObjectId);
  if (data.requestedBy)
    data.requestedBy = new ObjectId(data.requestedBy as ObjectId);
  if (data.processedBy)
    data.processedBy = new ObjectId(data.processedBy as ObjectId);
  if (data.items) {
    data.items = data.items.map((it) => ({
      ...it,
      equipment: new ObjectId(it.equipment as ObjectId),
    }));
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const result = await db
    .collection<LoanRequest>('loanrequests')
    .insertOne(data, { session });
  const loan: LoanRequest = { _id: result.insertedId, ...data };
  return _populate(db, loan, session);
}

export async function updateLoan(
  db: Db,
  id: string,
  data: LoanRequest,
  session?: ClientSession,
): Promise<LoanRequest | null> {
  if (data.borrower) data.borrower = new ObjectId(data.borrower as ObjectId);
  if (data.owner) data.owner = new ObjectId(data.owner as ObjectId);
  if (data.requestedBy)
    data.requestedBy = new ObjectId(data.requestedBy as ObjectId);
  if (data.processedBy)
    data.processedBy = new ObjectId(data.processedBy as ObjectId);
  if (data.items) {
    data.items = data.items.map((it) => ({
      ...it,
      equipment: new ObjectId(it.equipment as ObjectId),
    }));
  }
  if (data.startDate) data.startDate = new Date(data.startDate);
  if (data.endDate) data.endDate = new Date(data.endDate);
  const res = await db
    .collection<LoanRequest>('loanrequests')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: data },
      { returnDocument: 'after', session },
    );
  if (!res.value) return null;
  return _populate(db, res.value, session);
}

export async function deleteLoan(
  db: Db,
  id: string,
  session?: ClientSession,
): Promise<boolean> {
  const res = await db
    .collection('loanrequests')
    .deleteOne({ _id: new ObjectId(id) }, { session });
  return res.deletedCount > 0;
}

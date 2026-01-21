import { Db, ObjectId } from 'mongodb';

export type InvestmentStatus = 'draft' | 'submitted' | 'validated';
export type TargetYear = 'year1' | 'year2';

export interface InvestmentLine {
  _id?: ObjectId;
  structure?: ObjectId | Record<string, unknown>;
  targetYear?: TargetYear;
  type?: string;
  /** @deprecated use type */
  category?: string;
  quantity?: number;
  unitCost?: number;
  totalCost?: number;
  priority?: number;
  justification?: string;
  status?: InvestmentStatus;
  createdBy?: ObjectId | Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

export interface InvestmentPlan {
  _id?: ObjectId;
  structure?: ObjectId | Record<string, unknown>;
  targetYear?: TargetYear;
  lines?: InvestmentLine[];
  totalCost?: number;
  status?: InvestmentStatus;
  createdBy?: ObjectId | Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
}

const toObjectId = (value?: unknown): ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string') return new ObjectId(value);
  return value as ObjectId;
};

const normalizeLineIds = (line: InvestmentLine): InvestmentLine => ({
  ...line,
  _id: line._id ? toObjectId(line._id) : line._id,
  structure: toObjectId(line.structure),
  createdBy: toObjectId(line.createdBy),
});

export async function findInvestmentPlans(
  db: Db,
  filter: Record<string, unknown> = {},
): Promise<InvestmentPlan[]> {
  return db.collection<InvestmentPlan>('investmentplans').find(filter).toArray();
}

export async function findInvestmentPlanById(
  db: Db,
  id: string,
): Promise<InvestmentPlan | null> {
  return db
    .collection<InvestmentPlan>('investmentplans')
    .findOne({ _id: new ObjectId(id) });
}

export async function createInvestmentPlan(
  db: Db,
  data: InvestmentPlan,
): Promise<InvestmentPlan> {
  const payload: InvestmentPlan = {
    ...data,
    structure: toObjectId(data.structure),
    createdBy: toObjectId(data.createdBy),
    lines: data.lines?.map(normalizeLineIds),
    createdAt: data.createdAt ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : data.updatedAt,
  };
  const result = await db
    .collection<InvestmentPlan>('investmentplans')
    .insertOne(payload);
  return { _id: result.insertedId, ...payload };
}

export async function updateInvestmentPlan(
  db: Db,
  id: string,
  data: InvestmentPlan,
): Promise<InvestmentPlan | null> {
  const payload: InvestmentPlan = {
    ...data,
    structure: toObjectId(data.structure),
    createdBy: toObjectId(data.createdBy),
    lines: data.lines?.map(normalizeLineIds),
    createdAt: data.createdAt ? new Date(data.createdAt) : data.createdAt,
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : data.updatedAt,
  };
  const res = await db
    .collection<InvestmentPlan>('investmentplans')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: payload },
      { returnDocument: 'after' },
    );
  return res.value;
}

export async function deleteInvestmentPlan(
  db: Db,
  id: string,
): Promise<boolean> {
  const res = await db
    .collection('investmentplans')
    .deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

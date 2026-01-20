import { Db, ObjectId } from 'mongodb';
import {
  createInvestmentPlan,
  deleteInvestmentPlan,
  findInvestmentPlanById,
  findInvestmentPlans,
  InvestmentLine,
  InvestmentPlan,
  InvestmentStatus,
  TargetYear,
  updateInvestmentPlan,
} from '../models/InvestmentPlan';
import { badRequest, notFound } from '../utils/errors';

const STATUSES: InvestmentStatus[] = ['draft', 'submitted', 'validated'];
const TARGET_YEARS: TargetYear[] = ['year1', 'year2'];

const toObjectId = (value?: unknown): ObjectId | undefined => {
  if (!value) return undefined;
  if (value instanceof ObjectId) return value;
  if (typeof value === 'string') return new ObjectId(value);
  return value as ObjectId;
};

const parseTargetYear = (value: unknown, label: string): TargetYear => {
  if (value === 1 || value === '1' || value === 'year1') return 'year1';
  if (value === 2 || value === '2' || value === 'year2') return 'year2';
  if (TARGET_YEARS.includes(value as TargetYear)) return value as TargetYear;
  throw badRequest(`${label} must be year1 or year2.`);
};

const parseStatus = (value: unknown, label: string): InvestmentStatus => {
  if (STATUSES.includes(value as InvestmentStatus)) {
    return value as InvestmentStatus;
  }
  throw badRequest(`${label} must be draft, submitted, or validated.`);
};

const parseRequiredString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw badRequest(`${label} is required.`);
  }
  return value.trim();
};

const parseRequiredNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw badRequest(`${label} must be a number.`);
  }
  if (value < 0) {
    throw badRequest(`${label} must be positive.`);
  }
  return value;
};

const normalizeLine = (
  line: InvestmentLine,
  defaults: {
    structure?: ObjectId | Record<string, unknown>;
    targetYear?: TargetYear;
    status?: InvestmentStatus;
    createdBy?: ObjectId | Record<string, unknown>;
  },
  now: Date,
): InvestmentLine => {
  const structure = line.structure ?? defaults.structure;
  const targetYear = line.targetYear ?? defaults.targetYear;
  const status = line.status ?? defaults.status ?? 'draft';
  const createdBy = line.createdBy ?? defaults.createdBy;

  if (!structure) {
    throw badRequest('structure is required for investment lines.');
  }
  if (!targetYear) {
    throw badRequest('targetYear is required for investment lines.');
  }
  if (!createdBy) {
    throw badRequest('createdBy is required for investment lines.');
  }

  const normalizedTargetYear = parseTargetYear(targetYear, 'targetYear');
  const normalizedStatus = parseStatus(status, 'status');
  const category = parseRequiredString(line.category, 'category');
  const quantity = parseRequiredNumber(line.quantity, 'quantity');
  const unitCost = parseRequiredNumber(line.unitCost, 'unitCost');
  const priority = parseRequiredNumber(line.priority, 'priority');

  const totalCost = quantity * unitCost;

  return {
    ...line,
    _id: line._id ? toObjectId(line._id) : new ObjectId(),
    structure,
    targetYear: normalizedTargetYear,
    status: normalizedStatus,
    createdBy,
    category,
    quantity,
    unitCost,
    totalCost,
    priority,
    justification:
      typeof line.justification === 'string'
        ? line.justification.trim()
        : line.justification,
    createdAt: line.createdAt ? new Date(line.createdAt) : now,
    updatedAt: now,
  };
};

const normalizePlan = (data: InvestmentPlan, now: Date): InvestmentPlan => {
  if (!data.structure) {
    throw badRequest('structure is required for investment plans.');
  }
  if (!data.targetYear) {
    throw badRequest('targetYear is required for investment plans.');
  }
  if (!data.createdBy) {
    throw badRequest('createdBy is required for investment plans.');
  }

  const targetYear = parseTargetYear(data.targetYear, 'targetYear');
  const status = parseStatus(data.status ?? 'draft', 'status');
  const lines = (data.lines ?? []).map((line) =>
    normalizeLine(
      line,
      {
        structure: data.structure,
        targetYear,
        status,
        createdBy: data.createdBy,
      },
      now,
    ),
  );
  const totalCost = lines.reduce(
    (total, line) => total + (line.totalCost ?? 0),
    0,
  );

  return {
    ...data,
    structure: toObjectId(data.structure),
    createdBy: toObjectId(data.createdBy),
    targetYear,
    status,
    lines,
    totalCost,
    createdAt: data.createdAt ? new Date(data.createdAt) : now,
    updatedAt: now,
  };
};

export async function listInvestmentPlans(
  db: Db,
  filter: Record<string, unknown> = {},
): Promise<InvestmentPlan[]> {
  return findInvestmentPlans(db, filter);
}

export async function getInvestmentPlanById(
  db: Db,
  id: string,
): Promise<InvestmentPlan> {
  const plan = await findInvestmentPlanById(db, id);
  if (!plan) {
    throw notFound('Investment plan not found.');
  }
  return plan;
}

export async function createInvestmentPlanEntry(
  db: Db,
  data: InvestmentPlan,
): Promise<InvestmentPlan> {
  const now = new Date();
  const normalized = normalizePlan(data, now);
  return createInvestmentPlan(db, normalized);
}

export async function updateInvestmentPlanEntry(
  db: Db,
  id: string,
  data: InvestmentPlan,
): Promise<InvestmentPlan> {
  const existing = await findInvestmentPlanById(db, id);
  if (!existing) {
    throw notFound('Investment plan not found.');
  }
  const now = new Date();
  const merged: InvestmentPlan = {
    ...existing,
    ...data,
    lines: data.lines ?? existing.lines,
  };
  const normalized = normalizePlan(
    {
      ...merged,
      createdAt: existing.createdAt ?? merged.createdAt,
    },
    now,
  );
  const updated = await updateInvestmentPlan(db, id, normalized);
  if (!updated) {
    throw notFound('Investment plan not found.');
  }
  return updated;
}

export async function deleteInvestmentPlanEntry(
  db: Db,
  id: string,
): Promise<void> {
  const deleted = await deleteInvestmentPlan(db, id);
  if (!deleted) {
    throw notFound('Investment plan not found.');
  }
}

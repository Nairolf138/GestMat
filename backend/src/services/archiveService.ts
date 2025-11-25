import { Db, ObjectId } from 'mongodb';
import logger from '../utils/logger';
import {
  LOAN_ARCHIVE_BATCH_SIZE,
  LOAN_ARCHIVE_INTERVAL_DAYS,
  LOAN_ARCHIVE_MIN_AGE_DAYS,
} from '../config';
import { LoanRequest } from '../models/LoanRequest';

const DAYS_IN_MS = 24 * 60 * 60 * 1000;

export interface ArchiveOptions {
  minAgeDays?: number;
  batchSize?: number;
  now?: Date;
}

export interface ArchiveResult {
  archivedCount: number;
  considered: number;
}

export async function archiveOldLoans(
  db: Db,
  { minAgeDays = LOAN_ARCHIVE_MIN_AGE_DAYS, batchSize = LOAN_ARCHIVE_BATCH_SIZE, now = new Date() }: ArchiveOptions = {},
): Promise<ArchiveResult> {
  const threshold = new Date(now.getTime() - minAgeDays * DAYS_IN_MS);
  const session = (db as any).client.startSession();
  try {
    session.startTransaction();
    const collection = db.collection<LoanRequest>('loanrequests');
    const archiveCollection = db.collection<LoanRequest>('loanrequests_archive');

    const candidates = await collection
      .find({ endDate: { $lte: threshold }, archived: { $ne: true } }, { session })
      .limit(batchSize)
      .toArray();

    if (!candidates.length) {
      await session.abortTransaction();
      return { archivedCount: 0, considered: 0 };
    }

    const archivedDocs = candidates.map((loan) => ({
      ...loan,
      archived: true,
      archivedAt: now,
      originalId: loan._id,
    }));

    await archiveCollection.insertMany(archivedDocs, { session });

    const ids = candidates
      .map((loan) => loan._id)
      .filter(Boolean) as ObjectId[];

    if (ids.length) {
      await collection.deleteMany({ _id: { $in: ids } }, { session });
    }

    await session.commitTransaction();
    logger.info(
      'Archived %d loan requests older than %s',
      archivedDocs.length,
      threshold.toISOString(),
    );
    return { archivedCount: archivedDocs.length, considered: candidates.length };
  } catch (err) {
    await session.abortTransaction();
    logger.error('Loan archiving failed: %o', err as Error);
    throw err;
  } finally {
    await session.endSession();
  }
}

export function scheduleLoanArchiving(db: Db, intervalDays: number = LOAN_ARCHIVE_INTERVAL_DAYS): NodeJS.Timeout {
  const intervalMs = Math.max(1, intervalDays) * DAYS_IN_MS;

  const run = () => {
    archiveOldLoans(db).catch((err) => {
      logger.error('Loan archiving job error: %o', err);
    });
  };

  run();
  return setInterval(run, intervalMs);
}

import { Db, ObjectId } from 'mongodb';
import { LoanRequest } from '../models/LoanRequest';
import { getLoanRecipients } from '../utils/getLoanRecipients';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import {
  LOAN_REMINDER_INTERVAL_MINUTES,
  LOAN_REMINDER_OFFSET_HOURS,
} from '../config';
import { loanReminderTemplate } from '../utils/mailTemplates';

const HOURS_IN_MS = 60 * 60 * 1000;
const MINUTES_IN_MS = 60 * 1000;

const defaultReminderOffsetMs = LOAN_REMINDER_OFFSET_HOURS * HOURS_IN_MS;
const defaultIntervalMs = LOAN_REMINDER_INTERVAL_MINUTES * MINUTES_IN_MS;

function toObjectId(value: unknown): string | null {
  const str = (value as any)?._id?.toString?.() || (value as any)?.toString?.();
  if (!str) return null;
  try {
    return new ObjectId(str).toString();
  } catch {
    return null;
  }
}

async function sendReminderMail(
  db: Db,
  loan: LoanRequest,
  recipients: string[],
  reminderField: 'reminderSentAt' | 'startReminderSentAt',
): Promise<void> {
  if (!recipients.length) {
    logger.warn(
      'Loan reminder not sent: no recipient email found for loan %s',
      loan._id,
    );
    return;
  }

  const to = recipients.join(',');

  const { subject, text, html } = loanReminderTemplate({ loan });

  await sendMail({
    to,
    subject,
    text,
    html,
  });

  await db
    .collection<LoanRequest>('loanrequests')
    .updateOne({ _id: loan._id }, { $set: { [reminderField]: new Date() } });
}

export async function processLoanReminders(
  db: Db,
  reminderOffsetMs: number = defaultReminderOffsetMs,
): Promise<void> {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + reminderOffsetMs);

  const [endLoans, startLoans] = await Promise.all([
    db
      .collection<LoanRequest>('loanrequests')
      .find({
        status: 'accepted',
        endDate: { $gte: now, $lte: reminderThreshold },
        reminderSentAt: { $exists: false },
      })
      .toArray(),
    db
      .collection<LoanRequest>('loanrequests')
      .find({
        status: 'accepted',
        startDate: { $gte: now, $lte: reminderThreshold },
        startReminderSentAt: { $exists: false },
      })
      .toArray(),
  ]);

  const reminderJobs: { loan: LoanRequest; field: 'reminderSentAt' | 'startReminderSentAt' }[] = [
    ...endLoans.map((loan) => ({ loan, field: 'reminderSentAt' as const })),
    ...startLoans.map((loan) => ({ loan, field: 'startReminderSentAt' as const })),
  ];

  for (const { loan, field } of reminderJobs) {
    try {
      const ownerId = toObjectId(loan.owner);
      const borrowerId = toObjectId(loan.borrower);
      const requestedById = toObjectId(loan.requestedBy);
      const items = (loan.items || []) as any;
      const recipients = await getLoanRecipients(db, items, {
        ownerId,
        borrowerId,
        borrower: loan.borrower,
        requestedById,
        requestedBy: loan.requestedBy,
      });
      await sendReminderMail(db, loan, recipients, field);
    } catch (err) {
      logger.error('Loan reminder error for loan %s: %o', loan._id, err);
    }
  }
}

export function scheduleLoanReminders(
  db: Db,
  intervalMs: number = defaultIntervalMs,
  reminderOffsetMs: number = defaultReminderOffsetMs,
): NodeJS.Timeout {
  const run = () => {
    processLoanReminders(db, reminderOffsetMs).catch((err) => {
      logger.error('Loan reminder processing error: %o', err);
    });
  };

  run();
  return setInterval(run, intervalMs);
}

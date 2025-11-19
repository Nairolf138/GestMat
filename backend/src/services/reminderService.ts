import { Db, ObjectId } from 'mongodb';
import { LoanRequest } from '../models/LoanRequest';
import { getLoanRecipients } from '../utils/getLoanRecipients';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import {
  LOAN_REMINDER_INTERVAL_MINUTES,
  LOAN_REMINDER_OFFSET_HOURS,
} from '../config';

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
): Promise<void> {
  if (!recipients.length) {
    logger.warn(
      'Loan reminder not sent: no recipient email found for loan %s',
      loan._id,
    );
    return;
  }

  const endDate = loan.endDate ? new Date(loan.endDate) : null;
  const to = recipients.join(',');

  await sendMail({
    to,
    subject: 'Rappel de fin de prêt',
    text: endDate
      ? `Le prêt ${loan._id} arrive à échéance le ${endDate.toLocaleString('fr-FR')}.`
      : `Le prêt ${loan._id} approche de son échéance.`,
  });

  await db
    .collection<LoanRequest>('loanrequests')
    .updateOne({ _id: loan._id }, { $set: { reminderSentAt: new Date() } });
}

export async function processLoanReminders(
  db: Db,
  reminderOffsetMs: number = defaultReminderOffsetMs,
): Promise<void> {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + reminderOffsetMs);

  const loans = await db
    .collection<LoanRequest>('loanrequests')
    .find({
      status: 'accepted',
      endDate: { $gte: now, $lte: reminderThreshold },
      reminderSentAt: { $exists: false },
    })
    .toArray();

  for (const loan of loans) {
    try {
      const ownerId = toObjectId(loan.owner);
      const items = (loan.items || []) as any;
      const recipients = ownerId ? await getLoanRecipients(db, ownerId, items) : [];
      await sendReminderMail(db, loan, recipients);
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

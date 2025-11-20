import { Db, ObjectId } from 'mongodb';
import { LoanRequest } from '../models/LoanRequest';
import { getLoanRecipients } from '../utils/getLoanRecipients';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import { LOAN_OVERDUE_CHECK_INTERVAL_MINUTES, NOTIFY_EMAIL } from '../config';
import { loanOverdueTemplate } from '../utils/mailTemplates';

const MINUTES_IN_MS = 60 * 1000;
const defaultIntervalMs = LOAN_OVERDUE_CHECK_INTERVAL_MINUTES * MINUTES_IN_MS;
const closedStatuses = ['refused', 'cancelled'];

function toObjectIdString(value: unknown): string | null {
  const str = (value as any)?._id?.toString?.() || (value as any)?.toString?.();
  if (!str) return null;
  try {
    return new ObjectId(str).toString();
  } catch {
    return null;
  }
}

async function resolveBorrowerEmail(
  db: Db,
  borrower: LoanRequest['borrower'],
): Promise<string | null> {
  const inlineEmail = (borrower as any)?.email;
  if (typeof inlineEmail === 'string' && inlineEmail.trim()) {
    return inlineEmail;
  }

  const borrowerId = toObjectIdString(borrower);
  if (!borrowerId) {
    return null;
  }

  const borrowerStructure = await db
    .collection<{ email?: string }>('structures')
    .findOne({ _id: new ObjectId(borrowerId) });

  const structureEmail = borrowerStructure?.email;
  return typeof structureEmail === 'string' && structureEmail.trim()
    ? structureEmail
    : null;
}

async function sendOverdueNotification(
  db: Db,
  loan: LoanRequest,
  recipients: string[],
): Promise<void> {
  if (!recipients.length) {
    logger.warn(
      'Overdue loan notification not sent: no recipient email found for loan %s',
      loan._id,
    );
    return;
  }

  const to = recipients.join(',');

  const { subject, text, html } = loanOverdueTemplate({ loan });

  await sendMail({
    to,
    subject,
    text,
    html,
  });

  await db
    .collection<LoanRequest>('loanrequests')
    .updateOne({ _id: loan._id }, { $set: { overdueNotifiedAt: new Date() } });
}

export async function processOverdueLoans(db: Db): Promise<void> {
  const now = new Date();

  const overdueLoans = await db
    .collection<LoanRequest>('loanrequests')
    .find({
      endDate: { $lt: now },
      status: { $nin: closedStatuses },
      overdueNotifiedAt: { $exists: false },
    })
    .toArray();

  for (const loan of overdueLoans) {
    try {
      const items = (loan.items || []) as any[];
      const ownerId = toObjectIdString(loan.owner);
      const ownerRecipients = ownerId
        ? await getLoanRecipients(db, ownerId, items)
        : [];

      const borrowerEmail = await resolveBorrowerEmail(db, loan.borrower);

      const recipients = new Set<string>(ownerRecipients);

      if (borrowerEmail) {
        recipients.add(borrowerEmail);
      }

      if (NOTIFY_EMAIL) {
        recipients.add(NOTIFY_EMAIL);
      }

      await sendOverdueNotification(db, loan, Array.from(recipients));
    } catch (err) {
      logger.error('Overdue loan notification error for loan %s: %o', loan._id, err);
    }
  }
}

export function scheduleOverdueLoanNotifications(
  db: Db,
  intervalMs: number = defaultIntervalMs,
): NodeJS.Timeout {
  const run = () => {
    processOverdueLoans(db).catch((err) => {
      logger.error('Overdue loan processing error: %o', err);
    });
  };

  run();
  return setInterval(run, intervalMs);
}

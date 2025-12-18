import { Db, ObjectId } from 'mongodb';
import { LoanRequest } from '../models/LoanRequest';
import { getLoanRecipientsByRole } from '../utils/getLoanRecipients';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import {
  LOAN_OVERDUE_CHECK_INTERVAL_MINUTES,
  LOAN_OVERDUE_NOTIFICATIONS_ENABLED,
  NOTIFY_EMAIL,
} from '../config';
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

export async function processOverdueLoans(db: Db): Promise<void> {
  if (!LOAN_OVERDUE_NOTIFICATIONS_ENABLED) {
    logger.info('Overdue loan notifications are disabled; skipping processing run.');
    return;
  }

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
      const borrowerId = toObjectIdString(loan.borrower);
      const requestedById = toObjectIdString(loan.requestedBy);
      const { ownerRecipients, borrowerRecipients, requesterRecipients } =
        await getLoanRecipientsByRole(db, items, {
          ownerId,
          borrowerId,
          borrower: loan.borrower,
          requestedById,
          requestedBy: loan.requestedBy,
        }, 'loanStatusChanges', { requireSystemAlerts: true });

      const requesterSet = new Set(requesterRecipients);
      const borrowerSet = new Set(
        borrowerRecipients.filter((email) => !requesterSet.has(email)),
      );
      const ownerSet = new Set(
        ownerRecipients.filter(
          (email) => !requesterSet.has(email) && !borrowerSet.has(email),
        ),
      );

      if (NOTIFY_EMAIL) {
        ownerSet.add(NOTIFY_EMAIL);
      }

      if (!ownerSet.size && !borrowerSet.size && !requesterSet.size) {
        logger.warn(
          'Overdue loan notification not sent: no recipient email found for loan %s',
          loan._id,
        );
        continue;
      }

      const sendOverdueMail = async (
        recipients: Set<string>,
        role: 'owner' | 'borrower' | 'requester',
      ) => {
        if (!recipients.size) return;
        const to = Array.from(recipients).join(',');
        const { subject, text, html } = loanOverdueTemplate({ loan, role });
        await sendMail({ to, subject, text, html });
      };

      await Promise.all([
        sendOverdueMail(ownerSet, 'owner'),
        sendOverdueMail(borrowerSet, 'borrower'),
        sendOverdueMail(requesterSet, 'requester'),
      ]);

      await db
        .collection<LoanRequest>('loanrequests')
        .updateOne({ _id: loan._id }, { $set: { overdueNotifiedAt: new Date() } });
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

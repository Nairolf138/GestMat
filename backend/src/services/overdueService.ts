import { Db } from 'mongodb';
import { LoanRequest } from '../models/LoanRequest';
import { deliverLoanNotification } from '../utils/getLoanRecipients';
import { lineStatus } from '../utils/loanLines';
import logger from '../utils/logger';
import {
  LOAN_OVERDUE_CHECK_INTERVAL_MINUTES,
  LOAN_OVERDUE_NOTIFICATIONS_ENABLED,
  PUBLIC_APP_URL,
} from '../config';
import { loanOverdueTemplate } from '../utils/mailTemplates';

const MINUTES_IN_MS = 60 * 1000;
const defaultIntervalMs = LOAN_OVERDUE_CHECK_INTERVAL_MINUTES * MINUTES_IN_MS;
const closedStatuses = ['refused', 'cancelled'];

export async function processOverdueLoans(db: Db): Promise<void> {
  if (!LOAN_OVERDUE_NOTIFICATIONS_ENABLED) {
    logger.info(
      'Overdue loan notifications are disabled; skipping processing run.',
    );
    return;
  }

  const now = new Date();

  const overdueLoans = await db
    .collection<LoanRequest>('loanrequests')
    .find({
      archived: { $ne: true },
      endDate: { $lt: now },
      status: { $nin: closedStatuses },
      overdueNotifiedAt: { $exists: false },
    })
    .toArray();

  for (const loan of overdueLoans) {
    try {
      const items = (loan.items || []).filter(
        (item) => lineStatus(item, loan) === 'accepted',
      );
      if (!items.length) continue;
      await deliverLoanNotification(
        db,
        { ...loan, items },
        ({ loan: scopedLoan, role }) =>
          loanOverdueTemplate({
            loan: scopedLoan,
            role,
            appUrl: PUBLIC_APP_URL,
          }),
        {
          equipment: 'returnReminders',
          vehicle: 'vehicleBookingReminders',
        },
        {
          requireSystemAlerts: true,
          eventKey: `loan:${loan._id}:overdue:${new Date(loan.endDate as Date).toISOString()}`,
          validity: {
            kind: 'loan-overdue',
            resourceId: String(loan._id),
            date: new Date(loan.endDate as Date).toISOString(),
            lineIds: items.map((item) => String(item.lineId)),
          },
        },
      );

      await db
        .collection<LoanRequest>('loanrequests')
        .updateOne(
          { _id: loan._id },
          { $set: { overdueNotifiedAt: new Date() } },
        );
    } catch (err) {
      logger.error(
        'Overdue loan notification error for loan %s: %o',
        loan._id,
        err,
      );
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

import { Db, ObjectId } from 'mongodb';
import { LoanRequest, populateLoanRequest } from '../models/LoanRequest';
import { deliverLoanNotification } from '../utils/getLoanRecipients';
import { lineStatus } from '../utils/loanLines';
import { sendMail } from '../utils/sendMail';
import logger from '../utils/logger';
import {
  LOAN_REMINDER_INTERVAL_MINUTES,
  LOAN_REMINDER_OFFSET_HOURS,
  LOAN_REMINDER_DAILY_SCHEDULE_ENABLED,
  LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED,
} from '../config';
import { loanStartReminderTemplate } from '../utils/mailTemplates';

const HOURS_IN_MS = 60 * 60 * 1000;
const MINUTES_IN_MS = 60 * 1000;

const defaultReminderOffsetMs = LOAN_REMINDER_OFFSET_HOURS * HOURS_IN_MS;
const defaultIntervalMs = LOAN_REMINDER_INTERVAL_MINUTES * MINUTES_IN_MS;
const DAILY_REMINDER_HOUR = 9;

type ReminderSchedule = {
  cancel: () => void;
};

function getNextReminderDate(targetHour: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function toObjectId(value: unknown): string | null {
  const str = (value as any)?._id?.toString?.() || (value as any)?.toString?.();
  if (!str) return null;
  try {
    return new ObjectId(str).toString();
  } catch {
    return null;
  }
}

async function sendLoanReminder(
  db: Db,
  loan: LoanRequest,
  field: 'reminderSentAt' | 'startReminderSentAt',
  templateFactory: (context: {
    loan: LoanRequest;
    role: 'owner' | 'borrower' | 'requester';
  }) => {
    subject: string;
    text: string;
    html: string;
  },
): Promise<void> {
  try {
    const activeItems = (loan.items || []).filter(
      (item) => lineStatus(item, loan) === 'accepted',
    );
    if (!activeItems.length) return;
    await deliverLoanNotification(
      db,
      { ...loan, items: activeItems },
      templateFactory,
      'returnReminders',
      { requireSystemAlerts: true },
    );

    await db
      .collection<LoanRequest>('loanrequests')
      .updateOne({ _id: loan._id }, { $set: { [field]: new Date() } });
  } catch (err) {
    logger.error('Loan reminder error for loan %s: %o', loan._id, err);
  }
}

export async function processStartLoanReminders(
  db: Db,
  reminderOffsetMs: number = defaultReminderOffsetMs,
): Promise<void> {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + reminderOffsetMs);

  const startLoans = await db
    .collection<LoanRequest>('loanrequests')
    .find({
      status: { $in: ['accepted', 'partial'] },
      startDate: { $gte: now, $lte: reminderThreshold },
      startReminderSentAt: { $exists: false },
    })
    .toArray();

  for (const loan of startLoans) {
    await sendLoanReminder(
      db,
      loan,
      'startReminderSentAt',
      loanStartReminderTemplate,
    );
  }
}

export function scheduleLoanReminders(
  db: Db,
  reminderOffsetMs: number = defaultReminderOffsetMs,
  options: {
    enableDailySchedule?: boolean;
    enableFallbackInterval?: boolean;
    fallbackIntervalMs?: number;
    dailyReminderHour?: number;
  } = {},
): ReminderSchedule {
  const {
    enableDailySchedule = LOAN_REMINDER_DAILY_SCHEDULE_ENABLED,
    enableFallbackInterval = LOAN_REMINDER_FALLBACK_INTERVAL_ENABLED,
    fallbackIntervalMs = defaultIntervalMs,
    dailyReminderHour = DAILY_REMINDER_HOUR,
  } = options;

  const run = () => {
    processStartLoanReminders(db, reminderOffsetMs).catch((err) => {
      logger.error('Loan start reminder processing error: %o', err);
    });
  };

  let dailyTimeout: NodeJS.Timeout | null = null;
  let fallbackInterval: NodeJS.Timeout | null = null;

  const scheduleNextDailyRun = () => {
    const nextRun = getNextReminderDate(dailyReminderHour);
    const delay = Math.max(nextRun.getTime() - Date.now(), 0);
    dailyTimeout = setTimeout(() => {
      run();
      scheduleNextDailyRun();
    }, delay);
  };

  run();

  if (enableDailySchedule) {
    scheduleNextDailyRun();
  }

  if (enableFallbackInterval && fallbackIntervalMs > 0) {
    fallbackInterval = setInterval(run, fallbackIntervalMs);
  }

  return {
    cancel: () => {
      if (dailyTimeout) {
        clearTimeout(dailyTimeout);
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    },
  };
}

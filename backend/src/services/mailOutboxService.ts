import { Db, ObjectId } from 'mongodb';
import { NODE_ENV, SMTP_URL } from '../config';
import logger from '../utils/logger';
import { sendMail } from '../utils/sendMail';
import { vehicleManagerIds } from '../utils/vehicleAccess';
import { isNotificationEnabled } from '../utils/notificationPreferences';
import {
  canAccessEquipmentLine,
  idOf,
  lineStatus,
  loanLines,
} from '../utils/loanLines';
import { populateLoanRequest } from '../models/LoanRequest';
import type { NotificationPreference } from '../utils/notificationPreferences';
import { getStructureEmails } from '../utils/getStructureEmails';

export interface QueuedMail {
  to?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  reportAttachment?: { reportId: string; filename: string };
}

export interface LoanRecipientValidity {
  email: string;
  userIds: string[];
  lineIds: string[];
  preferences: {
    equipment: NotificationPreference;
    vehicle: NotificationPreference;
  };
  requireSystemAlerts?: boolean;
}

export type MailValidity =
  | {
      kind: 'account-update';
      resourceId: string;
      email: string;
    }
  | {
      kind: 'annual-report';
      resourceId: string;
      email: string;
    }
  | {
      kind: 'loan-event';
      resourceId: string;
      revision: number;
      recipient?: LoanRecipientValidity;
    }
  | {
      kind: 'loan-start';
      resourceId: string;
      date: string;
      lineIds?: string[];
      recipient?: LoanRecipientValidity;
    }
  | {
      kind: 'loan-overdue';
      resourceId: string;
      date: string;
      lineIds?: string[];
      recipient?: LoanRecipientValidity;
    }
  | {
      kind: 'vehicle-compliance';
      resourceId: string;
      date: string;
      document: 'insurance' | 'technicalInspection';
    };

interface OutboxEntry {
  _id: string;
  message: QueuedMail;
  status: 'pending' | 'sending' | 'sent' | 'expired';
  attempts: number;
  createdAt: Date;
  nextAttemptAt: Date;
  leaseUntil?: Date;
  expiresAt?: Date;
  validity?: MailValidity;
  completedAt?: Date;
  lastError?: string;
}

const COLLECTION = 'mailOutbox';
const LEASE_MS = 10 * 60 * 1000;
const RETRY_BASE_MS = 60 * 1000;
const RETRY_MAX_MS = 6 * 60 * 60 * 1000;
const INTERVAL_MS = 60 * 1000;

export async function ensureMailOutboxIndexes(db: Db): Promise<void> {
  const collection = db.collection<OutboxEntry>(COLLECTION);
  await collection.createIndex({ status: 1, nextAttemptAt: 1, createdAt: 1 });
  await collection.createIndex(
    { completedAt: 1 },
    { expireAfterSeconds: 30 * 24 * 60 * 60 },
  );
}

export async function queueMail(
  db: Db,
  key: string,
  message: QueuedMail,
  expiresAt?: Date,
  validity?: MailValidity,
): Promise<void> {
  const now = new Date();
  await db.collection<OutboxEntry>(COLLECTION).updateOne(
    { _id: key },
    {
      $setOnInsert: {
        message,
        status: 'pending',
        attempts: 0,
        createdAt: now,
        nextAttemptAt: now,
        ...(expiresAt ? { expiresAt } : {}),
        ...(validity ? { validity } : {}),
      },
    },
    { upsert: true },
  );
}

async function isStillRelevant(db: Db, entry: OutboxEntry, now: Date) {
  const validity = entry.validity;
  if (!validity) return true;
  if (!ObjectId.isValid(validity.resourceId)) return false;
  const _id = new ObjectId(validity.resourceId);
  if (validity.kind === 'account-update') {
    const user = await db.collection('users').findOne({ _id });
    return (
      Boolean(user) &&
      String(user?.email || '')
        .trim()
        .toLowerCase() === validity.email &&
      isNotificationEnabled(user as any, 'accountUpdates')
    );
  }
  if (validity.kind === 'annual-report') {
    const report = await db.collection('reports').findOne({ _id });
    if (!report || report.emailSuppressed || !report.structureId) return false;
    const structure = await db
      .collection('structures')
      .findOne({ _id: report.structureId });
    if (
      String(structure?.email || '')
        .trim()
        .toLowerCase() === validity.email
    )
      return true;
    const members = await getStructureEmails(db, String(report.structureId), {
      requireSystemAlerts: true,
      preference: 'annualReports',
    });
    return members.some(
      (email) => email.trim().toLowerCase() === validity.email,
    );
  }
  if (validity.kind !== 'vehicle-compliance') {
    const date =
      validity.kind === 'loan-event' ? undefined : new Date(validity.date);
    const loan = await db.collection('loanrequests').findOne({
      _id,
      ...(validity.kind === 'loan-event'
        ? {}
        : {
            archived: { $ne: true },
            [validity.kind === 'loan-start' ? 'startDate' : 'endDate']: date,
            status: { $in: ['accepted', 'partial'] },
          }),
    });
    if (!loan) return false;
    if (
      validity.kind === 'loan-event' &&
      Number(loan.revision || 0) !== validity.revision
    )
      return false;
    if (validity.kind === 'loan-overdue' && date && date >= now) return false;
    if (
      'lineIds' in validity &&
      !(validity.lineIds || []).every((lineId) =>
        (loan.items || []).some(
          (item: any) =>
            String(item.lineId) === lineId &&
            lineStatus(item, loan) === 'accepted',
        ),
      )
    )
      return false;
    if (!validity.recipient) return true;
    const recipient = validity.recipient;
    const populated = await populateLoanRequest(db, loan);
    const lines = loanLines(populated).filter((item) =>
      recipient.lineIds.includes(String(item.lineId)),
    );
    if (lines.length !== recipient.lineIds.length) return false;
    const userIds = recipient.userIds
      .filter((id) => ObjectId.isValid(id))
      .map((id) => new ObjectId(id));
    const users = await db
      .collection('users')
      .find({
        _id: { $in: userIds },
      })
      .toArray();
    const managers = new Map<string, string[]>();
    for (const item of lines)
      if (item.kind === 'vehicle')
        managers.set(
          idOf(item.vehicle),
          await vehicleManagerIds(db, item.vehicle),
        );
    return lines.every((item) =>
      users.some(
        (user) =>
          String(user.email || '')
            .trim()
            .toLowerCase() === recipient.email &&
          (!recipient.requireSystemAlerts ||
            isNotificationEnabled(user as any, 'systemAlerts')) &&
          isNotificationEnabled(
            user as any,
            item.kind === 'vehicle'
              ? recipient.preferences.vehicle
              : recipient.preferences.equipment,
          ) &&
          (item.kind === 'vehicle'
            ? idOf(user) === idOf(loan.requestedBy) ||
              (managers.get(idOf(item.vehicle)) || []).includes(idOf(user))
            : canAccessEquipmentLine(user, item, populated)),
      ),
    );
  }
  const date = new Date(validity.date);
  const vehicle = await db.collection('vehicles').findOne({
    _id,
    [`${validity.document}.expiryDate`]: date,
  });
  if (!vehicle || !entry.message.to) return false;
  const managerIds = (await vehicleManagerIds(db, vehicle))
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));
  const managers = await db
    .collection('users')
    .find({
      _id: { $in: managerIds },
    })
    .toArray();
  return managers.some(
    (user) =>
      String(user.email || '')
        .trim()
        .toLowerCase() === entry.message.to &&
      isNotificationEnabled(user as any, 'vehicleReminders') &&
      isNotificationEnabled(user as any, 'systemAlerts'),
  );
}

export async function processMailOutbox(db: Db, limit = 50): Promise<number> {
  // The development transport only logs messages. Keep them pending for a
  // configured SMTP transport rather than reporting a false delivery.
  if (!SMTP_URL && NODE_ENV !== 'test') return 0;

  const collection = db.collection<OutboxEntry>(COLLECTION);
  let processed = 0;
  while (processed < limit) {
    const now = new Date();
    const claim = await collection.findOneAndUpdate(
      {
        $or: [
          { status: 'pending', nextAttemptAt: { $lte: now } },
          { status: 'sending', leaseUntil: { $lte: now } },
        ],
      },
      {
        $set: {
          status: 'sending',
          leaseUntil: new Date(now.getTime() + LEASE_MS),
        },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, returnDocument: 'after' },
    );
    const entry = claim.value;
    if (!entry) break;
    processed += 1;

    if (
      (entry.expiresAt && entry.expiresAt <= now) ||
      !(await isStillRelevant(db, entry, now))
    ) {
      await collection.updateOne(
        { _id: entry._id, status: 'sending' },
        {
          $set: { status: 'expired', completedAt: now },
          $unset: { leaseUntil: '' },
        },
      );
      continue;
    }

    try {
      const { reportAttachment, ...message } = entry.message;
      if (reportAttachment) {
        const report = await db.collection('reports').findOne({
          _id: new ObjectId(reportAttachment.reportId),
        });
        if (!report?.pdf) throw new Error('Report attachment is unavailable');
        await sendMail({
          ...message,
          attachments: [
            { filename: reportAttachment.filename, content: report.pdf },
          ],
        });
      } else {
        await sendMail(message);
      }
      await collection.updateOne(
        { _id: entry._id, status: 'sending' },
        {
          $set: { status: 'sent', completedAt: new Date() },
          $unset: { leaseUntil: '', lastError: '' },
        },
      );
      if (reportAttachment && message.to) {
        const reportId = new ObjectId(reportAttachment.reportId);
        await db
          .collection('reports')
          .updateOne(
            { _id: reportId },
            { $addToSet: { deliveredRecipients: message.to.toLowerCase() } },
          );
        const report = await db
          .collection('reports')
          .findOne({ _id: reportId });
        const delivered = new Set(
          (report?.deliveredRecipients || []).map((email: string) =>
            email.toLowerCase(),
          ),
        );
        if (
          report?.recipients?.length &&
          report.recipients.every((email: string) =>
            delivered.has(email.toLowerCase()),
          )
        )
          await db
            .collection('reports')
            .updateOne(
              { _id: reportId, sentAt: { $exists: false } },
              { $set: { sentAt: new Date() } },
            );
      }
    } catch (error) {
      const delay = Math.min(
        RETRY_BASE_MS * 2 ** Math.min(entry.attempts - 1, 10),
        RETRY_MAX_MS,
      );
      await collection.updateOne(
        { _id: entry._id, status: 'sending' },
        {
          $set: {
            status: 'pending',
            nextAttemptAt: new Date(Date.now() + delay),
            lastError: error instanceof Error ? error.message : String(error),
          },
          $unset: { leaseUntil: '' },
        },
      );
      logger.error('Mail delivery deferred for %s: %o', entry._id, error);
    }
  }
  return processed;
}

export function scheduleMailOutbox(db: Db): NodeJS.Timeout {
  if (!SMTP_URL)
    logger.warn('SMTP_URL is not configured; queued mail will remain pending');
  const run = () => {
    processMailOutbox(db).catch((error) => {
      logger.error('Mail outbox processing failed: %o', error);
    });
  };
  run();
  return setInterval(run, INTERVAL_MS);
}

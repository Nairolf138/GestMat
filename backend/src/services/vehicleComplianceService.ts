import { Db, ObjectId } from 'mongodb';
import {
  VEHICLE_COMPLIANCE_REMINDER_INTERVAL_MINUTES,
  VEHICLE_COMPLIANCE_REMINDER_OFFSET_DAYS,
  VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED,
} from '../config';
import type { Vehicle } from '../models/Vehicle';
import { getStructureEmails } from '../utils/getStructureEmails';
import logger from '../utils/logger';
import { vehicleComplianceReminderTemplate } from '../utils/mailTemplates';
import { sendMail } from '../utils/sendMail';

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

type ComplianceKind = 'insurance' | 'technicalInspection';

type ReminderSchedule = {
  cancel: () => void;
};

function getNextDailyRun(targetHour: number): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(targetHour, 0, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

function needsReminder(
  vehicle: Vehicle,
  kind: ComplianceKind,
  threshold: Date,
): vehicle is Vehicle {
  if (kind === 'insurance') {
    const expiryValue = (vehicle.insurance as any)?.expiryDate as
      | Date
      | string
      | undefined;
    const expiry = expiryValue ? new Date(expiryValue) : undefined;
    const sentAt = (vehicle.complianceReminders as any)?.insuranceReminderSentAt as
      | Date
      | undefined;
    return Boolean(
      expiry &&
        expiry >= new Date() &&
        expiry <= threshold &&
        !sentAt,
    );
  }

  const expiryValue = (vehicle.technicalInspection as any)?.expiryDate as
    | Date
    | string
    | undefined;
  const expiry = expiryValue ? new Date(expiryValue) : undefined;
  const sentAt = (vehicle.complianceReminders as any)?.
    technicalInspectionReminderSentAt as Date | undefined;
  return Boolean(
    expiry &&
      expiry >= new Date() &&
      expiry <= threshold &&
      !sentAt,
  );
}

async function sendComplianceReminder(
  db: Db,
  vehicle: Vehicle,
  kind: ComplianceKind,
  expiryDate: Date,
): Promise<void> {
  const structureId = (vehicle.structure as any)?.toString?.();
  if (!structureId) {
    logger.warn(
      'No structure associated with vehicle %s; skipping %s reminder',
      vehicle._id,
      kind,
    );
    return;
  }

  const recipients = await getStructureEmails(db, structureId, {
    preference: 'vehicleReminders',
  });

  if (!recipients.length) {
    logger.warn(
      'No recipients found for vehicle %s %s reminder',
      vehicle._id,
      kind,
    );
    return;
  }

  const template = vehicleComplianceReminderTemplate({ vehicle, kind, expiryDate });
  await sendMail({ to: recipients.join(','), ...template });

  const reminderField =
    kind === 'insurance'
      ? 'complianceReminders.insuranceReminderSentAt'
      : 'complianceReminders.technicalInspectionReminderSentAt';

  await db.collection<Vehicle>('vehicles').updateOne(
    { _id: new ObjectId(vehicle._id) },
    { $set: { [reminderField]: new Date() } },
  );
}

export async function processVehicleComplianceReminders(
  db: Db,
  reminderOffsetMs = VEHICLE_COMPLIANCE_REMINDER_OFFSET_DAYS * DAY,
): Promise<void> {
  const now = new Date();
  const threshold = new Date(now.getTime() + reminderOffsetMs);

  const vehicles = await db
    .collection<Vehicle>('vehicles')
    .find({
      $or: [
        { 'insurance.expiryDate': { $exists: true } },
        { 'technicalInspection.expiryDate': { $exists: true } },
      ],
    })
    .toArray();

  for (const vehicle of vehicles) {
    if (needsReminder(vehicle, 'insurance', threshold)) {
      await sendComplianceReminder(db, vehicle, 'insurance', vehicle.insurance!.expiryDate!);
    }
    if (needsReminder(vehicle, 'technicalInspection', threshold)) {
      await sendComplianceReminder(
        db,
        vehicle,
        'technicalInspection',
        vehicle.technicalInspection!.expiryDate!,
      );
    }
  }
}

export function scheduleVehicleComplianceReminders(
  db: Db,
  options: { intervalMinutes?: number; reminderOffsetDays?: number; dailyHour?: number } = {},
): ReminderSchedule {
  const {
    intervalMinutes = VEHICLE_COMPLIANCE_REMINDER_INTERVAL_MINUTES,
    reminderOffsetDays = VEHICLE_COMPLIANCE_REMINDER_OFFSET_DAYS,
    dailyHour = 8,
  } = options;

  const intervalMs = Math.max(intervalMinutes, 1) * MINUTE;
  const reminderOffsetMs = Math.max(reminderOffsetDays, 0) * DAY;

  const run = () => {
    processVehicleComplianceReminders(db, reminderOffsetMs).catch((err) => {
      logger.error('Vehicle compliance reminder processing error: %o', err);
    });
  };

  run();

  const interval = setInterval(run, intervalMs);
  let dailyTimeout: NodeJS.Timeout | null = null;

  if (VEHICLE_COMPLIANCE_DAILY_SCHEDULE_ENABLED) {
    const scheduleNextDaily = () => {
      const next = getNextDailyRun(dailyHour);
      const delay = Math.max(next.getTime() - Date.now(), 0);
      dailyTimeout = setTimeout(() => {
        run();
        scheduleNextDaily();
      }, delay);
    };
    scheduleNextDaily();
  }

  return {
    cancel: () => {
      clearInterval(interval);
      if (dailyTimeout) {
        clearTimeout(dailyTimeout);
      }
    },
  };
}

import { Db, Filter, ObjectId, WithId } from 'mongodb';
import { Structure } from './Structure';
import { VEHICLE_USAGE_TYPES } from '../config/permissions';

export const VEHICLE_STATUSES = [
  'available',
  'unavailable',
  'maintenance',
  'retired',
] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export interface VehicleReservation {
  start: Date;
  end: Date;
  status?: VehicleStatus;
  note?: string;
}

export interface VehicleMaintenance {
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  notes?: string;
}

export interface VehicleInsurance {
  provider?: string;
  policyNumber?: string;
  expiryDate?: Date;
}

export interface VehicleTechnicalInspection {
  lastInspectionDate?: Date;
  expiryDate?: Date;
  documentUrl?: string;
  notes?: string;
}

export interface VehicleComplianceDocument {
  title: string;
  type?: 'insurance' | 'technicalInspection' | 'other';
  url?: string;
  uploadedAt?: Date;
  expiresAt?: Date;
  notes?: string;
}

export interface VehicleComplianceReminders {
  insuranceReminderSentAt?: Date;
  technicalInspectionReminderSentAt?: Date;
}

export interface VehicleCharacteristics {
  seats?: number;
  fuelType?: string;
  transmission?: string;
  color?: string;
  [key: string]: unknown;
}

export type NewVehicle = Pick<Vehicle, 'name'> & Partial<Omit<Vehicle, '_id' | 'name'>>;

export interface Vehicle {
  _id?: ObjectId;
  name: string;
  type?: string;
  usage?: (typeof VEHICLE_USAGE_TYPES)[number];
  structure?: ObjectId | Structure | string;
  brand?: string;
  model?: string;
  registrationNumber?: string;
  status?: VehicleStatus;
  location?: string;
  characteristics?: VehicleCharacteristics;
  reservations?: VehicleReservation[];
  maintenance?: VehicleMaintenance;
  insurance?: VehicleInsurance;
  technicalInspection?: VehicleTechnicalInspection;
  complianceDocuments?: VehicleComplianceDocument[];
  complianceReminders?: VehicleComplianceReminders;
  kilometersTraveled?: number;
  downtimeDays?: number;
  notes?: string;
  [key: string]: unknown;
}

function normalizeReservations(
  reservations: VehicleReservation[] = [],
): VehicleReservation[] {
  return reservations.map((entry) => ({
    ...entry,
    start: new Date(entry.start),
    end: new Date(entry.end),
  }));
}

function normalizeVehicleDates<T extends Partial<Vehicle>>(vehicle: T): T {
  const normalized: T = { ...vehicle };
  if (normalized.structure) {
    normalized.structure = new ObjectId(normalized.structure as any);
  }
  if (normalized.usage) {
    normalized.usage = normalized.usage.toString().toLowerCase() as any;
  }
  if (normalized.reservations) {
    normalized.reservations = normalizeReservations(normalized.reservations);
  }
  if (normalized.maintenance?.lastServiceDate) {
    normalized.maintenance = {
      ...normalized.maintenance,
      lastServiceDate: new Date(normalized.maintenance.lastServiceDate),
    };
  }
  if (normalized.maintenance?.nextServiceDate) {
    normalized.maintenance = {
      ...normalized.maintenance,
      nextServiceDate: new Date(normalized.maintenance.nextServiceDate),
    };
  }
  if (normalized.insurance?.expiryDate) {
    normalized.insurance = {
      ...normalized.insurance,
      expiryDate: new Date(normalized.insurance.expiryDate),
    };
  }
  if (normalized.kilometersTraveled !== undefined) {
    normalized.kilometersTraveled = Number(normalized.kilometersTraveled);
  }
  if (normalized.downtimeDays !== undefined) {
    normalized.downtimeDays = Number(normalized.downtimeDays);
  }
  if (normalized.technicalInspection?.lastInspectionDate) {
    normalized.technicalInspection = {
      ...normalized.technicalInspection,
      lastInspectionDate: new Date(normalized.technicalInspection.lastInspectionDate),
    };
  }
  if (normalized.technicalInspection?.expiryDate) {
    normalized.technicalInspection = {
      ...normalized.technicalInspection,
      expiryDate: new Date(normalized.technicalInspection.expiryDate),
    };
  }
  if (normalized.complianceDocuments) {
    normalized.complianceDocuments = normalized.complianceDocuments.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt ? new Date(doc.uploadedAt) : undefined,
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt) : undefined,
    }));
  }
  if (normalized.complianceReminders?.insuranceReminderSentAt) {
    normalized.complianceReminders = {
      ...normalized.complianceReminders,
      insuranceReminderSentAt: new Date(
        normalized.complianceReminders.insuranceReminderSentAt,
      ),
    };
  }
  if (normalized.complianceReminders?.technicalInspectionReminderSentAt) {
    normalized.complianceReminders = {
      ...normalized.complianceReminders,
      technicalInspectionReminderSentAt: new Date(
        normalized.complianceReminders.technicalInspectionReminderSentAt,
      ),
    };
  }
  return normalized;
}

export function buildAvailabilityFilter(
  start: Date,
  end: Date,
): Filter<Vehicle> {
  return {
    $and: [
      {
        $or: [
          { reservations: { $exists: false } },
          {
            reservations: {
              $not: {
                $elemMatch: { start: { $lt: end }, end: { $gt: start } },
              },
            },
          },
        ],
      },
      { status: { $ne: 'maintenance' } },
    ],
  } as Filter<Vehicle>;
}

export function findVehicles(
  db: Db,
  filter: Filter<Vehicle>,
  page = 1,
  limit = 0,
): Promise<Vehicle[]> {
  const cursor = db.collection<Vehicle>('vehicles').find(filter).sort({ name: 1 });
  if (limit > 0) {
    const skip = (page - 1) * limit;
    cursor.skip(skip).limit(limit);
  }
  return cursor.toArray();
}

export async function createVehicle(
  db: Db,
  data: NewVehicle,
): Promise<WithId<Vehicle>> {
  const vehicle: Vehicle = {
    status: 'available',
    reservations: [],
    complianceDocuments: [],
    kilometersTraveled: 0,
    downtimeDays: 0,
    ...normalizeVehicleDates(data),
  };
  const result = await db.collection<Vehicle>('vehicles').insertOne(vehicle);
  return { _id: result.insertedId, ...vehicle };
}

export async function updateVehicle(
  db: Db,
  id: string,
  data: Partial<Vehicle>,
): Promise<Vehicle | null> {
  const updates = normalizeVehicleDates(data);
  const unset: Record<string, ''> = {};

  if (data.insurance?.expiryDate !== undefined) {
    unset['complianceReminders.insuranceReminderSentAt'] = '';
  }
  if (data.technicalInspection?.expiryDate !== undefined) {
    unset['complianceReminders.technicalInspectionReminderSentAt'] = '';
  }

  const updateDoc: Record<string, unknown> = { $set: updates };
  if (Object.keys(unset).length) {
    updateDoc.$unset = unset;
  }

  const res = await db
    .collection<Vehicle>('vehicles')
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      updateDoc,
      { returnDocument: 'after' },
    );
  return res.value;
}

export async function deleteVehicle(db: Db, id: string): Promise<boolean> {
  const res = await db
    .collection('vehicles')
    .deleteOne({ _id: new ObjectId(id) });
  return res.deletedCount > 0;
}

export function findVehicleById(
  db: Db,
  id: string,
): Promise<Vehicle | null> {
  return db
    .collection<Vehicle>('vehicles')
    .findOne({ _id: new ObjectId(id) });
}

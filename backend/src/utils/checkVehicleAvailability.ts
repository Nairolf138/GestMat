import { ClientSession, Db, ObjectId } from 'mongodb';
import type {
  Vehicle,
  VehicleReservation,
  VehicleStatus,
} from '../models/Vehicle';
import { reservationEnd, reservationMode } from './reservationPeriod';

const UNAVAILABLE_STATUSES: VehicleStatus[] = [
  'maintenance',
  'retired',
  'unavailable',
];

export function hasReservationConflict(
  reservations: VehicleReservation[] = [],
  start: Date | null,
  end: Date | null,
  excludedLoanRequestId?: ObjectId,
): boolean {
  if (!start || !end) return false;

  return reservations.some((reservation) => {
    const reservationLoanRequestId =
      (reservation as any)?.loanRequestId?.toString?.() ||
      (reservation as any)?.loanRequestId;
    if (
      excludedLoanRequestId &&
      reservationLoanRequestId &&
      reservationLoanRequestId.toString() === excludedLoanRequestId.toString()
    ) {
      return false;
    }

    const reservationStart = new Date(reservation.start);
    const endDate = new Date(reservation.end);

    if (
      Number.isNaN(reservationStart.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return false;
    }

    // End dates are treated as exclusive to allow back-to-back reservations.
    const mode = reservationMode({
      startDate: reservation.start,
      endDate: reservation.end,
      mode: reservation.mode,
    });
    return reservationStart < end && reservationEnd(endDate, mode) > start;
  });
}

export async function checkVehicleAvailability(
  db: Db,
  vehicleId: string,
  start: Date | null,
  end: Date | null,
  session?: ClientSession,
  excludedLoanRequestId?: ObjectId,
): Promise<{ available: boolean } | null> {
  const vehicle = await db
    .collection<Vehicle>('vehicles')
    .findOne(
      { _id: new ObjectId(vehicleId) },
      { projection: { status: 1, reservations: 1 }, session },
    );

  if (!vehicle) {
    return null;
  }

  if (
    vehicle.status &&
    UNAVAILABLE_STATUSES.includes(vehicle.status as VehicleStatus)
  ) {
    return { available: false };
  }

  if (
    hasReservationConflict(
      vehicle.reservations,
      start,
      end,
      excludedLoanRequestId,
    )
  ) {
    return { available: false };
  }

  return { available: true };
}

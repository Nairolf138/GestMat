import { ClientSession, Db, ObjectId } from 'mongodb';
import type { Vehicle, VehicleReservation, VehicleStatus } from '../models/Vehicle';

const UNAVAILABLE_STATUSES: VehicleStatus[] = ['maintenance', 'retired'];

function hasReservationConflict(
  reservations: VehicleReservation[] = [],
  start: Date | null,
  end: Date | null,
): boolean {
  if (!start || !end) return false;

  return reservations.some((reservation) => {
    const reservationStart = new Date(reservation.start);
    const reservationEnd = new Date(reservation.end);

    if (
      Number.isNaN(reservationStart.getTime()) ||
      Number.isNaN(reservationEnd.getTime())
    ) {
      return false;
    }

    // End dates are treated as exclusive to allow back-to-back reservations.
    return reservationStart < end && reservationEnd > start;
  });
}

export async function checkVehicleAvailability(
  db: Db,
  vehicleId: string,
  start: Date | null,
  end: Date | null,
  session?: ClientSession,
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

  if (hasReservationConflict(vehicle.reservations, start, end)) {
    return { available: false };
  }

  return { available: true };
}

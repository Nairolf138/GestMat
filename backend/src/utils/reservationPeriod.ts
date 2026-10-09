import { badRequest } from './errors';

export type ReservationMode = 'day' | 'time';

const DAY = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isMidnightUtc(value: Date): boolean {
  return (
    value.getUTCHours() === 0 &&
    value.getUTCMinutes() === 0 &&
    value.getUTCSeconds() === 0 &&
    value.getUTCMilliseconds() === 0
  );
}

export function reservationMode(record: {
  startDate?: unknown;
  endDate?: unknown;
  mode?: unknown;
  reservationMode?: unknown;
}): ReservationMode {
  if (record.reservationMode === 'day' || record.mode === 'day') return 'day';
  if (record.reservationMode === 'time' || record.mode === 'time')
    return 'time';
  // Older calendar bookings did not record their precision.
  const start = new Date(record.startDate as string);
  const end = new Date(record.endDate as string);
  return !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    isMidnightUtc(start) &&
    isMidnightUtc(end)
    ? 'day'
    : 'time';
}

export function reservationEnd(end: Date, mode: ReservationMode): Date {
  return mode === 'day' ? new Date(end.getTime() + DAY) : end;
}

export function parseReservationPeriod(
  startInput: unknown,
  endInput: unknown,
  mode?: ReservationMode,
) {
  const startIsDay =
    typeof startInput === 'string' && DATE_ONLY.test(startInput);
  const endIsDay = typeof endInput === 'string' && DATE_ONLY.test(endInput);
  if (startIsDay !== endIsDay)
    throw badRequest('Dates must use the same precision');
  const start = new Date(startInput as string);
  const end = new Date(endInput as string);
  const resolvedMode = mode || (startIsDay && endIsDay ? 'day' : 'time');
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    (startIsDay && start.toISOString().slice(0, 10) !== startInput) ||
    (endIsDay && end.toISOString().slice(0, 10) !== endInput) ||
    (resolvedMode === 'day' &&
      (!isMidnightUtc(start) || !isMidnightUtc(end))) ||
    (resolvedMode === 'day' ? end < start : end <= start)
  )
    throw badRequest('Invalid loan dates');
  return {
    start,
    end,
    mode: resolvedMode,
    endExclusive: reservationEnd(end, resolvedMode),
  };
}

export function storedReservationPeriod(record: {
  startDate: unknown;
  endDate: unknown;
  reservationMode?: unknown;
  mode?: unknown;
}) {
  const start = new Date(record.startDate as string);
  const end = new Date(record.endDate as string);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()))
    throw badRequest('Invalid loan dates');
  const mode = reservationMode(record);
  return { start, end, mode, endExclusive: reservationEnd(end, mode) };
}

export function formatDate(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value, timeZone) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export function formatLoanDate(value, loan) {
  if (!value) return '';
  const start = new Date(loan?.startDate);
  const end = new Date(loan?.endDate);
  const legacyDay =
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    start.toISOString().endsWith('T00:00:00.000Z') &&
    end.toISOString().endsWith('T00:00:00.000Z');
  const mode = loan?.reservationMode || (legacyDay ? 'day' : 'time');
  return mode === 'time'
    ? formatDateTime(value, loan?.timeZone)
    : formatDate(value);
}

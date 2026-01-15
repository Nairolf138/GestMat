import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Loading from '../../Loading.jsx';
import { formatDate } from '../../utils/dateFormat.js';

function hasOverlap(reservations = [], start, end) {
  if (!start || !end) return false;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return reservations.some((slot) => {
    const slotStart = new Date(slot.start);
    const slotEnd = new Date(slot.end);
    return slotStart < endDate && slotEnd > startDate;
  });
}

function nextReservation(reservations = []) {
  const now = new Date();
  const upcoming = [...reservations]
    .map((r) => ({
      ...r,
      start: new Date(r.start),
    }))
    .filter((r) => r.start >= now)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  return upcoming[0];
}

function VehicleList({ vehicles, isFetching, availableStart, availableEnd }) {
  const { t } = useTranslation();
  const statusBadge = (status) => {
    const className =
      status === 'available'
        ? 'badge bg-success'
        : status === 'maintenance'
          ? 'badge bg-warning text-dark'
          : status === 'retired'
            ? 'badge bg-secondary'
            : 'badge bg-danger';
    return <span className={className}>{t(`vehicles.status.${status}`)}</span>;
  };

  const availabilityLabel = (vehicle) => {
    if (availableStart && availableEnd) {
      return hasOverlap(vehicle.reservations, availableStart, availableEnd)
        ? t('vehicles.availability.unavailable_range')
        : t('vehicles.availability.available_range');
    }
    const upcoming = nextReservation(vehicle.reservations);
    if (!upcoming) return t('vehicles.availability.no_reservations');
    return t('vehicles.availability.next_reservation', {
      date: formatDate(upcoming.start),
    });
  };

  return (
    <div className="table-responsive">
      <table className="table align-middle">
        <thead>
          <tr>
            <th>{t('vehicles.columns.name')}</th>
            <th>{t('vehicles.columns.registration')}</th>
            <th>{t('vehicles.columns.location')}</th>
            <th>{t('vehicles.columns.status')}</th>
            <th>{t('vehicles.columns.availability')}</th>
          </tr>
        </thead>
        <tbody>
          {isFetching && (
            <tr>
              <td colSpan="5" className="text-center">
                <Loading />
              </td>
            </tr>
          )}
          {!isFetching && vehicles.length === 0 && (
            <tr>
              <td colSpan="5" className="text-center text-muted">
                {t('vehicles.empty')}
              </td>
            </tr>
          )}
          {!isFetching &&
            vehicles.map((vehicle) => (
              <tr key={vehicle._id}>
                <td>
                  <Link to={`/vehicles/${vehicle._id}`} className="fw-semibold">
                    {vehicle.name}
                  </Link>
                  <div className="text-muted small">
                    {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                  </div>
                </td>
                <td>{vehicle.registrationNumber || '—'}</td>
                <td>{vehicle.location || '—'}</td>
                <td>{statusBadge(vehicle.status || 'unavailable')}</td>
                <td>{availabilityLabel(vehicle)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

VehicleList.propTypes = {
  vehicles: PropTypes.array.isRequired,
  isFetching: PropTypes.bool,
  availableStart: PropTypes.string,
  availableEnd: PropTypes.string,
};

export default VehicleList;

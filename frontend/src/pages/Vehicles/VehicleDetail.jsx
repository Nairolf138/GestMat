import React, { useContext, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import NavBar from '../../NavBar';
import Alert from '../../Alert.jsx';
import Loading from '../../Loading.jsx';
import VehicleForm from './VehicleForm.jsx';
import { api } from '../../api';
import { GlobalContext } from '../../GlobalContext.jsx';

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString();
}

function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify } = useContext(GlobalContext);
  const [isEditing, setIsEditing] = useState(false);

  const { data: vehicle, isFetching, error } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => api(`/vehicles/${id}`),
  });

  const reservations = [...(vehicle?.reservations || [])].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
  );

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <button
          type="button"
          className="btn btn-link mb-3"
          onClick={() => navigate(-1)}
        >
          {t('common.back')}
        </button>
        <Alert message={error?.message} />
        {isFetching && <Loading />}
        {!isFetching && vehicle && (
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h1 className="h2 mb-1">{vehicle.name}</h1>
                      <p className="text-muted mb-2">
                        {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                      </p>
                      <p className="mb-0">
                        <strong>{t('vehicles.detail.registration')}:</strong>{' '}
                        {vehicle.registrationNumber || t('vehicles.detail.not_provided')}
                      </p>
                      <p className="mb-0">
                        <strong>{t('vehicles.detail.status')}:</strong>{' '}
                        {t(`vehicles.status.${vehicle.status || 'unavailable'}`)}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="mb-1">
                        <strong>{t('vehicles.detail.location')}:</strong>{' '}
                        {vehicle.location || '—'}
                      </p>
                      <p className="mb-1">
                        <strong>{t('vehicles.detail.usage')}:</strong>{' '}
                        {vehicle.usage || t('vehicles.detail.not_provided')}
                      </p>
                      <p className="mb-0">
                        <strong>{t('vehicles.detail.structure')}:</strong>{' '}
                        {typeof vehicle.structure === 'object'
                          ? vehicle.structure?.name
                          : vehicle.structure || t('vehicles.detail.not_provided')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="h5">{t('vehicles.detail.documents')}</h3>
                    <div className="row g-3">
                      <div className="col-md-6">
                        <div className="border rounded p-3 h-100">
                          <h4 className="h6 mb-2">{t('vehicles.detail.insurance')}</h4>
                          <p className="mb-1">
                            <strong>{t('vehicles.detail.provider')}:</strong>{' '}
                            {vehicle.insurance?.provider || t('vehicles.detail.not_provided')}
                          </p>
                          <p className="mb-1">
                            <strong>{t('vehicles.detail.policy')}:</strong>{' '}
                            {vehicle.insurance?.policyNumber || '—'}
                          </p>
                          <p className="mb-0">
                            <strong>{t('vehicles.detail.expiry')}:</strong>{' '}
                            {vehicle.insurance?.expiryDate
                              ? formatDate(vehicle.insurance.expiryDate)
                              : t('vehicles.detail.not_provided')}
                          </p>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="border rounded p-3 h-100">
                          <h4 className="h6 mb-2">{t('vehicles.detail.technical')}</h4>
                          <p className="mb-1">
                            <strong>{t('vehicles.detail.last_service')}:</strong>{' '}
                            {vehicle.maintenance?.lastServiceDate
                              ? formatDate(vehicle.maintenance.lastServiceDate)
                              : t('vehicles.detail.not_provided')}
                          </p>
                          <p className="mb-1">
                            <strong>{t('vehicles.detail.next_service')}:</strong>{' '}
                            {vehicle.maintenance?.nextServiceDate
                              ? formatDate(vehicle.maintenance.nextServiceDate)
                              : t('vehicles.detail.not_provided')}
                          </p>
                          <p className="mb-0">
                            <strong>{t('vehicles.detail.notes')}:</strong>{' '}
                            {vehicle.maintenance?.notes || '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h3 className="h5 mb-2">{t('vehicles.detail.characteristics')}</h3>
                    <ul className="list-inline mb-0">
                      {vehicle.characteristics?.seats && (
                        <li className="list-inline-item me-3">
                          {t('vehicles.detail.seats', {
                            count: vehicle.characteristics.seats,
                          })}
                        </li>
                      )}
                      {vehicle.characteristics?.fuelType && (
                        <li className="list-inline-item me-3">
                          {t('vehicles.detail.fuel', {
                            value: vehicle.characteristics.fuelType,
                          })}
                        </li>
                      )}
                      {vehicle.characteristics?.transmission && (
                        <li className="list-inline-item me-3">
                          {t('vehicles.detail.transmission', {
                            value: vehicle.characteristics.transmission,
                          })}
                        </li>
                      )}
                      {vehicle.characteristics?.color && (
                        <li className="list-inline-item me-3">
                          {t('vehicles.detail.color', {
                            value: vehicle.characteristics.color,
                          })}
                        </li>
                      )}
                      {!vehicle.characteristics && (
                        <li className="list-inline-item text-muted">
                          {t('vehicles.detail.not_provided')}
                        </li>
                      )}
                    </ul>
                  </div>
                  <div className="mt-3">
                    <h3 className="h5 mb-2">{t('vehicles.detail.notes_title')}</h3>
                    <p className="mb-0">
                      {vehicle.notes?.trim() || t('vehicles.detail.not_provided')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="card shadow-sm mb-3">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h3 className="h5 mb-0">{t('vehicles.detail.history')}</h3>
                    <Link to="/vehicles" className="btn btn-outline-secondary btn-sm">
                      {t('vehicles.detail.back_to_list')}
                    </Link>
                  </div>
                  {reservations.length === 0 && (
                    <p className="text-muted mb-0">{t('vehicles.detail.no_history')}</p>
                  )}
                  {reservations.map((entry) => (
                    <div key={`${entry.start}-${entry.end}`} className="border rounded p-2 mb-2">
                      <div className="fw-semibold">
                        {formatDate(entry.start)} - {formatDate(entry.end)}
                      </div>
                      <div className="text-muted small">
                        {entry.status
                          ? t(`vehicles.status.${entry.status}`)
                          : t('vehicles.detail.status_pending')}
                      </div>
                      {entry.note && <p className="mb-0 small">{entry.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="card shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h3 className="h5 mb-0">{t('vehicles.detail.edit_title')}</h3>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => setIsEditing((prev) => !prev)}
                    >
                      {isEditing ? t('common.close') : t('vehicles.form.edit_title')}
                    </button>
                  </div>
                  {isEditing ? (
                    <VehicleForm
                      vehicle={vehicle}
                      onCompleted={(updated) => {
                        notify(t('vehicles.form.update_success'), 'success');
                        setIsEditing(false);
                        if (updated?.name) document.title = `${updated.name} - GestMat`;
                      }}
                      onCancel={() => setIsEditing(false)}
                    />
                  ) : (
                    <p className="text-muted mb-0">{t('vehicles.detail.edit_hint')}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default VehicleDetail;

import React, { useContext, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Alert from '../../Alert.jsx';
import Loading from '../../Loading.jsx';
import VehicleForm from './VehicleForm.jsx';
import VehicleManagers from '../../components/VehicleManagers.jsx';
import { api } from '../../api';
import { GlobalContext } from '../../GlobalContext.jsx';
import { AuthContext } from '../../AuthContext.jsx';
import { formatDate, formatDateTime } from '../../utils/dateFormat.js';

function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { notify, structures } = useContext(GlobalContext);
  const { user } = useContext(AuthContext);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmittingLoan, setIsSubmittingLoan] = useState(false);
  const [loanFormError, setLoanFormError] = useState('');
  const [loanFieldErrors, setLoanFieldErrors] = useState({});
  const defaultBorrowerId =
    typeof user?.structure === 'string'
      ? user.structure
      : user?.structure?._id || '';
  const [loanForm, setLoanForm] = useState({
    borrower: defaultBorrowerId,
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    note: '',
  });

  const {
    data: vehicle,
    isFetching,
    error,
  } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => api(`/vehicles/${id}`),
  });

  const reservations = [...(vehicle?.reservations || [])].sort(
    (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime(),
  );
  const ownerStructureId =
    typeof vehicle?.structure === 'string'
      ? vehicle.structure
      : vehicle?.structure?._id || '';
  const ownerStructureName =
    structures.find((structure) => structure._id === ownerStructureId)?.name ||
    vehicle?.structure?.name ||
    t('vehicles.detail.not_provided');

  const updateLoanField = (field, value) => {
    setLoanForm((prev) => ({ ...prev, [field]: value }));
    setLoanFieldErrors((prev) => ({ ...prev, [field]: '' }));
    setLoanFormError('');
  };

  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    setLoanFormError('');
    setLoanFieldErrors({});

    if (
      !loanForm.borrower ||
      !loanForm.startDate ||
      !loanForm.startTime ||
      !loanForm.endDate ||
      !loanForm.endTime ||
      !ownerStructureId
    ) {
      setLoanFormError(t('vehicles.detail.request_missing_fields'));
      return;
    }
    const start = new Date(`${loanForm.startDate}T${loanForm.startTime}`);
    const end = new Date(`${loanForm.endDate}T${loanForm.endTime}`);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start >= end
    ) {
      setLoanFieldErrors({
        startDate: t('vehicles.detail.request_invalid_dates'),
        endDate: t('vehicles.detail.request_invalid_dates'),
      });
      return;
    }

    const payload = {
      owner: ownerStructureId,
      borrower: loanForm.borrower,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      note: loanForm.note,
      items: [{ kind: 'vehicle', vehicle: id }],
    };

    setIsSubmittingLoan(true);
    try {
      const created = await api('/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      notify(t('vehicles.detail.request_success'), 'success');
      navigate(created?._id ? `/loans/${created._id}` : '/loans');
    } catch (err) {
      const dateConflict =
        err?.message === 'Vehicle not available' ||
        err?.fields?.startDate ||
        err?.fields?.endDate ||
        err?.fields?.items;
      if (dateConflict) {
        const conflictMessage = t('vehicles.detail.request_conflict_dates');
        setLoanFieldErrors({
          startDate: err?.fields?.startDate || conflictMessage,
          endDate: err?.fields?.endDate || conflictMessage,
        });
      } else {
        setLoanFormError(err?.message || t('vehicles.detail.request_error'));
      }
    } finally {
      setIsSubmittingLoan(false);
    }
  };

  return (
    <>
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
        <div className="row g-4 vehicle-detail">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6 text-break">
                    <h1 className="h2 mb-1">{vehicle.name}</h1>
                    <p className="text-muted mb-2">
                      {[vehicle.brand, vehicle.model].filter(Boolean).join(' ')}
                    </p>
                    <p className="mb-0">
                      <strong>{t('vehicles.detail.registration')}:</strong>{' '}
                      {vehicle.registrationNumber ||
                        t('vehicles.detail.not_provided')}
                    </p>
                    <p className="mb-0">
                      <strong>{t('vehicles.detail.status')}:</strong>{' '}
                      {t(`vehicles.status.${vehicle.status || 'unavailable'}`)}
                    </p>
                  </div>
                  <div className="col-12 col-md-6 text-break">
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
                      {ownerStructureName}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="h5">{t('vehicles.detail.documents')}</h3>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <div className="border rounded p-3 h-100">
                        <h4 className="h6 mb-2">
                          {t('vehicles.detail.insurance')}
                        </h4>
                        <p className="mb-1">
                          <strong>{t('vehicles.detail.provider')}:</strong>{' '}
                          {vehicle.insurance?.provider ||
                            t('vehicles.detail.not_provided')}
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
                        <h4 className="h6 mb-2">
                          {t('vehicles.detail.technical')}
                        </h4>
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
                  <h3 className="h5 mb-2">
                    {t('vehicles.detail.characteristics')}
                  </h3>
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
                  <h3 className="h5 mb-2">
                    {t('vehicles.detail.notes_title')}
                  </h3>
                  <p className="mb-0">
                    {vehicle.notes?.trim() || t('vehicles.detail.not_provided')}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-4">
            <div className="card shadow-sm mb-3">
              <div className="card-body border-bottom">
                <h3 className="h5 mb-3">
                  {t('vehicles.detail.request_title')}
                </h3>
                <Alert
                  message={loanFormError}
                  onClose={() => setLoanFormError('')}
                />
                <form onSubmit={handleLoanSubmit} noValidate>
                  <div className="mb-3">
                    <label
                      className="form-label"
                      htmlFor="vehicle-loan-borrower"
                    >
                      {t('vehicles.detail.request_borrower_structure')}
                    </label>
                    <select
                      id="vehicle-loan-borrower"
                      className={`form-select ${loanFieldErrors.borrower ? 'is-invalid' : ''}`}
                      disabled={user?.role !== 'Administrateur'}
                      value={loanForm.borrower}
                      onChange={(e) =>
                        updateLoanField('borrower', e.target.value)
                      }
                      required
                    >
                      <option value="">{t('common.choose')}</option>
                      {structures.map((structure) => (
                        <option key={structure._id} value={structure._id}>
                          {structure.name || structure.label}
                        </option>
                      ))}
                    </select>
                    {loanFieldErrors.borrower && (
                      <div className="invalid-feedback">
                        {loanFieldErrors.borrower}
                      </div>
                    )}
                  </div>
                  <div className="row g-3">
                    {['start', 'end'].map((boundary) => (
                      <fieldset className="col-12" key={boundary}>
                        <legend className="fs-6 fw-semibold mb-2">
                          {t(`vehicles.detail.request_${boundary}`)}
                        </legend>
                        <div className="row g-2">
                          <div className="col-12 col-sm-6 vehicle-booking-field">
                            <label
                              className="form-label"
                              htmlFor={`vehicle-loan-${boundary}-date`}
                            >
                              {t('vehicles.detail.request_date')}
                            </label>
                            <input
                              id={`vehicle-loan-${boundary}-date`}
                              type="date"
                              className={`form-control ${loanFieldErrors[`${boundary}Date`] ? 'is-invalid' : ''}`}
                              value={loanForm[`${boundary}Date`]}
                              onChange={(e) =>
                                updateLoanField(
                                  `${boundary}Date`,
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                          <div className="col-12 col-sm-6 vehicle-booking-field">
                            <label
                              className="form-label"
                              htmlFor={`vehicle-loan-${boundary}-time`}
                            >
                              {t('vehicles.detail.request_time')}
                            </label>
                            <input
                              id={`vehicle-loan-${boundary}-time`}
                              type="time"
                              step="60"
                              className={`form-control ${loanFieldErrors[`${boundary}Date`] ? 'is-invalid' : ''}`}
                              value={loanForm[`${boundary}Time`]}
                              onChange={(e) =>
                                updateLoanField(
                                  `${boundary}Time`,
                                  e.target.value,
                                )
                              }
                              required
                            />
                          </div>
                        </div>
                        {loanFieldErrors[`${boundary}Date`] && (
                          <div className="text-danger small mt-1" role="alert">
                            {loanFieldErrors[`${boundary}Date`]}
                          </div>
                        )}
                      </fieldset>
                    ))}
                  </div>
                  <div className="form-text">
                    {t('vehicles.detail.local_time_zone', {
                      zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    })}
                  </div>
                  <div className="mt-3">
                    <label className="form-label" htmlFor="vehicle-loan-note">
                      {t('vehicles.detail.request_note')}
                    </label>
                    <textarea
                      id="vehicle-loan-note"
                      className="form-control"
                      rows="3"
                      value={loanForm.note}
                      onChange={(e) => updateLoanField('note', e.target.value)}
                      maxLength={500}
                    />
                  </div>
                  <div className="d-grid d-sm-block mt-3">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isSubmittingLoan}
                    >
                      {isSubmittingLoan
                        ? t('vehicles.detail.request_submitting')
                        : t('vehicles.detail.request_action')}
                    </button>
                  </div>
                </form>
              </div>
              <div className="card-body">
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mb-2">
                  <h3 className="h5 mb-0">{t('vehicles.detail.history')}</h3>
                  <Link
                    to="/vehicles"
                    className="btn btn-outline-secondary btn-sm"
                  >
                    {t('vehicles.detail.back_to_list')}
                  </Link>
                </div>
                {reservations.length === 0 && (
                  <p className="text-muted mb-0">
                    {t('vehicles.detail.no_history')}
                  </p>
                )}
                {reservations.map((entry) => (
                  <div
                    key={`${entry.start}-${entry.end}`}
                    className="border rounded p-2 mb-2"
                  >
                    <div className="fw-semibold">
                      {entry.mode === 'time'
                        ? formatDateTime(entry.start, entry.timeZone)
                        : formatDate(entry.start)}
                      {' - '}
                      {entry.mode === 'time'
                        ? formatDateTime(entry.end, entry.timeZone)
                        : formatDate(entry.end)}
                      {entry.mode === 'time' &&
                        entry.timeZone &&
                        ` (${entry.timeZone})`}
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
            {vehicle.permissions?.canAssign && (
              <VehicleManagers vehicle={vehicle} />
            )}
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center justify-content-between gap-2 mb-3">
                  <h3 className="h5 mb-0">{t('vehicles.detail.edit_title')}</h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={!vehicle.permissions?.canEdit}
                    onClick={() => setIsEditing((prev) => !prev)}
                  >
                    {isEditing
                      ? t('common.close')
                      : t('vehicles.form.edit_title')}
                  </button>
                </div>
                {isEditing ? (
                  <VehicleForm
                    vehicle={vehicle}
                    onCompleted={(updated) => {
                      notify(t('vehicles.form.update_success'), 'success');
                      setIsEditing(false);
                      if (updated?.name)
                        document.title = `${updated.name} - GestMat`;
                    }}
                    onCancel={() => setIsEditing(false)}
                  />
                ) : (
                  <p className="text-muted mb-0">
                    {t('vehicles.detail.edit_hint')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VehicleDetail;

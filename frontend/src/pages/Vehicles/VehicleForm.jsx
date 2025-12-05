import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../../api';
import Alert from '../../Alert.jsx';
import FormCard from '../../components/FormCard.jsx';
import { GlobalContext } from '../../GlobalContext.jsx';
import { AuthContext } from '../../AuthContext.jsx';

const statusOptions = ['available', 'unavailable', 'maintenance', 'retired'];

function sanitizeCharacteristics(form) {
  const characteristics = {
    seats: form.seats ? Number(form.seats) : undefined,
    fuelType: form.fuelType || undefined,
    transmission: form.transmission || undefined,
    color: form.color || undefined,
  };
  const hasCharacteristics = Object.values(characteristics).some(
    (value) => value !== undefined && value !== '',
  );
  return hasCharacteristics ? characteristics : undefined;
}

function sanitizeMaintenance(form) {
  const maintenance = {
    lastServiceDate: form.lastServiceDate || undefined,
    nextServiceDate: form.nextServiceDate || undefined,
    notes: form.maintenanceNotes || undefined,
  };
  const hasMaintenance = Object.values(maintenance).some(Boolean);
  return hasMaintenance ? maintenance : undefined;
}

function sanitizeInsurance(form) {
  const insurance = {
    provider: form.insuranceProvider || undefined,
    policyNumber: form.policyNumber || undefined,
    expiryDate: form.insuranceExpiry || undefined,
  };
  const hasInsurance = Object.values(insurance).some(Boolean);
  return hasInsurance ? insurance : undefined;
}

function VehicleForm({ vehicle, onCompleted, onCancel }) {
  const { t } = useTranslation();
  const { notify, structures } = useContext(GlobalContext);
  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();
  const initialForm = useMemo(
    () => ({
      name: vehicle?.name || '',
      type: vehicle?.type || '',
      usage: vehicle?.usage || '',
      structure: typeof vehicle?.structure === 'object' ? vehicle?.structure?._id : vehicle?.structure || user?.structure?._id || '',
      brand: vehicle?.brand || '',
      model: vehicle?.model || '',
      registrationNumber: vehicle?.registrationNumber || '',
      status: vehicle?.status || 'available',
      location: vehicle?.location || '',
      seats: vehicle?.characteristics?.seats || '',
      fuelType: vehicle?.characteristics?.fuelType || '',
      transmission: vehicle?.characteristics?.transmission || '',
      color: vehicle?.characteristics?.color || '',
      lastServiceDate: vehicle?.maintenance?.lastServiceDate
        ? new Date(vehicle.maintenance.lastServiceDate).toISOString().slice(0, 10)
        : '',
      nextServiceDate: vehicle?.maintenance?.nextServiceDate
        ? new Date(vehicle.maintenance.nextServiceDate).toISOString().slice(0, 10)
        : '',
      maintenanceNotes: vehicle?.maintenance?.notes || '',
      insuranceProvider: vehicle?.insurance?.provider || '',
      policyNumber: vehicle?.insurance?.policyNumber || '',
      insuranceExpiry: vehicle?.insurance?.expiryDate
        ? new Date(vehicle.insurance.expiryDate).toISOString().slice(0, 10)
        : '',
      notes: vehicle?.notes || '',
    }),
    [vehicle, user?.structure?._id],
  );
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => {
      const path = vehicle ? `/vehicles/${vehicle._id}` : '/vehicles';
      const method = vehicle ? 'PUT' : 'POST';
      return api(path, { method, body: JSON.stringify(payload) });
    },
    onSuccess: (data) => {
      notify(
        vehicle
          ? t('vehicles.form.update_success')
          : t('vehicles.form.create_success'),
        'success',
      );
      setErrors({});
      setError('');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      if (vehicle) {
        queryClient.setQueryData(['vehicle', vehicle._id], data);
      }
      if (onCompleted) onCompleted(data);
    },
    onError: (err) => {
      setErrors(err.fields || err.fieldErrors || {});
      setError(err.message || t('vehicles.form.submit_error'));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const fieldErrors = {};
    if (!form.name.trim()) fieldErrors.name = t('common.required');
    if (!form.status) fieldErrors.status = t('common.required');
    setErrors(fieldErrors);
    return Object.keys(fieldErrors).length === 0;
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      type: form.type || undefined,
      usage: form.usage || undefined,
      structure: form.structure || undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      registrationNumber: form.registrationNumber || undefined,
      status: form.status || undefined,
      location: form.location || undefined,
      notes: form.notes || undefined,
      characteristics: sanitizeCharacteristics(form),
      maintenance: sanitizeMaintenance(form),
      insurance: sanitizeInsurance(form),
    };
    if (!payload.characteristics) delete payload.characteristics;
    if (!payload.maintenance) delete payload.maintenance;
    if (!payload.insurance) delete payload.insurance;
    return payload;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    mutation.mutate(buildPayload());
  };

  return (
    <FormCard
      role="form"
      aria-label={
        vehicle ? t('vehicles.form.edit_title') : t('vehicles.form.create_title')
      }
      onSubmit={handleSubmit}
      autoComplete="off"
    >
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h2 mb-0">
          {vehicle ? t('vehicles.form.edit_title') : t('vehicles.form.create_title')}
        </h2>
        {onCancel && (
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
      </div>
      <Alert message={error} />
      <div className="row g-3">
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-name">
            {t('vehicles.form.name')}
          </label>
          <input
            id="veh-name"
            name="name"
            value={form.name}
            onChange={handleChange}
            className={`form-control${errors.name ? ' is-invalid' : ''}`}
            required
            autoComplete="off"
            aria-invalid={errors.name ? 'true' : undefined}
            aria-describedby={errors.name ? 'veh-name-error' : undefined}
          />
          {errors.name && (
            <div className="invalid-feedback" id="veh-name-error" role="alert">
              {errors.name}
            </div>
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-status">
            {t('vehicles.form.status')}
          </label>
          <select
            id="veh-status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className={`form-select${errors.status ? ' is-invalid' : ''}`}
            required
            aria-invalid={errors.status ? 'true' : undefined}
            aria-describedby={errors.status ? 'veh-status-error' : undefined}
          >
            <option value="">{t('common.choose')}</option>
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {t(`vehicles.status.${option}`)}
              </option>
            ))}
          </select>
          {errors.status && (
            <div className="invalid-feedback" id="veh-status-error" role="alert">
              {errors.status}
            </div>
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-type">
            {t('vehicles.form.type')}
          </label>
          <input
            id="veh-type"
            name="type"
            value={form.type}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.type_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-usage">
            {t('vehicles.form.usage')}
          </label>
          <input
            id="veh-usage"
            name="usage"
            value={form.usage}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.usage_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-structure">
            {t('vehicles.form.structure')}
          </label>
          <select
            id="veh-structure"
            name="structure"
            value={form.structure}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">{t('common.choose')}</option>
            {structures.map((structure) => (
              <option key={structure._id} value={structure._id}>
                {structure.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-location">
            {t('vehicles.form.location')}
          </label>
          <input
            id="veh-location"
            name="location"
            value={form.location}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.location_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-brand">
            {t('vehicles.form.brand')}
          </label>
          <input
            id="veh-brand"
            name="brand"
            value={form.brand}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.brand_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-model">
            {t('vehicles.form.model')}
          </label>
          <input
            id="veh-model"
            name="model"
            value={form.model}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.model_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-registration">
            {t('vehicles.form.registrationNumber')}
          </label>
          <input
            id="veh-registration"
            name="registrationNumber"
            value={form.registrationNumber}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
            placeholder={t('vehicles.form.registration_placeholder')}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-seats">
            {t('vehicles.form.seats')}
          </label>
          <input
            id="veh-seats"
            name="seats"
            type="number"
            min="0"
            value={form.seats}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-fuel">
            {t('vehicles.form.fuelType')}
          </label>
          <input
            id="veh-fuel"
            name="fuelType"
            value={form.fuelType}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-transmission">
            {t('vehicles.form.transmission')}
          </label>
          <input
            id="veh-transmission"
            name="transmission"
            value={form.transmission}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-color">
            {t('vehicles.form.color')}
          </label>
          <input
            id="veh-color"
            name="color"
            value={form.color}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-last-service">
            {t('vehicles.form.lastServiceDate')}
          </label>
          <input
            id="veh-last-service"
            name="lastServiceDate"
            type="date"
            value={form.lastServiceDate}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-next-service">
            {t('vehicles.form.nextServiceDate')}
          </label>
          <input
            id="veh-next-service"
            name="nextServiceDate"
            type="date"
            value={form.nextServiceDate}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-maint-notes">
            {t('vehicles.form.maintenanceNotes')}
          </label>
          <textarea
            id="veh-maint-notes"
            name="maintenanceNotes"
            value={form.maintenanceNotes}
            onChange={handleChange}
            className="form-control"
            rows={3}
            autoComplete="off"
          />
        </div>
        <div className="col-md-6">
          <label className="form-label" htmlFor="veh-insurance-provider">
            {t('vehicles.form.insuranceProvider')}
          </label>
          <input
            id="veh-insurance-provider"
            name="insuranceProvider"
            value={form.insuranceProvider}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
          <label className="form-label mt-2" htmlFor="veh-policy-number">
            {t('vehicles.form.policyNumber')}
          </label>
          <input
            id="veh-policy-number"
            name="policyNumber"
            value={form.policyNumber}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
          <label className="form-label mt-2" htmlFor="veh-insurance-expiry">
            {t('vehicles.form.insuranceExpiry')}
          </label>
          <input
            id="veh-insurance-expiry"
            name="insuranceExpiry"
            type="date"
            value={form.insuranceExpiry}
            onChange={handleChange}
            className="form-control"
            autoComplete="off"
          />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="veh-notes">
            {t('vehicles.form.notes')}
          </label>
          <textarea
            id="veh-notes"
            name="notes"
            value={form.notes}
            onChange={handleChange}
            className="form-control"
            rows={3}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        {onCancel && (
          <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? t('common.loading') : t('vehicles.form.submit')}
        </button>
      </div>
    </FormCard>
  );
}

VehicleForm.propTypes = {
  vehicle: PropTypes.object,
  onCompleted: PropTypes.func,
  onCancel: PropTypes.func,
};

export default VehicleForm;

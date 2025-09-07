import React, { useState, useContext } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { GlobalContext } from './GlobalContext.jsx';
import FormCard from './components/FormCard.jsx';

function AddEquipment({ onCreated }) {
  const { t } = useTranslation();
  const { notify } = useContext(GlobalContext);
  const queryClient = useQueryClient();
  const initialForm = {
    name: '',
    type: '',
    totalQty: 0,
    condition: '',
  };
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  const mutation = useMutation({
    mutationFn: (payload) =>
      api('/equipments', { method: 'POST', body: JSON.stringify(payload) }),
    onSuccess: () => {
      notify(t('equipments.add.success'), 'success');
      setForm(initialForm);
      setError('');
      setErrors({});
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      if (onCreated) onCreated();
    },
    onError: (err) => {
      setErrors(err.fieldErrors || {});
      setError(err.message || t('equipments.add.error_create'));
    },
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed =
      name === 'totalQty' ? (value === '' ? '' : Number(value)) : value;
    setForm({ ...form, [name]: parsed });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!form.name.trim()) fieldErrors.name = t('common.required');
    if (!form.type) fieldErrors.type = t('common.required');
    if (!form.totalQty) fieldErrors.totalQty = t('common.required');
    if (!form.condition) fieldErrors.condition = t('common.required');
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = {
      ...form,
      totalQty: Number(form.totalQty) || 0,
      availableQty: Number(form.totalQty) || 0,
    };
    mutation.mutate(payload);
  };

  return (
    <FormCard
      onSubmit={handleSubmit}
      autoComplete="off"
      aria-labelledby="add-equip-title"
    >
      <h2 id="add-equip-title" className="h2">
        {t('equipments.add.title')}
      </h2>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-name">
          {t('equipments.add.name')}
        </label>
        <input
          id="eq-name"
          name="name"
          className={`form-control${errors.name ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.name')}
          value={form.name}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'eq-name-error' : undefined}
        />
        {errors.name && (
          <div
            className="invalid-feedback"
            id="eq-name-error"
            role="alert"
            aria-live="polite"
          >
            {errors.name}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-type">
          {t('equipments.add.type')}
        </label>
        <select
          id="eq-type"
          name="type"
          className={`form-select${errors.type ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.type')}
          value={form.type}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.type ? 'true' : undefined}
          aria-describedby={errors.type ? 'eq-type-error' : undefined}
        >
          <option value="">{t('common.choose')}</option>
          <option value="Son">{t('equipments.add.types.sound')}</option>
          <option value="Lumière">{t('equipments.add.types.light')}</option>
          <option value="Plateau">{t('equipments.add.types.stage')}</option>
          <option value="Vidéo">{t('equipments.add.types.video')}</option>
          <option value="Autre">{t('equipments.add.types.other')}</option>
        </select>
        {errors.type && (
          <div
            className="invalid-feedback"
            id="eq-type-error"
            role="alert"
            aria-live="polite"
          >
            {errors.type}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-total">
          {t('equipments.add.total_quantity')}
        </label>
        <input
          id="eq-total"
          name="totalQty"
          type="number"
          className={`form-control${errors.totalQty ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.total_quantity')}
          value={form.totalQty}
          onChange={handleChange}
          required
          min="1"
          autoComplete="off"
          aria-invalid={errors.totalQty ? 'true' : undefined}
          aria-describedby={errors.totalQty ? 'eq-total-error' : undefined}
        />
        {errors.totalQty && (
          <div
            className="invalid-feedback"
            id="eq-total-error"
            role="alert"
            aria-live="polite"
          >
            {errors.totalQty}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-condition">
          {t('equipments.add.condition')}
        </label>
        <select
          id="eq-condition"
          name="condition"
          className={`form-select${errors.condition ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.condition')}
          value={form.condition}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.condition ? 'true' : undefined}
          aria-describedby={errors.condition ? 'eq-condition-error' : undefined}
        >
          <option value="">{t('common.choose')}</option>
          <option value="Neuf">{t('equipments.add.conditions.new')}</option>
          <option value="Légèrement usé">
            {t('equipments.add.conditions.used_lightly')}
          </option>
          <option value="Usé">{t('equipments.add.conditions.used')}</option>
          <option value="Très usé">
            {t('equipments.add.conditions.very_used')}
          </option>
        </select>
        {errors.condition && (
          <div
            className="invalid-feedback"
            id="eq-condition-error"
            role="alert"
            aria-live="polite"
          >
            {errors.condition}
          </div>
        )}
      </div>
      <button
        type="submit"
        className="btn mt-2"
        style={{
          backgroundColor: 'var(--color-primary)',
          borderColor: 'var(--color-primary)',
          color: '#fff',
        }}
      >
        {t('equipments.add.submit')}
      </button>
    </FormCard>
  );
}

export default AddEquipment;

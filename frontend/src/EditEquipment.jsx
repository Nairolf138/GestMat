import React, { useState, useEffect, useContext } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { GlobalContext } from './GlobalContext.jsx';

function EditEquipment({ equipment, onUpdated, onCancel }) {
  const { t } = useTranslation();
  const { notify } = useContext(GlobalContext);
  const [form, setForm] = useState({
    name: '',
    type: '',
    totalQty: 0,
    condition: '',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (equipment) {
      setForm({
        name: equipment.name || '',
        type: equipment.type || '',
        totalQty: equipment.totalQty || 0,
        condition: equipment.condition || '',
      });
    }
  }, [equipment]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed =
      name === 'totalQty'
        ? value === ''
          ? ''
          : Number(value)
        : value;
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

    try {
      const payload = {
        ...form,
        totalQty: Number(form.totalQty) || 0,
      };
      await api(`/equipments/${equipment._id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      notify(t('equipments.edit.success'), 'success');
      setError('');
      setErrors({});
      if (onUpdated) onUpdated();
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message || t('equipments.edit.error_update'));
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4"
      autoComplete="off"
      aria-labelledby="edit-equip-title"
    >
      <h2 id="edit-equip-title">{t('equipments.edit.title')}</h2>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="edit-eq-name">{t('equipments.add.name')}</label>
        <input
          id="edit-eq-name"
          name="name"
          className={`form-control${errors.name ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.name')}
          value={form.name}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.name ? 'true' : undefined}
          aria-describedby={errors.name ? 'edit-eq-name-error' : undefined}
        />
        {errors.name && (
          <div
            className="invalid-feedback"
            id="edit-eq-name-error"
            role="alert"
            aria-live="polite"
          >
            {errors.name}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="edit-eq-type">{t('equipments.add.type')}</label>
        <select
          id="edit-eq-type"
          name="type"
          className={`form-select${errors.type ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.type')}
          value={form.type}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.type ? 'true' : undefined}
          aria-describedby={errors.type ? 'edit-eq-type-error' : undefined}
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
            id="edit-eq-type-error"
            role="alert"
            aria-live="polite"
          >
            {errors.type}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="edit-eq-total">{t('equipments.add.total_quantity')}</label>
        <input
          id="edit-eq-total"
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
          aria-describedby={errors.totalQty ? 'edit-eq-total-error' : undefined}
        />
        {errors.totalQty && (
          <div
            className="invalid-feedback"
            id="edit-eq-total-error"
            role="alert"
            aria-live="polite"
          >
            {errors.totalQty}
          </div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="edit-eq-condition">{t('equipments.add.condition')}</label>
        <select
          id="edit-eq-condition"
          name="condition"
          className={`form-select${errors.condition ? ' is-invalid' : ''}`}
          aria-label={t('equipments.add.condition')}
          value={form.condition}
          onChange={handleChange}
          required
          autoComplete="off"
          aria-invalid={errors.condition ? 'true' : undefined}
          aria-describedby={errors.condition ? 'edit-eq-condition-error' : undefined}
        >
          <option value="">{t('common.choose')}</option>
          <option value="Neuf">{t('equipments.add.conditions.new')}</option>
          <option value="Légèrement usé">{t('equipments.add.conditions.used_lightly')}</option>
          <option value="Usé">{t('equipments.add.conditions.used')}</option>
          <option value="Très usé">{t('equipments.add.conditions.very_used')}</option>
        </select>
        {errors.condition && (
          <div
            className="invalid-feedback"
            id="edit-eq-condition-error"
            role="alert"
            aria-live="polite"
          >
            {errors.condition}
          </div>
        )}
      </div>
      <button type="submit" className="btn btn-primary mt-2">
        {t('equipments.edit.submit')}
      </button>
      {onCancel && (
        <button
          type="button"
          className="btn btn-secondary mt-2 ms-2"
          onClick={onCancel}
        >
          {t('equipments.edit.cancel')}
        </button>
      )}
    </form>
  );
}

export default EditEquipment;

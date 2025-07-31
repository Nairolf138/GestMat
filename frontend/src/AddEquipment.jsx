import React, { useState } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';

function AddEquipment({ onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    type: '',
    totalQty: 0,
    availableQty: 0,
    condition: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = ['totalQty', 'availableQty'].includes(name)
      ? value === ''
        ? ''
        : Number(value)
      : value;
    setForm({ ...form, [name]: parsed });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        totalQty: Number(form.totalQty) || 0,
        availableQty: Number(form.availableQty) || 0,
      };
      await api('/equipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({
        name: '',
        type: '',
        totalQty: 0,
        availableQty: 0,
        condition: '',
      });
      setError('');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message || t('equipments.add.error_create'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4" aria-labelledby="add-equip-title">
      <h2 id="add-equip-title">{t('equipments.add.title')}</h2>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-name">{t('equipments.add.name')}</label>
        <input
          id="eq-name"
          name="name"
          className="form-control"
          aria-label={t('equipments.add.name')}
          value={form.name}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-type">{t('equipments.add.type')}</label>
        <select
          id="eq-type"
          name="type"
          className="form-select"
          aria-label={t('equipments.add.type')}
          value={form.type}
          onChange={handleChange}
        >
          <option value="">{t('common.choose')}</option>
          <option value="Son">{t('equipments.add.types.sound')}</option>
          <option value="Lumi\u00e8re">{t('equipments.add.types.light')}</option>
          <option value="Plateau">{t('equipments.add.types.stage')}</option>
          <option value="Vid\u00e9o">{t('equipments.add.types.video')}</option>
          <option value="Autre">{t('equipments.add.types.other')}</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-total">{t('equipments.add.total_quantity')}</label>
        <input
          id="eq-total"
          name="totalQty"
          type="number"
          className="form-control"
          aria-label={t('equipments.add.total_quantity')}
          value={form.totalQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-available">{t('equipments.add.available_quantity')}</label>
        <input
          id="eq-available"
          name="availableQty"
          type="number"
          className="form-control"
          aria-label={t('equipments.add.available_quantity')}
          value={form.availableQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-condition">{t('equipments.add.condition')}</label>
        <select
          id="eq-condition"
          name="condition"
          className="form-select"
          aria-label={t('equipments.add.condition')}
          value={form.condition}
          onChange={handleChange}
        >
          <option value="">{t('common.choose')}</option>
          <option value="Neuf">{t('equipments.add.conditions.new')}</option>
          <option value="L\u00e9g\u00e8rement us\u00e9">{t('equipments.add.conditions.used_lightly')}</option>
          <option value="Us\u00e9">{t('equipments.add.conditions.used')}</option>
          <option value="Tr\u00e8s us\u00e9">{t('equipments.add.conditions.very_used')}</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary mt-2">{t('equipments.add.submit')}</button>
    </form>
  );
}

export default AddEquipment;

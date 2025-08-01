import React, { useEffect, useState, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';
import { GlobalContext } from './GlobalContext.jsx';
import { useTranslation } from 'react-i18next';

function Loans() {
  const { t } = useTranslation();
  const { structures } = useContext(GlobalContext);
  const [loans, setLoans] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [form, setForm] = useState({
    owner: '',
    equipment: '',
    quantity: 1,
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api('/loans')
      .then(setLoans)
      .catch(() => setLoans([]));
    api('/equipments?all=true')
      .then(setEquipments)
      .catch(() => setEquipments([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
  };

  const createLoan = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!form.owner) fieldErrors.owner = t('common.required');
    if (!form.equipment) fieldErrors.equipment = t('common.required');
    if (!form.quantity) fieldErrors.quantity = t('common.required');
    if (!form.startDate) fieldErrors.startDate = t('common.required');
    if (!form.endDate) fieldErrors.endDate = t('common.required');
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setError(t('common.error'));
      return;
    }
    const payload = {
      owner: form.owner,
      items: [{ equipment: form.equipment, quantity: Number(form.quantity) }],
      startDate: form.startDate,
      endDate: form.endDate,
    };
    try {
      await api('/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({ owner: '', equipment: '', quantity: 1, startDate: '', endDate: '' });
      setError('');
      setErrors({});
      api('/loans').then(setLoans);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message || t('loans.error_create'));
    }
  };

  const updateStatus = async (id, status) => {
    await api(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    api('/loans').then(setLoans);
  };

  return (
    <div className="container">
      <NavBar />
      <h1>{t('loans.title')}</h1>
      <Alert message={error} />
      <form onSubmit={createLoan} className="mt-3 row g-2">
        <h2>{t('loans.new_request')}</h2>
        <div className="col-md">
          <select
            name="owner"
            className={`form-select${errors.owner ? ' is-invalid' : ''}`}
            value={form.owner}
            onChange={handleChange}
            aria-invalid={errors.owner ? 'true' : undefined}
            aria-describedby={errors.owner ? 'owner-error' : undefined}
          >
            <option value="">{t('loans.owner_structure')}</option>
            {structures.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          {errors.owner && (
            <div
              className="invalid-feedback"
              id="owner-error"
              role="alert"
              aria-live="polite"
            >
              {errors.owner}
            </div>
          )}
        </div>
        <div className="col-md">
          <select
            name="equipment"
            className={`form-select${errors.equipment ? ' is-invalid' : ''}`}
            value={form.equipment}
            onChange={handleChange}
            aria-invalid={errors.equipment ? 'true' : undefined}
            aria-describedby={errors.equipment ? 'equipment-error' : undefined}
          >
            <option value="">{t('loans.equipment_option')}</option>
            {equipments.map((e) => (
              <option key={e._id} value={e._id}>
                {e.name}
              </option>
            ))}
          </select>
          {errors.equipment && (
            <div
              className="invalid-feedback"
              id="equipment-error"
              role="alert"
              aria-live="polite"
            >
              {errors.equipment}
            </div>
          )}
        </div>
        <div className="col-md">
          <input
            name="quantity"
            type="number"
            className={`form-control${errors.quantity ? ' is-invalid' : ''}`}
            value={form.quantity}
            onChange={handleChange}
            aria-invalid={errors.quantity ? 'true' : undefined}
            aria-describedby={errors.quantity ? 'quantity-error' : undefined}
          />
          {errors.quantity && (
            <div
              className="invalid-feedback"
              id="quantity-error"
              role="alert"
              aria-live="polite"
            >
              {errors.quantity}
            </div>
          )}
        </div>
        <div className="col-md">
          <input
            name="startDate"
            type="date"
            className={`form-control${errors.startDate ? ' is-invalid' : ''}`}
            value={form.startDate}
            onChange={handleChange}
            aria-invalid={errors.startDate ? 'true' : undefined}
            aria-describedby={errors.startDate ? 'startDate-error' : undefined}
          />
          {errors.startDate && (
            <div
              className="invalid-feedback"
              id="startDate-error"
              role="alert"
              aria-live="polite"
            >
              {errors.startDate}
            </div>
          )}
        </div>
        <div className="col-md">
          <input
            name="endDate"
            type="date"
            className={`form-control${errors.endDate ? ' is-invalid' : ''}`}
            value={form.endDate}
            onChange={handleChange}
            aria-invalid={errors.endDate ? 'true' : undefined}
            aria-describedby={errors.endDate ? 'endDate-error' : undefined}
          />
          {errors.endDate && (
            <div
              className="invalid-feedback"
              id="endDate-error"
              role="alert"
              aria-live="polite"
            >
              {errors.endDate}
            </div>
          )}
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">{t('loans.send')}</button>
        </div>
      </form>
      <ul className="list-group mt-4">
        {loans.map((l) => (
          <li key={l._id} className="list-group-item">
            {l.owner?.name} → {l.borrower?.name} :
            {l.items?.map((it) =>
              it.equipment ? ` ${it.equipment.name} x${it.quantity}` : ''
            )}{' '}
            [{l.status}]
            {l.status === 'pending' && (
              <>
                <button
                  onClick={() => updateStatus(l._id, 'accepted')}
                  className="btn btn-success btn-sm ms-2"
                >
                  {t('loans.accept')}
                </button>
                <button
                  onClick={() => updateStatus(l._id, 'refused')}
                  className="btn btn-danger btn-sm ms-2"
                >
                  {t('loans.refuse')}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Loans;

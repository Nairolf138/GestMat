import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import Alert from '../Alert.jsx';
import Loading from '../Loading.jsx';
import { GlobalContext } from '../GlobalContext.jsx';
import { AuthContext } from '../AuthContext.jsx';

function NewLoan() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { structures } = useContext(GlobalContext);
  const { user } = useContext(AuthContext);

  const today = useMemo(() => new Date(), []);
  const defaultStart = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );
  const defaultEnd = useMemo(
    () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    [],
  );

  const [form, setForm] = useState({
    borrower: '',
    owner: '',
    equipment: '',
    quantity: 1,
    startDate: defaultStart,
    endDate: defaultEnd,
    note: '',
  });
  const [equipments, setEquipments] = useState([]);
  const [loadingEquipments, setLoadingEquipments] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!form.borrower && user) {
      const borrowerId = user.structure?._id || user.structure;
      if (borrowerId) {
        setForm((prev) => ({ ...prev, borrower: borrowerId }));
      }
    }
  }, [form.borrower, user]);

  const fetchEquipments = useCallback(async () => {
    const params = new URLSearchParams({ catalog: 'true' });
    if (form.owner) params.set('structure', form.owner);
    if (form.startDate) params.set('startDate', form.startDate);
    if (form.endDate) params.set('endDate', form.endDate);

    setLoadingEquipments(true);
    try {
      const data = await api(`/equipments?${params.toString()}`);
      setEquipments(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setEquipments([]);
      setError(err.message || t('common.error'));
    } finally {
      setLoadingEquipments(false);
    }
  }, [form.endDate, form.owner, form.startDate, t]);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  const selectedEquipment = useMemo(
    () => equipments.find((eq) => eq._id === form.equipment),
    [equipments, form.equipment],
  );

  useEffect(() => {
    if (!selectedEquipment) return;
    const eqOwner =
      typeof selectedEquipment.structure === 'string'
        ? selectedEquipment.structure
        : selectedEquipment.structure?._id;
    if (eqOwner && eqOwner !== form.owner) {
      setForm((prev) => ({ ...prev, owner: eqOwner }));
    }
  }, [form.owner, selectedEquipment]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const quantity = Number(form.quantity) || 0;
    const ownerId =
      form.owner ||
      (typeof selectedEquipment?.structure === 'string'
        ? selectedEquipment?.structure
        : selectedEquipment?.structure?._id);

    if (
      !form.borrower ||
      !ownerId ||
      !form.equipment ||
      !form.startDate ||
      !form.endDate ||
      quantity <= 0
    ) {
      setError(t('loans.new.missing_fields'));
      return;
    }

    if (new Date(form.startDate) > new Date(form.endDate)) {
      setError(t('loans.new.invalid_dates'));
      return;
    }

    const payload = {
      owner: ownerId,
      borrower: form.borrower,
      items: [
        {
          equipment: form.equipment,
          quantity,
        },
      ],
      startDate: form.startDate,
      endDate: form.endDate,
      note: form.note,
    };

    setSubmitting(true);
    try {
      const created = await api('/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSuccess(t('loans.new.success'));
      const target = created?._id ? `/loans/${created._id}` : '/loans';
      navigate(target);
    } catch (err) {
      setError(err.message || t('loans.error_create'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStructureOptions = () =>
    structures.map((structure) => (
      <option key={structure._id} value={structure._id}>
        {structure.name || structure.label}
      </option>
    ));

  return (
    <>
      <h1 className="h1 mb-4">{t('loans.new.title')}</h1>
      <p className="text-muted">{t('loans.new.description')}</p>

      <Alert message={error} onClose={() => setError('')} />
      <Alert
        message={success}
        type="success"
        onClose={() => setSuccess('')}
      />

      <form className="card p-4" onSubmit={handleSubmit}>
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label" htmlFor="borrower-structure">
              {t('loans.new.borrower_structure')}
            </label>
            <select
              id="borrower-structure"
              className="form-select"
              value={form.borrower}
              onChange={(e) => updateField('borrower', e.target.value)}
              required
            >
              <option value="">{t('common.choose')}</option>
              {renderStructureOptions()}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="owner-structure">
              {t('loans.new.owner_structure')}
            </label>
            <select
              id="owner-structure"
              className="form-select"
              value={form.owner}
              onChange={(e) => updateField('owner', e.target.value)}
            >
              <option value="">{t('common.choose')}</option>
              {renderStructureOptions()}
            </select>
          </div>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-md-8">
            <label className="form-label" htmlFor="equipment">
              {t('loans.new.equipment_label')}
            </label>
            {loadingEquipments ? (
              <div className="d-flex align-items-center">
                <Loading />
              </div>
            ) : (
              <select
                id="equipment"
                className="form-select"
                value={form.equipment}
                onChange={(e) => updateField('equipment', e.target.value)}
                required
              >
                <option value="">{t('loans.new.equipment_placeholder')}</option>
                {equipments.map((eq) => {
                  const structureName =
                    typeof eq.structure === 'string'
                      ? ''
                      : eq.structure?.name || eq.structure?.label || '';
                  const availability = eq.availability
                    ? ` - ${eq.availability}`
                    : '';
                  return (
                    <option key={eq._id} value={eq._id}>
                      {eq.name}
                      {structureName ? ` • ${structureName}` : ''}
                      {availability}
                    </option>
                  );
                })}
              </select>
            )}
            {!loadingEquipments && !equipments.length && (
              <p className="text-muted small mt-1">
                {t('loans.new.equipment_empty')}
              </p>
            )}
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="quantity">
              {t('loans.new.quantity')}
            </label>
            <input
              id="quantity"
              type="number"
              min="1"
              className="form-control"
              value={form.quantity}
              onChange={(e) => updateField('quantity', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="row g-3 mt-2">
          <div className="col-md-6">
            <label className="form-label" htmlFor="start-date">
              {t('loans.new.start_date')}
            </label>
            <input
              id="start-date"
              type="date"
              className="form-control"
              min={today.toISOString().slice(0, 10)}
              value={form.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="end-date">
              {t('loans.new.end_date')}
            </label>
            <input
              id="end-date"
              type="date"
              className="form-control"
              min={form.startDate || today.toISOString().slice(0, 10)}
              value={form.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="mt-3">
          <label className="form-label" htmlFor="note">
            {t('loans.new.note_label')}
          </label>
          <textarea
            id="note"
            className="form-control"
            maxLength={500}
            placeholder={t('loans.new.note_placeholder')}
            value={form.note}
            onChange={(e) => updateField('note', e.target.value)}
          />
          <small className="text-muted">
            {t('loans.new.note_help')}
          </small>
        </div>

        <div className="d-flex gap-3 mt-4">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => navigate('/loans')}
          >
            {t('loans.new.back')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? t('common.loading') : t('loans.new.submit')}
          </button>
        </div>
      </form>
    </>
  );
}

export default NewLoan;

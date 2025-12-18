import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { confirmDialog } from '../utils';
import Alert from '../Alert.jsx';

const TYPE_OPTIONS = [
  { value: 'Son', labelKey: 'equipments.add.types.sound' },
  { value: 'Lumière', labelKey: 'equipments.add.types.light' },
  { value: 'Plateau', labelKey: 'equipments.add.types.stage' },
  { value: 'Vidéo', labelKey: 'equipments.add.types.video' },
  { value: 'Autre', labelKey: 'equipments.add.types.other' },
];

const CONDITION_OPTIONS = [
  { value: 'Neuf', labelKey: 'equipments.add.conditions.new' },
  {
    value: 'Légèrement usé',
    labelKey: 'equipments.add.conditions.used_lightly',
  },
  { value: 'Usé', labelKey: 'equipments.add.conditions.used' },
  { value: 'Très usé', labelKey: 'equipments.add.conditions.very_used' },
];

const STATUS_OPTIONS = [
  { value: 'Disponible', labelKey: 'equipments.status.available' },
  { value: 'HS', labelKey: 'equipments.status.unusable' },
  { value: 'En maintenance', labelKey: 'equipments.status.maintenance' },
];

const createEmptyFormState = () => ({
  name: '',
  type: '',
  location: '',
  totalQty: '',
  availableQty: '',
  condition: '',
  status: 'Disponible',
});

const parseAvailability = (value) => {
  if (typeof value !== 'string') {
    return { available: undefined, total: undefined };
  }
  const [availablePart, totalPart] = value.split('/');
  const available = Number(availablePart);
  const total = Number(totalPart);
  return {
    available: Number.isFinite(available) ? available : undefined,
    total: Number.isFinite(total) ? total : undefined,
  };
};

function ManageInventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(createEmptyFormState);
  const [filters, setFilters] = useState({ name: '', type: '', location: '' });
  const [structures, setStructures] = useState([]);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState(createEmptyFormState);

  const conditionLabels = useMemo(
    () =>
      CONDITION_OPTIONS.reduce((acc, option) => {
        acc[option.value] = t(option.labelKey);
        return acc;
      }, {}),
    [t],
  );

  const statusLabels = useMemo(
    () =>
      STATUS_OPTIONS.reduce((acc, option) => {
        acc[option.value] = t(option.labelKey);
        return acc;
      }, {}),
    [t],
  );

  const normalizeEquipment = (item) => {
    const parsed = parseAvailability(item.availability);
    const totalQty = item.totalQty ?? parsed.total;
    const availableBase = item.availableQty ?? parsed.available;
    const availableQty =
      availableBase !== undefined
        ? availableBase
        : totalQty !== undefined
        ? totalQty
        : undefined;
    const availability =
      availableQty !== undefined && totalQty !== undefined
        ? `${availableQty}/${totalQty}`
        : item.availability || '';
    const structureName =
      typeof item.structure === 'object' && item.structure?.name
        ? item.structure.name
        : '';
    const location = item.location || structureName || '';
    return {
      ...item,
      availableQty,
      totalQty,
      availability,
      location,
      status: item.status || 'Disponible',
    };
  };

  const load = useCallback(() => {
    setError('');
    const params = new URLSearchParams({
      search: filters.name,
      type: filters.type,
      location: filters.location,
      page: String(page),
      limit: String(limit),
    });
    api(`/equipments?${params.toString()}`)
      .then((data) => setItems(data.map((item) => normalizeEquipment(item))))
      .catch((err) => {
        setError(err.message);
        setItems([]);
      });
  }, [filters, limit, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api('/structures')
      .then((fetchedStructures) => setStructures(fetchedStructures || []))
      .catch(() => setStructures([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setPage(1), 500);
    return () => clearTimeout(timeout);
  }, [filters]);

  const doSearch = () => {
    if (page !== 1) setPage(1);
    else load();
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const totalQty = Number(form.totalQty);
      if (!Number.isFinite(totalQty)) {
        setError(t('inventory.error_invalid_total'));
        return;
      }
      const payload = {
        name: form.name,
        type: form.type,
        location: form.location,
        totalQty,
        condition: form.condition,
        status: form.status || 'Disponible',
      };
      if (form.availableQty !== '') {
        const availableQty = Number(form.availableQty);
        if (!Number.isFinite(availableQty)) {
          setError(t('inventory.error_invalid_available'));
          return;
        }
        if (availableQty > totalQty) {
          setError(t('inventory.error_available_exceeds_total'));
          return;
        }
        payload.availableQty = availableQty;
      }
      await api('/equipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm(createEmptyFormState());
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (it) => {
    setEditing(it._id);
    const normalized = normalizeEquipment(it);
    setEditForm({
      name: normalized.name || '',
      type: normalized.type || '',
      location: normalized.location || '',
      totalQty:
        normalized.totalQty === undefined || normalized.totalQty === null
          ? ''
          : String(normalized.totalQty),
      availableQty:
        normalized.availableQty === undefined || normalized.availableQty === null
          ? ''
          : String(normalized.availableQty),
      condition: normalized.condition || '',
      status: normalized.status || 'Disponible',
    });
  };

  const save = async (id) => {
    setError('');
    try {
      const payload = {
        name: editForm.name,
        type: editForm.type,
        location: editForm.location,
      };
      if (editForm.totalQty !== '') {
        const totalQty = Number(editForm.totalQty);
        if (!Number.isFinite(totalQty)) {
          setError(t('inventory.error_invalid_total'));
          return;
        }
        payload.totalQty = totalQty;
      }
      let availableQty;
      if (editForm.availableQty !== '') {
        availableQty = Number(editForm.availableQty);
        if (!Number.isFinite(availableQty)) {
          setError(t('inventory.error_invalid_available'));
          return;
        }
        payload.availableQty = availableQty;
      }
      const conditionValue = editForm.condition;
      if (conditionValue) {
        payload.condition = conditionValue;
      }
      const statusValue = editForm.status;
      if (statusValue) {
        payload.status = statusValue;
      }
      if (
        payload.totalQty !== undefined &&
        availableQty !== undefined &&
        availableQty > payload.totalQty
      ) {
        setError(t('inventory.error_available_exceeds_total'));
        return;
      }
      await api(`/equipments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    setError('');
    setMessage('');
    if (!confirmDialog(t('inventory.delete_confirm'))) return;
    try {
      await api(`/equipments/${id}`, { method: 'DELETE' });
      setMessage(t('inventory.delete_success'));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <Alert
        message={error}
        autoHideDuration={false}
        onClose={() => setError('')}
      />
      <Alert
        type="success"
        message={message}
        onClose={() => setMessage('')}
      />
      <form className="row g-2 mb-3" onSubmit={create}>
        <div className="col-md">
          <input
            className="form-control"
            placeholder={t('inventory.name')}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">{t('common.choose')}</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          >
            <option value="">{t('common.choose')}</option>
            {structures.map((structure) => (
              <option key={structure._id} value={structure.name}>
                {structure.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md">
          <input
            type="number"
            className="form-control"
            placeholder={t('inventory.total_quantity')}
            value={form.totalQty}
            min="0"
            required
            onChange={(e) => setForm({ ...form, totalQty: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            type="number"
            className="form-control"
            placeholder={t('inventory.available_quantity')}
            value={form.availableQty}
            min="0"
            max={form.totalQty || undefined}
            onChange={(e) => setForm({ ...form, availableQty: e.target.value })}
          />
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={form.condition}
            required
            onChange={(e) => setForm({ ...form, condition: e.target.value })}
          >
            <option value="">{t('common.choose')}</option>
            {CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={form.status}
            required
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-auto">
          <button className="btn btn-primary" type="submit">
            {t('inventory.add')}
          </button>
        </div>
      </form>
      <div className="row g-2 mb-3">
        <div className="col-md">
          <input
            className="form-control"
            placeholder={t('inventory.name')}
            value={filters.name}
            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
          />
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">{t('common.choose')}</option>
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {t(option.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md">
          <select
            className="form-select"
            value={filters.location}
            onChange={(e) =>
              setFilters({ ...filters, location: e.target.value })
            }
          >
            <option value="">{t('common.choose')}</option>
            {structures.map((structure) => (
              <option key={structure._id} value={structure.name}>
                {structure.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-auto">
          <button className="btn btn-primary" type="button" onClick={doSearch}>
            {t('inventory.search')}
          </button>
        </div>
      </div>
      <ul className="list-group">
        {items.map((it) => (
          <li key={it._id} className="list-group-item">
            {editing === it._id ? (
              <>
                <input
                  className="form-control mb-2"
                  placeholder={t('inventory.name')}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
                <select
                  className="form-select mb-2"
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value })
                  }
                >
                  <option value="">{t('common.choose')}</option>
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select mb-2"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                >
                  <option value="">{t('common.choose')}</option>
                  {structures.map((structure) => (
                    <option key={structure._id} value={structure.name}>
                      {structure.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  className="form-control mb-2"
                  placeholder={t('inventory.total_quantity')}
                  value={editForm.totalQty}
                  min="0"
                  onChange={(e) =>
                    setEditForm({ ...editForm, totalQty: e.target.value })
                  }
                />
                <input
                  type="number"
                  className="form-control mb-2"
                  placeholder={t('inventory.available_quantity')}
                  value={editForm.availableQty}
                  min="0"
                  max={editForm.totalQty || undefined}
                  onChange={(e) =>
                    setEditForm({ ...editForm, availableQty: e.target.value })
                  }
                />
                <select
                  className="form-select mb-2"
                  value={editForm.condition}
                  onChange={(e) =>
                    setEditForm({ ...editForm, condition: e.target.value })
                  }
                  required
                >
                  <option value="">{t('common.choose')}</option>
                  {CONDITION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select mb-2"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, status: e.target.value })
                  }
                  required
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.labelKey)}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => save(it._id)}
                >
                  {t('inventory.save')}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditing(null)}
                >
                  {t('inventory.cancel')}
                </button>
              </>
            ) : (
              <>
                <div className="fw-semibold">
                  {it.name}
                  {it.type ? ` - ${it.type}` : ''}
                  {it.location ? ` - ${it.location}` : ''}
                </div>
                <div className="small text-muted">
                  {[
                    `${t('inventory.total_quantity')}: ${
                      it.totalQty ?? '-'
                    }`,
                    `${t('inventory.availability')}: ${
                      it.availability || '-'
                    }`,
                    it.availableQty !== undefined && it.availableQty !== null
                      ? `${t('inventory.available_quantity')}: ${it.availableQty}`
                      : null,
                    it.condition
                      ? `${t('inventory.condition')}: ${
                          conditionLabels[it.condition] || it.condition
                        }`
                      : null,
                    it.status
                      ? `${t('inventory.status')}: ${
                          statusLabels[it.status] || it.status
                        }`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
                <button
                  className="btn btn-sm btn-secondary float-end ms-2"
                  onClick={() => startEdit(it)}
                >
                  {t('inventory.edit')}
                </button>
                <button
                  className="btn btn-sm btn-danger float-end"
                  onClick={() => remove(it._id)}
                >
                  {t('inventory.delete')}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        <button
          className="btn btn-secondary me-2"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
        >
          {t('inventory.previous')}
        </button>
        <button
          className="btn btn-secondary"
          disabled={items.length < limit}
          onClick={() => setPage(page + 1)}
        >
          {t('inventory.next')}
        </button>
      </div>
    </div>
  );
}

export default ManageInventory;

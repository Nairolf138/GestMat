import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { confirmDialog } from '../utils';

function ManageInventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    availability: '',
  });
  const [filters, setFilters] = useState({ name: '', type: '', location: '' });
  const [page, setPage] = useState(1);
  const limit = 10;
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    location: '',
    availability: '',
  });

  const load = () => {
    setError('');
    const params = new URLSearchParams({
      search: filters.name,
      type: filters.type,
      location: filters.location,
      page: String(page),
      limit: String(limit),
    });
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch((err) => {
        setError(err.message);
        setItems([]);
      });
  };

  useEffect(() => {
    load();
  }, [page]);

  const doSearch = () => {
    setPage(1);
    load();
  };

  const create = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/equipments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ name: '', type: '', location: '', availability: '' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (it) => {
    setEditing(it._id);
    setEditForm({
      name: it.name || '',
      type: it.type || '',
      location: it.location || '',
      availability: it.availability || '',
    });
  };

  const save = async (id) => {
    setError('');
    try {
      await api(`/equipments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm),
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
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
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
          <input
            className="form-control"
            placeholder={t('inventory.type')}
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder={t('inventory.location')}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder={t('inventory.availability')}
            value={form.availability}
            onChange={(e) => setForm({ ...form, availability: e.target.value })}
          />
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
          <input
            className="form-control"
            placeholder={t('inventory.type')}
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder={t('inventory.location')}
            value={filters.location}
            onChange={(e) =>
              setFilters({ ...filters, location: e.target.value })
            }
          />
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
                <input
                  className="form-control mb-2"
                  placeholder={t('inventory.type')}
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder={t('inventory.location')}
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder={t('inventory.availability')}
                  value={editForm.availability}
                  onChange={(e) =>
                    setEditForm({ ...editForm, availability: e.target.value })
                  }
                />
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
                {it.name} - {it.type} - {it.location} - {it.availability}
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


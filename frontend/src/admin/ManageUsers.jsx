import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import { confirmDialog } from '../utils';

const roleKey = (r) => r.toLowerCase().replace(/\s+/g, '_');

function ManageUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    role: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = useCallback(() => {
    setError('');
    api(
      `/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`,
    )
      .then(setUsers)
      .catch((err) => {
        setError(err.message);
        setUsers([]);
      });
  }, [limit, page, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api('/roles')
      .then(setRoles)
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (page !== 1) setPage(1);
      else load();
    }, 500);
    return () => clearTimeout(timeout);
  }, [load, page, search]);

  const doSearch = () => {
    if (page !== 1) setPage(1);
    else load();
  };

  const del = async (id) => {
    setError('');
    setMessage('');
    if (!confirmDialog(t('users.delete_confirm'))) return;
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
      setMessage(t('users.delete_success'));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (u) => {
    setEditing(u._id);
    setForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      role: u.role || roles[0] || '',
    });
  };

  const save = async (id) => {
    setError('');
    try {
      await api(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}
      <div className="input-group mb-3">
        <input
          className="form-control"
          placeholder={t('users.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn btn-primary" onClick={doSearch}>
          {t('users.search')}
        </button>
      </div>
      <ul className="list-group">
        {users.map((u) => (
          <li key={u._id} className="list-group-item">
            {editing === u._id ? (
              <>
                <input
                  className="form-control mb-2"
                  placeholder={t('users.first_name')}
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder={t('users.last_name')}
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                />
                <select
                  className="form-select mb-2"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {t(`users.role_${roleKey(r)}`)}
                    </option>
                  ))}
                </select>
                <button
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => save(u._id)}
                >
                  {t('users.save')}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditing(null)}
                >
                  {t('users.cancel')}
                </button>
              </>
            ) : (
              <>
                {u.username}
                {u.firstName || u.lastName
                  ? ` - ${u.firstName || ''} ${u.lastName || ''}`
                  : ''}
                {' - ' + t(`users.role_${roleKey(u.role)}`)}
                <button
                  className="btn btn-sm btn-secondary float-end ms-2"
                  onClick={() => startEdit(u)}
                >
                  {t('users.edit')}
                </button>
                <button
                  className="btn btn-sm btn-danger float-end"
                  onClick={() => del(u._id)}
                >
                  {t('users.delete')}
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
          {t('users.previous')}
        </button>
        <button
          className="btn btn-secondary"
          disabled={users.length < limit}
          onClick={() => setPage(page + 1)}
        >
          {t('users.next')}
        </button>
      </div>
    </div>
  );
}

export default ManageUsers;

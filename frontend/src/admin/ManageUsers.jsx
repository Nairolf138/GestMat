import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useTranslation } from 'react-i18next';
import { confirmDialog } from '../utils';
import Alert from '../Alert.jsx';
import { normalizeRoleTranslationKey } from '../../roles';

const normalizeRoleValue = (role = '') => {
  const cleanedRole = role
    .replace(/^(role[_-]?|ROLE[_-]?)/i, '')
    .replace(/[_-]+/g, ' ')
    .trim();
  return (
    normalizeRoleTranslationKey(cleanedRole) ||
    normalizeRoleTranslationKey(role) ||
    cleanedRole ||
    role
  );
};

const roleKey = (r) => normalizeRoleValue(r).toLowerCase().replace(/\s+/g, '_');

const roleTranslationKey = (role) => {
  const normalizedRole = normalizeRoleValue(role);
  return normalizedRole ? `users.role_${roleKey(normalizedRole)}` : 'users.role';
};

function ManageUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [structures, setStructures] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    structure: '',
    role: '',
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    structure: '',
    role: '',
    password: '',
    passwordConfirm: '',
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
      .then((fetchedRoles) => {
        const normalizedRoles = Array.from(
          new Set((fetchedRoles || []).map(normalizeRoleValue).filter(Boolean)),
        );
        setRoles(normalizedRoles);
      })
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    api('/structures')
      .then((fetchedStructures) => setStructures(fetchedStructures || []))
      .catch(() => setStructures([]));
  }, []);

  useEffect(() => {
    setNewUserForm((prev) => ({
      ...prev,
      structure: prev.structure || structures[0]?._id || '',
    }));
  }, [structures]);

  useEffect(() => {
    setNewUserForm((prev) => ({
      ...prev,
      role: prev.role || roles[0] || '',
    }));
  }, [roles]);

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
      username: u.username || '',
      email: u.email || '',
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      structure:
        (u.structure && typeof u.structure === 'object'
          ? u.structure?._id
          : u.structure) || '',
      role: normalizeRoleValue(u.role || roles[0] || ''),
    });
  };

  const save = async (id) => {
    setError('');
    try {
      await api(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          role: normalizeRoleValue(form.role),
        }),
      });
      setEditing(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetNewUserForm = useCallback(
    () =>
      setNewUserForm({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        structure: structures[0]?._id || '',
        role: roles[0] || '',
        password: '',
        passwordConfirm: '',
      }),
    [roles, structures],
  );

  const toggleCreateForm = () => {
    if (!showCreateForm) {
      resetNewUserForm();
    }
    setShowCreateForm((prev) => !prev);
  };

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const requiredFields = [
      'username',
      'firstName',
      'lastName',
      'email',
      'structure',
      'role',
      'password',
    ];

    const missingField = requiredFields.find((field) => !newUserForm[field]);
    if (missingField) {
      setError(t('users.field_required'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserForm.email)) {
      setError(t('users.invalid_email'));
      return;
    }

    if (newUserForm.password !== newUserForm.passwordConfirm) {
      setError(t('users.password_mismatch'));
      return;
    }

    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUserForm.username,
          email: newUserForm.email,
          firstName: newUserForm.firstName,
          lastName: newUserForm.lastName,
          structure: newUserForm.structure,
          role: normalizeRoleValue(newUserForm.role),
          password: newUserForm.password,
        }),
      });
      setMessage(t('users.create_success'));
      resetNewUserForm();
      setShowCreateForm(false);
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">{t('users.list')}</h4>
        <button className="btn btn-success" onClick={toggleCreateForm}>
          {showCreateForm ? t('users.cancel') : t('users.new_user')}
        </button>
      </div>

      {showCreateForm && (
        <form className="card mb-3" onSubmit={createUser}>
          <div className="card-body">
            <div className="row g-3 mb-2">
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder={t('users.username')}
                  value={newUserForm.username}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, username: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder={t('users.first_name')}
                  value={newUserForm.firstName}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, firstName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-4">
                <input
                  className="form-control"
                  placeholder={t('users.last_name')}
                  value={newUserForm.lastName}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, lastName: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="row g-3 mb-2">
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder={t('users.email')}
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={newUserForm.structure}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, structure: e.target.value })
                  }
                  required
                >
                  <option value="">{t('users.select_structure')}</option>
                  {structures.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, role: e.target.value })
                  }
                  required
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {t(roleTranslationKey(r), {
                        defaultValue: normalizeRoleValue(r),
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder={t('users.password')}
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm({ ...newUserForm, password: e.target.value })
                  }
                  required
                />
              </div>
              <div className="col-md-6">
                <input
                  className="form-control"
                  placeholder={t('users.password_confirm')}
                  type="password"
                  value={newUserForm.passwordConfirm}
                  onChange={(e) =>
                    setNewUserForm({
                      ...newUserForm,
                      passwordConfirm: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="d-flex justify-content-end gap-2">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={toggleCreateForm}
              >
                {t('users.cancel')}
              </button>
              <button className="btn btn-primary" type="submit">
                {t('users.create')}
              </button>
            </div>
          </div>
        </form>
      )}

      <ul className="list-group">
        {users.map((u) => (
          <li key={u._id} className="list-group-item">
            {editing === u._id ? (
              <>
                <input
                  className="form-control mb-2"
                  placeholder={t('users.username')}
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                <input
                  className="form-control mb-2"
                  placeholder={t('users.email')}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
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
                  value={form.structure}
                  onChange={(e) => setForm({ ...form, structure: e.target.value })}
                >
                  <option value="">{t('users.select_structure')}</option>
                  {structures.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select mb-2"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {t(roleTranslationKey(r), {
                        defaultValue: normalizeRoleValue(r),
                      })}
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
                {' - ' +
                  t(roleTranslationKey(u.role), {
                    defaultValue: normalizeRoleValue(u.role),
                  })}
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


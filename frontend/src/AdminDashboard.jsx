import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import AdminStats from './AdminStats';
import { useTranslation } from 'react-i18next';

function ManageUsers() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', role: 'user' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  const load = () => {
    setError('');
    api(`/users?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}`)
      .then(setUsers)
      .catch((err) => {
        setError(err.message);
        setUsers([]);
      });
  };

  useEffect(() => {
    load();
  }, [page]);

  const doSearch = () => {
    setPage(1);
    load();
  };

  const del = async (id) => {
    setError('');
    try {
      await api(`/users/${id}`, { method: 'DELETE' });
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
      role: u.role || 'user',
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
                  placeholder="First name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
                <input
                  className="form-control mb-2"
                  placeholder="Last name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
                <select
                  className="form-select mb-2"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => save(u._id)}
                >
                  Save
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {u.username}
                {u.firstName || u.lastName ? ` - ${u.firstName || ''} ${u.lastName || ''}` : ''}
                {' - ' + u.role}
                <button
                  className="btn btn-sm btn-secondary float-end ms-2"
                  onClick={() => startEdit(u)}
                >
                  Edit
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

function ManageLoans() {
  const [loans, setLoans] = useState([]);
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api('/loans')
      .then(setLoans)
      .catch((err) => {
        setError(err.message);
        setLoans([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (id, status) => {
    setError('');
    try {
      await api(`/loans/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <ul className="list-group">
        {loans.map((l) => (
          <li key={l._id} className="list-group-item">
            <div>
              <strong>{l.equipment?.name || l.equipment}</strong> -
              {' '}{l.borrower?.name || l.borrower} - {l.status}
            </div>
            <select
              className="form-select w-auto mt-2"
              value={l.status}
              onChange={(e) => update(l._id, e.target.value)}
            >
              <option value="pending">pending</option>
              <option value="approved">approved</option>
              <option value="returned">returned</option>
              <option value="refused">refused</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ManageInventory() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
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
    try {
      await api(`/equipments/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <form className="row g-2 mb-3" onSubmit={create}>
        <div className="col-md">
          <input
            className="form-control"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder="Type"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>
        <div className="col-md">
          <input
            className="form-control"
            placeholder="Availability"
            value={form.availability}
            onChange={(e) =>
              setForm({ ...form, availability: e.target.value })
            }
          />
        </div>
        <div className="col-md-auto">
          <button className="btn btn-primary" type="submit">
            Add
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
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
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
                  placeholder="Name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder="Type"
                  value={editForm.type}
                  onChange={(e) =>
                    setEditForm({ ...editForm, type: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder="Location"
                  value={editForm.location}
                  onChange={(e) =>
                    setEditForm({ ...editForm, location: e.target.value })
                  }
                />
                <input
                  className="form-control mb-2"
                  placeholder="Availability"
                  value={editForm.availability}
                  onChange={(e) =>
                    setEditForm({ ...editForm, availability: e.target.value })
                  }
                />
                <button
                  className="btn btn-primary btn-sm me-2"
                  onClick={() => save(it._id)}
                >
                  Save
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {it.name} - {it.type} - {it.location} - {it.availability}
                <button
                  className="btn btn-sm btn-secondary float-end ms-2"
                  onClick={() => startEdit(it)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-danger float-end"
                  onClick={() => remove(it._id)}
                >
                  Delete
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

function AdminDashboard() {
  const [tab, setTab] = useState('users');

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
      <h1 className="h1">Admin Dashboard</h1>
      <ul className="nav nav-tabs mt-4">
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'users' ? 'active' : ''}`}
            onClick={() => setTab('users')}
          >
            Users
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'loans' ? 'active' : ''}`}
            onClick={() => setTab('loans')}
          >
            Loans
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'inventory' ? 'active' : ''}`}
            onClick={() => setTab('inventory')}
          >
            Inventory
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${tab === 'stats' ? 'active' : ''}`}
            onClick={() => setTab('stats')}
          >
            Statistics
          </button>
        </li>
      </ul>
      <div className="mt-3">
        {tab === 'users' && <ManageUsers />}
        {tab === 'loans' && <ManageLoans />}
        {tab === 'inventory' && <ManageInventory />}
        {tab === 'stats' && <AdminStats />}
      </div>
      </main>
    </div>
  );
}

export default AdminDashboard;


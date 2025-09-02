import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import AdminStats from './AdminStats';

function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', role: 'user' });
  const [error, setError] = useState('');

  const load = () => {
    setError('');
    api('/users')
      .then(setUsers)
      .catch((err) => {
        setError(err.message);
        setUsers([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

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
                  className="btn btn-sm btn-secondary float-end"
                  onClick={() => startEdit(u)}
                >
                  Edit
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
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
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    type: '',
    location: '',
    availability: '',
  });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    type: '',
    location: '',
    availability: '',
  });

  const load = () => {
    setError('');
    api('/equipments')
      .then(setItems)
      .catch((err) => {
        setError(err.message);
        setItems([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

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
    </div>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState('users');

  return (
    <div className="container">
      <NavBar />
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
    </div>
  );
}

export default AdminDashboard;


import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';

function Loans() {
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({
    owner: '',
    equipment: '',
    quantity: 1,
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    api('/loans')
      .then(setLoans)
      .catch(() => setLoans([]));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const createLoan = async (e) => {
    e.preventDefault();
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
      api('/loans').then(setLoans);
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
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
      <h1>Prêts</h1>
      <Alert message={error} />
      <form onSubmit={createLoan} className="mt-3 row g-2">
        <h2>Nouvelle demande</h2>
        <div className="col-md">
          <input
            name="owner"
            placeholder="Structure propriétaire"
            className="form-control"
            value={form.owner}
            onChange={handleChange}
          />
        </div>
        <div className="col-md">
          <input
            name="equipment"
            placeholder="ID équipement"
            className="form-control"
            value={form.equipment}
            onChange={handleChange}
          />
        </div>
        <div className="col-md">
          <input
            name="quantity"
            type="number"
            className="form-control"
            value={form.quantity}
            onChange={handleChange}
          />
        </div>
        <div className="col-md">
          <input
            name="startDate"
            type="date"
            className="form-control"
            value={form.startDate}
            onChange={handleChange}
          />
        </div>
        <div className="col-md">
          <input
            name="endDate"
            type="date"
            className="form-control"
            value={form.endDate}
            onChange={handleChange}
          />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">Envoyer</button>
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
                  Accepter
                </button>
                <button
                  onClick={() => updateStatus(l._id, 'refused')}
                  className="btn btn-danger btn-sm ms-2"
                >
                  Refuser
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

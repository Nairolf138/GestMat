import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';

function Loans() {
  const [loans, setLoans] = useState([]);
  const [form, setForm] = useState({
    owner: '',
    equipment: '',
    quantity: 1,
    startDate: '',
    endDate: '',
  });

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
      api('/loans').then(setLoans);
    } catch {
      // ignore
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
    <div>
      <NavBar />
      <h1>Prêts</h1>
      <form onSubmit={createLoan} className="form">
        <h2>Nouvelle demande</h2>
        <input
          name="owner"
          placeholder="Structure propriétaire"
          value={form.owner}
          onChange={handleChange}
        />
        <input
          name="equipment"
          placeholder="ID équipement"
          value={form.equipment}
          onChange={handleChange}
          className="form-group"
        />
        <input
          name="quantity"
          type="number"
          value={form.quantity}
          onChange={handleChange}
          className="form-group"
        />
        <input
          name="startDate"
          type="date"
          value={form.startDate}
          onChange={handleChange}
          className="form-group"
        />
        <input
          name="endDate"
          type="date"
          value={form.endDate}
          onChange={handleChange}
          className="form-group"
        />
        <button type="submit" className="btn">Envoyer</button>
      </form>
      <ul>
        {loans.map((l) => (
          <li key={l._id}>
            {l.owner?.name} → {l.borrower?.name} :
            {l.items?.map((it) =>
              it.equipment ? ` ${it.equipment.name} x${it.quantity}` : ''
            )}
            {' '}
            [{l.status}]
            {l.status === 'pending' && (
              <>
                <button onClick={() => updateStatus(l._id, 'accepted')} className="btn">Accepter</button>
                <button onClick={() => updateStatus(l._id, 'refused')} className="btn">
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

import React, { useEffect, useState } from 'react';
import { api } from '../api';

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
              <strong>{l.equipment?.name || l.equipment}</strong> -{' '}
              {l.borrower?.name || l.borrower} - {l.status}
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

export default ManageLoans;


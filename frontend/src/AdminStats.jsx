import React, { useEffect, useState } from 'react';
import { api } from './api';

function AdminStats() {
  const [stats, setStats] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api('/stats/loans')
      .then(setStats)
      .catch((err) => {
        setError(err.message);
        setStats([]);
      });
  }, []);

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}
      <ul className="list-group">
        {stats.map((s) => (
          <li key={s._id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{s._id}</span>
            <span className="badge bg-primary rounded-pill">{s.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminStats;

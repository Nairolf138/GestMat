import React, { useEffect, useState } from 'react';
import { api } from './api';

function Loans() {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    api('/loans/open')
      .then(setLoans)
      .catch(() => setLoans([]));
  }, []);

  return (
    <div>
      <h1>Demandes en cours</h1>
      <ul>
        {loans.map((l) => (
          <li key={l._id}>
            {l.borrower?.name} à {l.owner?.name} du {new Date(l.startDate).toLocaleDateString()} au {new Date(l.endDate).toLocaleDateString()} – {l.status}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Loans;

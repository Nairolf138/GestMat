import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';

function Loans() {
  const [loans, setLoans] = useState([]);

  useEffect(() => {
    api('/loans')
      .then(setLoans)
      .catch(() => setLoans([]));
  }, []);

  return (
    <div>
      <NavBar />
      <h1>Prêts</h1>
      <ul>
        {loans.map((l) => (
          <li key={l._id}>
            {l.owner?.name} → {l.borrower?.name} :
            {l.items?.map((it) =>
              it.equipment ? ` ${it.equipment.name} x${it.quantity}` : ''
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Loans;

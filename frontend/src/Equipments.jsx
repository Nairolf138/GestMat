import React, { useEffect, useState } from 'react';
import { api } from './api';

function Equipments() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    api(`/equipments?q=${encodeURIComponent(q)}`)
      .then(setItems)
      .catch(() => setItems([]));
  }, [q]);

  return (
    <div>
      <h1>Équipements</h1>
      <input
        placeholder="Recherche..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul>
        {items.map((e) => (
          <li key={e._id}>{e.name} - {e.availableQty}/{e.totalQty}</li>
        ))}
      </ul>
    </div>
  );
}

export default Equipments;

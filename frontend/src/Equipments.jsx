import React, { useEffect, useState } from 'react';
import { api } from './api';

function Equipments() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    api('/equipments')
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1>Équipements</h1>
      <ul>
        {items.map((e) => (
          <li key={e._id}>{e.name} - {e.availableQty}/{e.totalQty}</li>
        ))}
      </ul>
    </div>
  );
}

export default Equipments;

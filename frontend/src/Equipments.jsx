import React, { useEffect, useState } from 'react';
import { api } from './api';
import AddEquipment from './AddEquipment';

function Equipments() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  const fetchItems = () => {
    api(`/equipments?search=${encodeURIComponent(search)}`)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    fetchItems();
  }, [search]);

  return (
    <div>
      <h1>Équipements</h1>
      <div>
        <input
          placeholder="Recherche"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={fetchItems}>Rechercher</button>
      </div>
      <ul>
        {items.map((e) => (
          <li key={e._id}>{e.name} - {e.availableQty}/{e.totalQty}</li>
        ))}
      </ul>
      <AddEquipment onCreated={fetchItems} />
    </div>
  );
}

export default Equipments;

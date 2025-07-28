import React, { useEffect, useState } from 'react';
import { api } from './api';
import AddEquipment from './AddEquipment';
import NavBar from './NavBar';

function Equipments() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');

  const fetchItems = () => {
    const params = new URLSearchParams({
      search,
      type,
      location,
    });
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    fetchItems();
  }, [search, type, location]);

  return (
    <div>
      <NavBar />
      <h1>Équipements</h1>
      <div className="form">
        <input
          placeholder="Recherche"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          placeholder="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="form-group"
        />
        <input
          placeholder="Emplacement"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="form-group"
        />
        <button onClick={fetchItems} className="btn">
          Rechercher
        </button>
      </div>
      <ul>
        {items.map((e) => (
          <li key={e._id} className="form-group">
            {e.name} ({e.location}) - {e.availableQty}/{e.totalQty}
          </li>
        ))}
      </ul>
      <AddEquipment onCreated={fetchItems} />
    </div>
  );
}

export default Equipments;

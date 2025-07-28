import React, { useEffect, useState } from 'react';
import { api } from './api';
import AddEquipment from './AddEquipment';
import NavBar from './NavBar';

function Equipments() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [structure, setStructure] = useState('');

  const fetchItems = () => {
    const params = new URLSearchParams({
      search,
      type,
      location,
      structure,
    });
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    fetchItems();
  }, [search, type, location, structure]);

  return (
    <div className="container">
      <NavBar />
      <h1>Équipements</h1>
      <div className="row g-2 mb-3">
        <div className="col-md">
          <input
            placeholder="Recherche"
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md">
          <input
            placeholder="Type"
            className="form-control"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
        <div className="col-md">
          <input
            placeholder="Emplacement"
            className="form-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="col-md">
          <input
            placeholder="Structure"
            className="form-control"
            value={structure}
            onChange={(e) => setStructure(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button onClick={fetchItems} className="btn btn-primary">
            Rechercher
          </button>
        </div>
      </div>
      <ul className="list-group mb-4">
        {items.map((e) => (
          <li key={e._id} className="list-group-item">
            {e.name} ({e.location}) - {e.availableQty}/{e.totalQty}
          </li>
        ))}
      </ul>
      <AddEquipment onCreated={fetchItems} />
    </div>
  );
}

export default Equipments;

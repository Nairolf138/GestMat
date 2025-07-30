import React, { useState, useEffect, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { GlobalContext } from './GlobalContext';
import Alert from './Alert.jsx';

function Catalog() {
  const { structures } = useContext(GlobalContext);
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    structure: '',
    startDate: '',
    endDate: '',
  });
  const [error, setError] = useState('');

  const fetchItems = () => {
    const params = new URLSearchParams({
      search: filters.search,
      type: filters.type,
      structure: filters.structure,
      all: 'true',
    });
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    fetchItems();
  }, [filters.search, filters.type, filters.structure]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const addToCart = async (eq) => {
    const qty = Number(prompt('Quantité ?'));
    if (!qty) return;
    if (!filters.startDate || !filters.endDate) {
      setError('Veuillez sélectionner une période');
      return;
    }
    try {
      const res = await api(
        `/equipments/${eq._id}/availability?start=${filters.startDate}&end=${filters.endDate}&quantity=${qty}`
      );
      if (!res.available) {
        setError('Quantité indisponible pour cette période');
        return;
      }
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      cart.push({ equipment: eq, quantity: qty, startDate: filters.startDate, endDate: filters.endDate });
      localStorage.setItem('cart', JSON.stringify(cart));
      setError('');
      alert('Ajouté au panier');
    } catch (err) {
      setError(err.message || 'Erreur');
    }
  };

  return (
    <div className="container">
      <NavBar />
      <h1>Catalogue</h1>
      <Alert message={error} />
      <div className="row g-2 mb-3">
        <div className="col-md">
          <input name="search" placeholder="Recherche" className="form-control" value={filters.search} onChange={handleChange} />
        </div>
        <div className="col-md">
          <input name="type" placeholder="Type" className="form-control" value={filters.type} onChange={handleChange} />
        </div>
        <div className="col-md">
          <select name="structure" className="form-select" value={filters.structure} onChange={handleChange}>
            <option value="">Toutes structures</option>
            {structures.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="col-md">
          <input name="startDate" type="date" className="form-control" value={filters.startDate} onChange={handleChange} />
        </div>
        <div className="col-md">
          <input name="endDate" type="date" className="form-control" value={filters.endDate} onChange={handleChange} />
        </div>
        <div className="col-auto">
          <button onClick={fetchItems} className="btn btn-primary">Rechercher</button>
        </div>
      </div>
      <ul className="list-group">
        {items.map((it) => (
          <li key={it._id} className="list-group-item d-flex justify-content-between align-items-center">
            <span>{it.name} - {it.structure?.name}</span>
            <button className="btn btn-success btn-sm" onClick={() => addToCart(it)}>Ajouter au panier</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Catalog;

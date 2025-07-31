import React, { useState, useEffect, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { GlobalContext } from './GlobalContext';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { addToCart as addCartItem } from './Cart.jsx';

function Catalog() {
  const { t } = useTranslation();
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
  const [success, setSuccess] = useState('');
  const [quantities, setQuantities] = useState({});

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

  const handleQtyChange = (id, value) => {
    setQuantities({ ...quantities, [id]: value });
  };

  const addToCart = async (eq) => {
    const qty = Number(quantities[eq._id] || 1);
    if (!qty) return;
    if (!filters.startDate || !filters.endDate) {
      setError(t('catalog.select_period'));
      setSuccess('');
      return;
    }
    try {
      const res = await api(
        `/equipments/${eq._id}/availability?start=${filters.startDate}&end=${filters.endDate}&quantity=${qty}`
      );
      if (!res.available) {
        setError(t('catalog.unavailable'));
        setSuccess('');
        return;
      }
      addCartItem({
        equipment: eq,
        quantity: qty,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      setError('');
      setSuccess(t('catalog.added'));
    } catch (err) {
      setError(err.message || t('catalog.error'));
      setSuccess('');
    }
  };

  return (
    <div className="container">
      <NavBar />
      <h1>{t('catalog.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <div className="row g-2 mb-3">
        <div className="col-md">
          <input name="search" placeholder={t('catalog.search')} className="form-control" value={filters.search} onChange={handleChange} />
        </div>
        <div className="col-md">
          <input name="type" placeholder={t('catalog.type')} className="form-control" value={filters.type} onChange={handleChange} />
        </div>
        <div className="col-md">
          <select name="structure" className="form-select" value={filters.structure} onChange={handleChange}>
            <option value="">{t('catalog.all_structures')}</option>
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
          <button onClick={fetchItems} className="btn btn-primary">{t('catalog.search_button')}</button>
        </div>
      </div>
      <ul className="list-group">
        {items.map((it) => (
          <li
            key={it._id}
            className="list-group-item d-flex justify-content-between align-items-center"
          >
            <span>
              {it.name} - {it.structure?.name}
            </span>
            <div className="d-flex align-items-center">
              <input
                name={`quantity-${it._id}`}
                type="number"
                min="1"
                className="form-control form-control-sm me-2"
                value={quantities[it._id] || 1}
                onChange={(e) => handleQtyChange(it._id, e.target.value)}
              />
              <button
                className="btn btn-success btn-sm"
                onClick={() => addToCart(it)}
              >
                {t('catalog.add_to_cart')}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Catalog;

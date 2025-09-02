import React, { useState, useEffect, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import { GlobalContext } from './GlobalContext';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { addToCart as addCartItem } from './Cart.jsx';
import Loading from './Loading.jsx';

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [loading, setLoading] = useState(false);
  const isInvalidPeriod =
    filters.startDate && filters.endDate && filters.startDate > filters.endDate;

  const fetchItems = () => {
    setLoading(true);
    const params = new URLSearchParams({
      search: filters.search,
      type: filters.type,
      structure: filters.structure,
      all: 'true',
    });
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchItems();
  }, [filters.search, filters.type, filters.structure]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleQtyChange = (id, value) => {
    setQuantities({ ...quantities, [id]: value });
  };

  const primaryBtnStyle = {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#fff',
  };

  const successBtnStyle = {
    backgroundColor: 'var(--color-success)',
    borderColor: 'var(--color-success)',
    color: '#fff',
  };

  const addToCart = async (eq) => {
    const qty = Number(quantities[eq._id] || 1);
    if (!qty) return;
    if (!filters.startDate || !filters.endDate) {
      setError(t('catalog.select_period'));
      setSuccess('');
      return;
    }
    if (isInvalidPeriod) {
      setError(t('catalog.invalid_period'));
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
      <h1 className="h1">{t('catalog.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <div
        className="row"
        style={{ gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}
      >
        <div className="col-md">
          <input name="search" placeholder={t('catalog.search')} className="form-control" value={filters.search} onChange={handleChange} />
        </div>
        <div className="col-md">
          <select
            name="type"
            className="form-select"
            value={filters.type}
            onChange={handleChange}
          >
            <option value="">{t('catalog.all_types')}</option>
            <option value="Son">{t('equipments.add.types.sound')}</option>
            <option value="Lumière">{t('equipments.add.types.light')}</option>
            <option value="Plateau">{t('equipments.add.types.stage')}</option>
            <option value="Vidéo">{t('equipments.add.types.video')}</option>
            <option value="Autre">{t('equipments.add.types.other')}</option>
          </select>
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
          <button
            onClick={fetchItems}
            className="btn"
            style={primaryBtnStyle}
            disabled={isInvalidPeriod}
          >
            {t('catalog.search_button')}
          </button>
        </div>
      </div>
      {isMobile ? (
        <div className="card-grid" style={{ marginBottom: 'var(--spacing-xxl)' }}>
          {loading ? (
            <Loading />
          ) : (
            items.map((it) => (
              <div className="card" key={it._id}>
                <div className="card-body">
                  <h5 className="card-title h5">{it.name}</h5>
                  <p className="card-text">
                    <strong>{t('catalog.structure')}:</strong> {it.structure?.name}
                    <br />
                    <strong>{t('catalog.available_total')}:</strong> {it.availability}
                  </p>
                  <div className="card-actions">
                    <input
                      name={`quantity-${it._id}`}
                      type="number"
                      min="1"
                      className="form-control form-control-sm"
                      value={quantities[it._id] || 1}
                      onChange={(e) => handleQtyChange(it._id, e.target.value)}
                      style={{ marginRight: 'var(--spacing-sm)' }}
                    />
                    <button
                      className="btn btn-sm"
                      style={successBtnStyle}
                      onClick={() => addToCart(it)}
                    >
                      {t('catalog.add_to_cart')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>{t('catalog.equipment')}</th>
                <th>{t('catalog.structure')}</th>
                <th>{t('catalog.available_total')}</th>
                <th>{t('catalog.quantity')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5">
                    <Loading />
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id}>
                    <td>{it.name}</td>
                    <td>{it.structure?.name}</td>
                    <td>{it.availability}</td>
                    <td>
                      <input
                        name={`quantity-${it._id}`}
                        type="number"
                        min="1"
                        className="form-control form-control-sm"
                        value={quantities[it._id] || 1}
                        onChange={(e) => handleQtyChange(it._id, e.target.value)}
                      />
                    </td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={successBtnStyle}
                        onClick={() => addToCart(it)}
                      >
                        {t('catalog.add_to_cart')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Catalog;

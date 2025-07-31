import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from './api';
import AddEquipment from './AddEquipment';
import NavBar from './NavBar';
import Alert from './Alert.jsx';
import { AuthContext } from './AuthContext.jsx';

function Equipments() {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { user } = useContext(AuthContext);
  const [message] = useState(routerLocation.state?.message || '');
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [userStructure, setUserStructure] = useState('');

  const fetchItems = () => {
    const params = new URLSearchParams({
      search,
      type,
      location,
      structure: userStructure,
    });
    api(`/equipments?${params.toString()}`)
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    if (user) {
      const id = user.structure?._id || user.structure;
      setUserStructure(id || '');
    }
  }, [user]);

  useEffect(() => {
    if (userStructure !== '') {
      fetchItems();
    }
  }, [search, type, location, userStructure]);

  return (
    <div className="container">
      <NavBar />
      <Alert type="success" message={message} />
      <h1>{t('equipments.title')}</h1>
      <div className="row g-2 mb-3">
        <div className="col-md">
          <input
            placeholder={t('equipments.search')}
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md">
          <input
            placeholder={t('equipments.type')}
            className="form-control"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
        <div className="col-md">
          <input
            placeholder={t('equipments.location')}
            className="form-control"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button onClick={fetchItems} className="btn btn-primary">
            {t('equipments.search_button')}
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

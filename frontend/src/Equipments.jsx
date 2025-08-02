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
  const [showForm, setShowForm] = useState(false);

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
      <form
        className="row g-2 mb-3"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          fetchItems();
        }}
      >
        <div className="col-md">
          <label htmlFor="equip-search" className="visually-hidden">
            {t('equipments.search')}
          </label>
          <input
            id="equip-search"
            name="search"
            placeholder={t('equipments.search')}
            className="form-control"
            value={search}
            autoComplete="off"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md">
          <label htmlFor="equip-type" className="visually-hidden">
            {t('equipments.type')}
          </label>
          <input
            id="equip-type"
            name="type"
            placeholder={t('equipments.type')}
            className="form-control"
            value={type}
            autoComplete="off"
            onChange={(e) => setType(e.target.value)}
          />
        </div>
        <div className="col-md">
          <label htmlFor="equip-location" className="visually-hidden">
            {t('equipments.location')}
          </label>
          <input
            id="equip-location"
            name="location"
            placeholder={t('equipments.location')}
            className="form-control"
            value={location}
            autoComplete="off"
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary">
            {t('equipments.search_button')}
          </button>
        </div>
      </form>
      <ul className="list-group mb-4">
        {items.map((e) => (
          <li key={e._id} className="list-group-item">
            {e.name} ({e.location}) - {e.availability}
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn btn-secondary mb-3"
        type="button"
      >
        {t('equipments.add.title')}
      </button>
      {showForm && (
        <AddEquipment
          onCreated={() => {
            fetchItems();
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

export default Equipments;

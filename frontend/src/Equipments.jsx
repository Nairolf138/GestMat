import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import AddEquipment from './AddEquipment';
import EditEquipment from './EditEquipment';
import NavBar from './NavBar';
import Alert from './Alert.jsx';
import Loading from './Loading.jsx';
import { AuthContext } from './AuthContext.jsx';

function Equipments() {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { user } = useContext(AuthContext);
  const [message] = useState(routerLocation.state?.message || '');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [location, setLocation] = useState('');
  const [sort, setSort] = useState('');
  const [userStructure, setUserStructure] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const {
    data: items = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['equipments', { search, type, location, sort, userStructure }],
    queryFn: async () => {
      const params = new URLSearchParams({
        search,
        type,
        location,
        structure: userStructure,
        sort,
      });
      return await api(`/equipments?${params.toString()}`);
    },
    enabled: userStructure !== '',
    staleTime: 5 * 60 * 1000,
  });

  const structureName =
    user?.structure && typeof user.structure === 'object'
      ? user.structure.name
      : '';

  useEffect(() => {
    if (user) {
      const id = user.structure?._id || user.structure;
      setUserStructure(id || '');
    }
  }, [user]);

  const deleteEquipment = async (id) => {
    if (!window.confirm(t('equipments.delete.confirm'))) return;
    try {
      await api(`/equipments/${id}`, { method: 'DELETE' });
      refetch();
    } catch {
      // ignore errors
    }
  };

  return (
    <div className="container">
      <NavBar />
      <Alert message={error?.message} />
      <Alert type="success" message={message} />
      <h1>
        {t('equipments.title')}
        {structureName && ` - ${structureName}`}
      </h1>
      <form
        className="row g-2 mb-3"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          refetch();
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
        <div className="col-md">
          <label htmlFor="equip-sort" className="visually-hidden">
            {t('equipments.sort')}
          </label>
          <select
            id="equip-sort"
            name="sort"
            className="form-select"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="">{t('equipments.sort')}</option>
            <option value="name">{t('equipments.name')}</option>
            <option value="type">{t('equipments.type')}</option>
          </select>
        </div>
        <div className="col-auto">
          <button type="submit" className="btn btn-primary me-2">
            {t('equipments.search_button')}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearch('');
              setType('');
              setLocation('');
              setSort('');
              setTimeout(() => refetch(), 0);
            }}
          >
            {t('equipments.reset')}
          </button>
        </div>
      </form>
      <table className="table mb-4">
        <thead>
          <tr>
            <th>{t('equipments.name')}</th>
            <th>{t('equipments.type')}</th>
            <th>{t('equipments.location')}</th>
            <th>{t('equipments.availability')}</th>
            <th>{t('equipments.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {isFetching ? (
            <tr>
              <td colSpan="5">
                <Loading />
              </td>
            </tr>
          ) : (
            items.map((e) => (
              <tr key={e._id}>
                <td>{e.name}</td>
                <td>{e.type}</td>
                <td>{e.location}</td>
                <td>{e.availability}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary me-2"
                    onClick={() => setEditing(e)}
                  >
                    {t('equipments.edit.button')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteEquipment(e._id)}
                  >
                    {t('equipments.delete.button')}
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
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
            refetch();
            setShowForm(false);
          }}
        />
      )}
      {editing && (
        <EditEquipment
          equipment={editing}
          onUpdated={() => {
            refetch();
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export default Equipments;

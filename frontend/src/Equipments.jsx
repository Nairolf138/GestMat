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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const deleteEquipment = async (id) => {
    if (!window.confirm(t('equipments.delete.confirm'))) return;
    try {
      await api(`/equipments/${id}`, { method: 'DELETE' });
      refetch();
    } catch {
      // ignore errors
    }
  };

  const primaryBtnStyle = {
    backgroundColor: 'var(--color-primary)',
    borderColor: 'var(--color-primary)',
    color: '#fff',
  };

  const secondaryBtnStyle = {
    backgroundColor: 'var(--color-secondary)',
    borderColor: 'var(--color-secondary)',
    color: '#fff',
  };

  const dangerBtnStyle = {
    backgroundColor: 'var(--color-danger)',
    borderColor: 'var(--color-danger)',
    color: '#fff',
  };

  return (
    <div className="container">
      <NavBar />
      <Alert message={error?.message} />
      <Alert type="success" message={message} />
      <h1 className="h1">
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
          <button type="submit" className="btn me-2" style={primaryBtnStyle}>
            {t('equipments.search_button')}
          </button>
          <button
            type="button"
            className="btn"
            style={secondaryBtnStyle}
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
      {isMobile ? (
        <div className="card-grid mb-4">
          {isFetching ? (
            <Loading />
          ) : (
            items.map((e) => (
              <div className="card" key={e._id}>
                <div className="card-body">
                  <h5 className="card-title h5">{e.name}</h5>
                  <p className="card-text">
                    <strong>{t('equipments.type')}:</strong> {e.type}
                    <br />
                    <strong>{t('equipments.location')}:</strong> {e.location}
                    <br />
                    <strong>{t('equipments.availability')}:</strong> {e.availability}
                  </p>
                  <div className="card-actions">
                    <button
                      type="button"
                      className="btn btn-sm me-2"
                      style={secondaryBtnStyle}
                      onClick={() => setEditing(e)}
                    >
                      {t('equipments.edit.button')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      style={dangerBtnStyle}
                      onClick={() => deleteEquipment(e._id)}
                    >
                      {t('equipments.delete.button')}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="table-responsive mb-4">
          <table className="table mb-0">
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
                        className="btn btn-sm me-2"
                        style={secondaryBtnStyle}
                        onClick={() => setEditing(e)}
                      >
                        {t('equipments.edit.button')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm"
                        style={dangerBtnStyle}
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
        </div>
      )}
      <button
        onClick={() => setShowForm(!showForm)}
        className="btn mb-3"
        style={secondaryBtnStyle}
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

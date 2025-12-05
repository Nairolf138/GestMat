import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import NavBar from '../../NavBar';
import Alert from '../../Alert.jsx';
import Loading from '../../Loading.jsx';
import VehicleList from './VehicleList.jsx';
import VehicleForm from './VehicleForm.jsx';
import { AuthContext } from '../../AuthContext.jsx';
import { GlobalContext } from '../../GlobalContext.jsx';
import { api } from '../../api';

function Vehicles() {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { user } = useContext(AuthContext);
  const { structures } = useContext(GlobalContext);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    usage: '',
    location: '',
    structure: '',
    availableStart: '',
    availableEnd: '',
  });

  useEffect(() => {
    if (user?.structure) {
      const structureId = typeof user.structure === 'object' ? user.structure._id : user.structure;
      setFilters((prev) => ({ ...prev, structure: structureId || '' }));
    }
  }, [user]);

  const { data: vehicles = [], isFetching, error, refetch } = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      return api(`/vehicles?${params.toString()}`);
    },
  });

  const usageOptions = useMemo(() => {
    const values = new Set(vehicles.map((v) => v.usage).filter(Boolean));
    if (filters.usage && !values.has(filters.usage)) values.add(filters.usage);
    return Array.from(values);
  }, [vehicles, filters.usage]);

  const locationOptions = useMemo(() => {
    const values = new Set(vehicles.map((v) => v.location).filter(Boolean));
    if (filters.location && !values.has(filters.location)) values.add(filters.location);
    return Array.from(values);
  }, [vehicles, filters.location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters((prev) => ({ ...prev, search: '', status: '', usage: '', location: '', availableStart: '', availableEnd: '' }));
    setTimeout(() => refetch(), 0);
  };

  const structureName = useMemo(() => {
    if (!filters.structure) return '';
    const structure = structures.find((s) => s._id === filters.structure);
    if (structure) return structure.name;
    if (user?.structure?.name) return user.structure.name;
    return '';
  }, [filters.structure, structures, user]);

  return (
    <div className="container">
      <NavBar />
      <main id="main-content">
        <Alert message={routerLocation.state?.message} />
        <Alert message={error?.message} />
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h1 className="h1 mb-1">
              {t('vehicles.title')}
              {structureName && ` - ${structureName}`}
            </h1>
            <p className="text-muted mb-0">{t('vehicles.subtitle')}</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? t('common.close') : t('vehicles.form.create_title')}
          </button>
        </div>

        <form
          className="row g-2 mb-4"
          onSubmit={(e) => {
            e.preventDefault();
            refetch();
          }}
          autoComplete="off"
          aria-label={t('vehicles.filters.title')}
        >
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-search">
              {t('vehicles.filters.search')}
            </label>
            <input
              id="veh-search"
              name="search"
              className="form-control"
              placeholder={t('vehicles.filters.search')}
              value={filters.search}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-status">
              {t('vehicles.filters.status')}
            </label>
            <select
              id="veh-status"
              name="status"
              className="form-select"
              value={filters.status}
              onChange={handleChange}
            >
              <option value="">{t('vehicles.filters.status')}</option>
              <option value="available">{t('vehicles.status.available')}</option>
              <option value="unavailable">{t('vehicles.status.unavailable')}</option>
              <option value="maintenance">{t('vehicles.status.maintenance')}</option>
              <option value="retired">{t('vehicles.status.retired')}</option>
            </select>
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-usage">
              {t('vehicles.filters.usage')}
            </label>
            <input
              id="veh-usage"
              name="usage"
              className="form-control"
              placeholder={t('vehicles.filters.usage')}
              list="veh-usage-options"
              value={filters.usage}
              onChange={handleChange}
              autoComplete="off"
            />
            <datalist id="veh-usage-options">
              {usageOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-location">
              {t('vehicles.filters.location')}
            </label>
            <input
              id="veh-location"
              name="location"
              className="form-control"
              placeholder={t('vehicles.filters.location')}
              list="veh-location-options"
              value={filters.location}
              onChange={handleChange}
              autoComplete="off"
            />
            <datalist id="veh-location-options">
              {locationOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="veh-start">
              {t('vehicles.filters.availableStart')}
            </label>
            <input
              id="veh-start"
              name="availableStart"
              type="date"
              className="form-control"
              value={filters.availableStart}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="veh-end">
              {t('vehicles.filters.availableEnd')}
            </label>
            <input
              id="veh-end"
              name="availableEnd"
              type="date"
              className="form-control"
              value={filters.availableEnd}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="veh-structure">
              {t('vehicles.filters.structure')}
            </label>
            <select
              id="veh-structure"
              name="structure"
              className="form-select"
              value={filters.structure}
              onChange={handleChange}
            >
              <option value="">{t('vehicles.filters.structure')}</option>
              {structures.map((structure) => (
                <option key={structure._id} value={structure._id}>
                  {structure.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-end gap-2">
            <button type="submit" className="btn btn-primary">
              {t('vehicles.filters.apply')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>
              {t('vehicles.filters.reset')}
            </button>
          </div>
        </form>

        {showForm && (
          <div className="mb-4">
            <VehicleForm onCompleted={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {isFetching && !vehicles.length ? (
          <Loading />
        ) : (
          <VehicleList
            vehicles={vehicles}
            isFetching={isFetching}
            availableStart={filters.availableStart}
            availableEnd={filters.availableEnd}
          />
        )}
      </main>
    </div>
  );
}

export default Vehicles;

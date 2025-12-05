import React, { useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import VehicleForm from '../pages/Vehicles/VehicleForm.jsx';
import { api } from '../api';
import Alert from '../Alert.jsx';
import Loading from '../Loading.jsx';
import { confirmDialog } from '../utils';
import { GlobalContext } from '../GlobalContext.jsx';

function ManageVehicles() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { notify, structures } = useContext(GlobalContext);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    usage: '',
    location: '',
    structure: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [actionError, setActionError] = useState('');

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
    setFilters({ search: '', status: '', usage: '', location: '', structure: '' });
    setTimeout(() => refetch(), 0);
  };

  const statusBadge = (status) => {
    const className =
      status === 'available'
        ? 'badge bg-success'
        : status === 'maintenance'
          ? 'badge bg-warning text-dark'
          : status === 'retired'
            ? 'badge bg-secondary'
            : 'badge bg-danger';
    return <span className={className}>{t(`vehicles.status.${status || 'unavailable'}`)}</span>;
  };

  const handleCompleted = () => {
    setShowForm(false);
    setEditing(null);
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  };

  const handleDelete = async (vehicleId) => {
    setActionError('');
    if (!confirmDialog(t('vehicles.delete_confirm'))) return;
    try {
      await api(`/vehicles/${vehicleId}`, { method: 'DELETE' });
      notify(t('vehicles.delete_success'), 'success');
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err) {
      setActionError(err.message || t('vehicles.form.submit_error'));
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="h4 mb-0">{t('admin_dashboard.tabs.vehicles')}</h2>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {t('vehicles.filters.apply')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditing(null);
                setShowForm((prev) => !prev);
              }}
            >
              {showForm ? t('common.close') : t('vehicles.form.create_title')}
            </button>
          </div>
        </div>

        <Alert message={error?.message} />
        <Alert message={actionError} onClose={() => setActionError('')} />

        {showForm && (
          <div className="mb-4">
            <VehicleForm onCompleted={handleCompleted} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {editing && (
          <div className="mb-4">
            <VehicleForm
              vehicle={editing}
              onCompleted={handleCompleted}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}

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
            <label className="visually-hidden" htmlFor="veh-admin-search">
              {t('vehicles.filters.search')}
            </label>
            <input
              id="veh-admin-search"
              name="search"
              className="form-control"
              placeholder={t('vehicles.filters.search')}
              value={filters.search}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-admin-status">
              {t('vehicles.filters.status')}
            </label>
            <select
              id="veh-admin-status"
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
            <label className="visually-hidden" htmlFor="veh-admin-usage">
              {t('vehicles.filters.usage')}
            </label>
            <input
              id="veh-admin-usage"
              name="usage"
              className="form-control"
              placeholder={t('vehicles.filters.usage')}
              list="veh-admin-usage-options"
              value={filters.usage}
              onChange={handleChange}
              autoComplete="off"
            />
            <datalist id="veh-admin-usage-options">
              {usageOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-admin-location">
              {t('vehicles.filters.location')}
            </label>
            <input
              id="veh-admin-location"
              name="location"
              className="form-control"
              placeholder={t('vehicles.filters.location')}
              list="veh-admin-location-options"
              value={filters.location}
              onChange={handleChange}
              autoComplete="off"
            />
            <datalist id="veh-admin-location-options">
              {locationOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <div className="col-md-3">
            <label className="visually-hidden" htmlFor="veh-admin-structure">
              {t('vehicles.filters.structure')}
            </label>
            <select
              id="veh-admin-structure"
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
          <div className="col-md-3 d-flex gap-2 align-items-end">
            <button type="submit" className="btn btn-primary">
              {t('vehicles.filters.apply')}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={resetFilters}>
              {t('vehicles.filters.reset')}
            </button>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>{t('vehicles.columns.name')}</th>
                <th>{t('vehicles.columns.registration')}</th>
                <th>{t('vehicles.columns.location')}</th>
                <th>{t('vehicles.columns.status')}</th>
                <th className="text-end">{t('inventory.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && (
                <tr>
                  <td colSpan="5" className="text-center">
                    <Loading />
                  </td>
                </tr>
              )}
              {!isFetching && vehicles.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center text-muted">
                    {t('vehicles.empty')}
                  </td>
                </tr>
              )}
              {!isFetching &&
                vehicles.map((vehicle) => (
                  <tr key={vehicle._id}>
                    <td className="fw-semibold">{vehicle.name}</td>
                    <td>{vehicle.registrationNumber || '—'}</td>
                    <td>{vehicle.location || '—'}</td>
                    <td>{statusBadge(vehicle.status || 'unavailable')}</td>
                    <td className="text-end">
                      <div className="btn-group" role="group" aria-label={t('inventory.actions')}>
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={() => {
                            setShowForm(false);
                            setEditing(vehicle);
                          }}
                        >
                          {t('vehicles.detail.edit_title')}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(vehicle._id)}
                        >
                          {t('inventory.delete.button', 'Delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default ManageVehicles;

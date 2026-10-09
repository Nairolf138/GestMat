import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import AddEquipment from './AddEquipment';
import EditEquipment from './EditEquipment';
import Alert from './Alert.jsx';
import Loading from './Loading.jsx';
import { AuthContext } from './AuthContext.jsx';
import { canManageEquipment } from './utils.js';
import EquipmentsExportModal from './EquipmentsExportModal.jsx';

function Equipments() {
  const { t } = useTranslation();
  const routerLocation = useLocation();
  const { user } = useContext(AuthContext);
  const [message] = useState(routerLocation.state?.message || '');
  const [exportMessage, setExportMessage] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [sort, setSort] = useState('');
  const [userStructure, setUserStructure] = useState('');
  const [addFormPosition, setAddFormPosition] = useState(null);
  const [editing, setEditing] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [showExportModal, setShowExportModal] = useState(false);
  const queryClient = useQueryClient();

  const conditionLabels = useMemo(
    () => ({
      Neuf: t('equipments.add.conditions.new'),
      'Légèrement usé': t('equipments.add.conditions.used_lightly'),
      Usé: t('equipments.add.conditions.used'),
      'Très usé': t('equipments.add.conditions.very_used'),
    }),
    [t],
  );

  const {
    data: items = [],
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['equipments', { search, type, sort, userStructure }],
    queryFn: async () => {
      const params = new URLSearchParams({
        all: 'true',
        search,
        type,
        structure: userStructure,
        sort,
      });
      return await api(`/equipments?${params.toString()}`);
    },
    enabled: userStructure !== '',
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

  const deleteMutation = useMutation({
    mutationFn: (id) => api(`/equipments/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
    },
  });

  const deleteEquipment = async (id) => {
    if (!window.confirm(t('equipments.delete.confirm'))) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch {
      // ignore errors
    }
  };

  const typeOptions = useMemo(() => {
    const values = new Set(items.map((item) => item.type).filter(Boolean));
    if (type && !values.has(type)) {
      values.add(type);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [items, type]);

  const toggleAddForm = (position) => {
    setEditing(null);
    setAddFormPosition((previous) => (previous === position ? null : position));
  };

  const handleEditSelect = (equipment) => {
    setAddFormPosition(null);
    setEditing(equipment);
  };

  return (
    <>
      <Alert message={error?.message} />
      <Alert type="success" message={message} />
      <Alert
        type="success"
        message={exportMessage}
        onClose={() => setExportMessage('')}
      />
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h1 mb-0">
          {t('equipments.title')}
          {structureName && ` - ${structureName}`}
        </h1>
        {canManageEquipment(user?.role) && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => toggleAddForm('top')}
            aria-expanded={addFormPosition === 'top'}
            aria-controls="add-equipment-top"
          >
            {t('equipments.add.title')}
          </button>
        )}
      </div>
      {addFormPosition === 'top' && (
        <div id="add-equipment-top" className="mb-3">
          <AddEquipment onCreated={() => setAddFormPosition(null)} />
        </div>
      )}
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
          <select
            id="equip-type"
            name="type"
            className="form-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">{t('equipments.type')}</option>
            {typeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
              setSort('');
              setTimeout(() => refetch(), 0);
            }}
          >
            {t('equipments.reset')}
          </button>
          {canManageEquipment(user?.role) && (
            <button
              type="button"
              className="btn btn-outline-secondary ms-2"
              onClick={() => setShowExportModal(true)}
            >
              {t('equipments.export.button')}
            </button>
          )}
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
                    <strong>{t('equipments.availability')}:</strong>{' '}
                    {e.availability}
                    <br />
                    <strong>{t('equipments.add.condition')}:</strong>{' '}
                    {conditionLabels[e.condition] || e.condition}
                  </p>
                  {canManageEquipment(user?.role, e.type) && (
                    <div className="card-actions">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm me-2"
                        onClick={() => handleEditSelect(e)}
                      >
                        {t('equipments.edit.button')}
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => deleteEquipment(e._id)}
                      >
                        {t('equipments.delete.button')}
                      </button>
                    </div>
                  )}
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
                <th>{t('equipments.availability')}</th>
                <th>{t('equipments.add.condition')}</th>
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
                    <td>{e.availability}</td>
                    <td>{conditionLabels[e.condition] || e.condition}</td>
                    <td>
                      {canManageEquipment(user?.role, e.type) && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm me-2"
                            onClick={() => handleEditSelect(e)}
                          >
                            {t('equipments.edit.button')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => deleteEquipment(e._id)}
                          >
                            {t('equipments.delete.button')}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      {canManageEquipment(user?.role) && (
        <>
          <button
            onClick={() => toggleAddForm('bottom')}
            className="btn btn-secondary mb-3"
            type="button"
            aria-expanded={addFormPosition === 'bottom'}
            aria-controls="add-equipment-bottom"
          >
            {t('equipments.add.title')}
          </button>
          {addFormPosition === 'bottom' && (
            <div id="add-equipment-bottom">
              <AddEquipment onCreated={() => setAddFormPosition(null)} />
            </div>
          )}
        </>
      )}
      {editing && canManageEquipment(user?.role, editing.type) && (
        <EditEquipment
          equipment={editing}
          onUpdated={() => setEditing(null)}
          onCancel={() => setEditing(null)}
        />
      )}
      <EquipmentsExportModal
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        onSuccess={(msg) => setExportMessage(msg)}
      />
    </>
  );
}

export default Equipments;

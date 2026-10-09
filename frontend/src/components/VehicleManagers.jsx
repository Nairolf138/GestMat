import React, { useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { GlobalContext } from '../GlobalContext';
import Alert from '../Alert';

export default function VehicleManagers({ vehicle }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(vehicle.managerIds || []);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { structures } = useContext(GlobalContext);
  const queryClient = useQueryClient();
  useEffect(() => {
    setSelected(vehicle.managerIds || []);
    api(`/vehicles/manager-candidates?vehicleId=${vehicle._id}`)
      .then(setUsers)
      .catch((err) => setError(err.message));
  }, [vehicle._id, vehicle.managerIds]);
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api(`/vehicles/${vehicle._id}`, {
        method: 'PUT',
        body: JSON.stringify({ managerIds: selected }),
      });
      await queryClient.invalidateQueries({
        queryKey: ['vehicle', vehicle._id],
      });
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="card p-3 mt-3">
      <h2 className="h5">Gestionnaires du véhicule</h2>
      <label htmlFor="vehicle-managers">
        Sélectionner un ou plusieurs utilisateurs, de toute structure
      </label>
      <select
        id="vehicle-managers"
        multiple
        className="form-select my-2"
        value={selected}
        disabled={saving}
        onChange={(event) =>
          setSelected(
            [...event.target.selectedOptions].map((option) => option.value),
          )
        }
      >
        {users.map((user) => (
          <option key={user._id} value={user._id}>
            {[user.firstName, user.lastName].filter(Boolean).join(' ') ||
              user.username}{' '}
            —{' '}
            {structures.find((structure) => structure._id === user.structure)
              ?.name || user.role}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="btn btn-primary"
        disabled={saving || !selected.length}
      >
        Enregistrer les gestionnaires
      </button>
      <Alert message={error} onClose={() => setError('')} />
    </form>
  );
}

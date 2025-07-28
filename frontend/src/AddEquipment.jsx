import React, { useState } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';

function AddEquipment({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    type: '',
    totalQty: 0,
    availableQty: 0,
    location: '',
    condition: '',
    status: 'disponible',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = ['totalQty', 'availableQty'].includes(name)
      ? Number(value)
      : value;
    setForm({ ...form, [name]: parsed });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/equipments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({
        name: '',
        type: '',
        totalQty: 0,
        availableQty: 0,
        location: '',
        condition: '',
        status: 'disponible',
      });
      setError('');
      if (onCreated) onCreated();
    } catch (err) {
      setError(err.message || 'Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <h2>Nouvel équipement</h2>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label">Nom</label>
        <input
          name="name"
          className="form-control"
          value={form.name}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Type</label>
        <input
          name="type"
          className="form-control"
          value={form.type}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Quantité totale</label>
        <input
          name="totalQty"
          type="number"
          className="form-control"
          value={form.totalQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Quantité disponible</label>
        <input
          name="availableQty"
          type="number"
          className="form-control"
          value={form.availableQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Emplacement</label>
        <input
          name="location"
          className="form-control"
          value={form.location}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">État</label>
        <input
          name="condition"
          className="form-control"
          value={form.condition}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Disponibilité</label>
        <select
          name="status"
          className="form-select"
          value={form.status}
          onChange={handleChange}
        >
          <option value="disponible">Disponible</option>
          <option value="indisponible">Indisponible</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary mt-2">Ajouter</button>
    </form>
  );
}

export default AddEquipment;

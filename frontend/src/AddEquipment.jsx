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
    <form onSubmit={handleSubmit} className="mt-4" aria-labelledby="add-equip-title">
      <h2 id="add-equip-title">Nouvel équipement</h2>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-name">Nom</label>
        <input
          id="eq-name"
          name="name"
          className="form-control"
          aria-label="Nom"
          value={form.name}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-type">Type</label>
        <input
          id="eq-type"
          name="type"
          className="form-control"
          aria-label="Type"
          value={form.type}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-total">Quantité totale</label>
        <input
          id="eq-total"
          name="totalQty"
          type="number"
          className="form-control"
          aria-label="Quantité totale"
          value={form.totalQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-available">Quantité disponible</label>
        <input
          id="eq-available"
          name="availableQty"
          type="number"
          className="form-control"
          aria-label="Quantité disponible"
          value={form.availableQty}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-location">Emplacement</label>
        <input
          id="eq-location"
          name="location"
          className="form-control"
          aria-label="Emplacement"
          value={form.location}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-condition">État</label>
        <input
          id="eq-condition"
          name="condition"
          className="form-control"
          aria-label="État"
          value={form.condition}
          onChange={handleChange}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="eq-status">Disponibilité</label>
        <select
          id="eq-status"
          name="status"
          className="form-select"
          aria-label="Disponibilité"
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

import React, { useState } from 'react';
import { api } from './api';

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
    <form onSubmit={handleSubmit} className="form">
      <h2>Nouvel équipement</h2>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label>Nom</label>
        <input name="name" value={form.name} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Type</label>
        <input name="type" value={form.type} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Quantité totale</label>
        <input
          name="totalQty"
          type="number"
          value={form.totalQty}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label>Quantité disponible</label>
        <input
          name="availableQty"
          type="number"
          value={form.availableQty}
          onChange={handleChange}
        />
      </div>
      <div className="form-group">
        <label>Emplacement</label>
        <input name="location" value={form.location} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>État</label>
        <input name="condition" value={form.condition} onChange={handleChange} />
      </div>
      <div className="form-group">
        <label>Disponibilité</label>
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="disponible">Disponible</option>
          <option value="indisponible">Indisponible</option>
        </select>
      </div>
      <button type="submit" className="btn">Ajouter</button>
    </form>
  );
}

export default AddEquipment;

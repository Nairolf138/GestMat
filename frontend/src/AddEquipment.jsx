import React, { useState } from 'react';
import { api } from './api';

function AddEquipment({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    type: '',
    totalQty: 0,
    availableQty: 0,
    location: '',
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
      setForm({ name: '', type: '', totalQty: 0, availableQty: 0, location: '' });
      setError('');
      if (onCreated) onCreated();
    } catch (err) {
      setError('Erreur lors de la création');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '1em' }}>
      <h2>Nouvel équipement</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div>
        <label>Nom</label>
        <input name="name" value={form.name} onChange={handleChange} />
      </div>
      <div>
        <label>Type</label>
        <input name="type" value={form.type} onChange={handleChange} />
      </div>
      <div>
        <label>Quantité totale</label>
        <input name="totalQty" type="number" value={form.totalQty} onChange={handleChange} />
      </div>
      <div>
        <label>Quantité disponible</label>
        <input name="availableQty" type="number" value={form.availableQty} onChange={handleChange} />
      </div>
      <div>
        <label>Emplacement</label>
        <input name="location" value={form.location} onChange={handleChange} />
      </div>
      <button type="submit">Ajouter</button>
    </form>
  );
}

export default AddEquipment;

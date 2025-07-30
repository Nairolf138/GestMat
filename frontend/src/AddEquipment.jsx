import React, { useState } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';

function AddEquipment({ onCreated }) {
  const [form, setForm] = useState({
    name: '',
    type: '',
    totalQty: 0,
    availableQty: 0,
    condition: '',
  });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsed = ['totalQty', 'availableQty'].includes(name)
      ? value === ''
        ? ''
        : Number(value)
      : value;
    setForm({ ...form, [name]: parsed });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        totalQty: Number(form.totalQty) || 0,
        availableQty: Number(form.availableQty) || 0,
      };
      await api('/equipments', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setForm({
        name: '',
        type: '',
        totalQty: 0,
        availableQty: 0,
        condition: '',
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
        <select
          id="eq-type"
          name="type"
          className="form-select"
          aria-label="Type"
          value={form.type}
          onChange={handleChange}
        >
          <option value="">--</option>
          <option value="Son">Son</option>
          <option value="Lumi\u00e8re">Lumi\u00e8re</option>
          <option value="Plateau">Plateau</option>
          <option value="Vid\u00e9o">Vid\u00e9o</option>
          <option value="Autre">Autre</option>
        </select>
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
        <label className="form-label" htmlFor="eq-condition">État</label>
        <select
          id="eq-condition"
          name="condition"
          className="form-select"
          aria-label="État"
          value={form.condition}
          onChange={handleChange}
        >
          <option value="">--</option>
          <option value="Neuf">Neuf</option>
          <option value="L\u00e9g\u00e8rement us\u00e9">Légèrement usé</option>
          <option value="Us\u00e9">Usé</option>
          <option value="Tr\u00e8s us\u00e9">Très usé</option>
        </select>
      </div>
      <button type="submit" className="btn btn-primary mt-2">Ajouter</button>
    </form>
  );
}

export default AddEquipment;

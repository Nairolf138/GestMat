import React, { useEffect, useState } from 'react';
import NavBar from './NavBar';
import { api } from './api';

const ROLES = [
  'Administrateur',
  'Régisseur(se) Son',
  'Régisseur(se) Lumière',
  'Régisseur(se) Plateau',
  'Regisseur(se) Général',
  'Autre',
];

const STRUCTURES = [
  "Théâtre de l'Olivier (Istres)",
  'Théâtre La Colonne (Miramas)',
  'Le Théâtre de Fos (Fos-sur-mer)',
  "L'Usine (Istres)",
  'Espace Gérard Philippe (Port-saint louis)',
  'Espace Robert Hossein (Grans)',
  "L'Oppidum (Cornillon Confoux)",
];

function Profile() {
  const [form, setForm] = useState({
    username: '',
    password: '',
    role: '',
    structure: '',
  });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api('/users/me')
      .then((u) => setForm({ ...form, ...u, password: '' }))
      .catch(() => setMsg('Erreur de chargement'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.password) delete payload.password;
    try {
      const u = await api('/users/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setForm({ ...form, ...u, password: '' });
      setMsg('Modifié');
    } catch (err) {
      setMsg(err.message || 'Erreur');
    }
  };

  return (
    <div className="container">
      <NavBar />
      <h1>Profil</h1>
      {msg && <p>{msg}</p>}
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="mb-3">
          <label className="form-label">Utilisateur</label>
          <input
            name="username"
            className="form-control"
            value={form.username}
            onChange={handleChange}
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Mot de passe</label>
          <input
            type="password"
            name="password"
            className="form-control"
            value={form.password}
            onChange={handleChange}
            placeholder="(inchangé)"
          />
        </div>
        <div className="mb-3">
          <label className="form-label">Rôle</label>
          <select
            name="role"
            className="form-select"
            value={form.role}
            onChange={handleChange}
          >
            <option value="">Choisir...</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Structure</label>
          <select
            name="structure"
            className="form-select"
            value={form.structure}
            onChange={handleChange}
          >
            <option value="">Choisir...</option>
            {STRUCTURES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          Enregistrer
        </button>
      </form>
    </div>
  );
}

export default Profile;

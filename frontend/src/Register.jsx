import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  'Théâtre de l\'Olivier (Istres)',
  'Théâtre La Colonne (Miramas)',
  'Le Théâtre de Fos (Fos-sur-mer)',
  "L'Usine (Istres)",
  'Espace Gérard Philippe (Port-saint louis)',
  'Espace Robert Hossein (Grans)',
  "L'Oppidum (Cornillon Confoux)",
];

function Register() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [structure, setStructure] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password || !role) {
      setError("Utilisateur, mot de passe et rôle sont requis");
      return;
    }
    const payload = { username, password, role };
    if (structure) payload.structure = structure;
    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (email) payload.email = email;
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mt-4">
      <h1>Inscription</h1>
      {error && <p className="error">{error}</p>}
      <div className="mb-3">
        <label className="form-label">Utilisateur</label>
        <input
          className="form-control"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Prénom</label>
        <input
          className="form-control"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Nom</label>
        <input
          className="form-control"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Adresse mail</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Mot de passe</label>
        <input
          type="password"
          className="form-control"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Rôle</label>
        <select
          className="form-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
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
          className="form-select"
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
        >
          <option value="">Choisir...</option>
          {STRUCTURES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary">S'inscrire</button>
    </form>
  );
}

export default Register;

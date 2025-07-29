import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import Alert from './Alert.jsx';

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
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!username) fieldErrors.username = 'Requis';
    if (!password) fieldErrors.password = 'Requis';
    if (!role) fieldErrors.role = 'Requis';
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setError('Utilisateur, mot de passe et rôle sont requis');
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
      if (err.message.includes('Username already exists')) {
        setErrors({ username: err.message });
      } else if (err.message.includes('12 bytes') || err.message.includes('24 hex')) {
        setErrors({ structure: 'Structure invalide' });
      }
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mt-4">
      <h1>Inscription</h1>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label">Utilisateur</label>
        <input
          name="username"
          className={`form-control${errors.username ? ' is-invalid' : ''}`}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (errors.username) setErrors({ ...errors, username: undefined });
          }}
        />
        {errors.username && (
          <div className="invalid-feedback">{errors.username}</div>
        )}
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
          name="password"
          type="password"
          className={`form-control${errors.password ? ' is-invalid' : ''}`}
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors({ ...errors, password: undefined });
          }}
        />
        {errors.password && (
          <div className="invalid-feedback">{errors.password}</div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Rôle</label>
        <select
          name="role"
          className={`form-select${errors.role ? ' is-invalid' : ''}`}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            if (errors.role) setErrors({ ...errors, role: undefined });
          }}
        >
          <option value="">Choisir...</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {errors.role && (
          <div className="invalid-feedback">{errors.role}</div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label">Structure</label>
        <select
          name="structure"
          className={`form-select${errors.structure ? ' is-invalid' : ''}`}
          value={structure}
          onChange={(e) => {
            setStructure(e.target.value);
            if (errors.structure) setErrors({ ...errors, structure: undefined });
          }}
        >
          <option value="">Choisir...</option>
          {STRUCTURES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {errors.structure && (
          <div className="invalid-feedback">{errors.structure}</div>
        )}
      </div>
      <button type="submit" className="btn btn-primary">S'inscrire</button>
    </form>
  );
}

export default Register;

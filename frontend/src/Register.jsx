import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';

function Register() {
  const [username, setUsername] = useState('');
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
        <input
          className="form-control"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Structure</label>
        <input
          className="form-control"
          value={structure}
          onChange={(e) => setStructure(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary">S'inscrire</button>
    </form>
  );
}

export default Register;

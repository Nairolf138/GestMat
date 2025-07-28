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
    const payload = { username, password, role };
    if (structure) payload.structure = structure;
    try {
      await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      navigate('/login');
    } catch (err) {
      setError('Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>Inscription</h1>
      {error && <p className="error">{error}</p>}
      <div className="form-group">
        <label>Utilisateur</label>
        <input value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Rôle</label>
        <input value={role} onChange={(e) => setRole(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Structure</label>
        <input value={structure} onChange={(e) => setStructure(e.target.value)} />
      </div>
      <button type="submit" className="btn">S'inscrire</button>
    </form>
  );
}

export default Register;

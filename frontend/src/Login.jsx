import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Utilisateur et mot de passe requis');
      return;
    }
    try {
      const { token } = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      localStorage.setItem('token', token);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h1>Connexion</h1>
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
      <button type="submit" className="btn">Se connecter</button>
      <p className="form-group">
        <Link to="/register">S'inscrire</Link>
      </p>
    </form>
  );
}

export default Login;

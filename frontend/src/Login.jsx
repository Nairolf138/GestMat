import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import Alert from './Alert.jsx';

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
    <form onSubmit={handleSubmit} className="container mt-4">
      <h1>Connexion</h1>
      <Alert message={error} />
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
      <button type="submit" className="btn btn-primary">Se connecter</button>
      <p className="mt-3">
        <Link to="/register">S'inscrire</Link>
      </p>
    </form>
  );
}

export default Login;

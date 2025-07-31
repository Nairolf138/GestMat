import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './AuthContext.jsx';

function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const userRef = useRef(null);
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('login.missing_credentials'));
      return;
    }
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      navigate('/', { state: { message: t('login.success') } });
    } catch (err) {
      setError(err.message || t('login.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mt-4" aria-labelledby="login-title">
      <h1 id="login-title">{t('login.title')}</h1>
      <Alert message={error} />
      <div className="mb-3">
        <label className="form-label" htmlFor="username">{t('login.username')}</label>
        <input
          id="username"
          className="form-control"
          aria-label={t('login.username')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          ref={userRef}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="password">{t('login.password')}</label>
        <input
          id="password"
          type="password"
          className="form-control"
          aria-label={t('login.password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary">{t('login.submit')}</button>
      <p className="mt-3">
        <Link to="/register">{t('register.submit')}</Link>
      </p>
    </form>
  );
}

export default Login;

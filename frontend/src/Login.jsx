import React, { useState, useRef, useEffect, useContext } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { api } from './api';
import Alert from './Alert.jsx';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './AuthContext.jsx';
import FormCard from './components/FormCard.jsx';
import logo from './logo.png';

function Login() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const location = useLocation();
  const userRef = useRef(null);
  const { setUser } = useContext(AuthContext);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!username) fieldErrors.username = t('common.required');
    if (!password) fieldErrors.password = t('common.required');
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
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
      setErrors(err.fieldErrors || {});
      setError(err.message || t('login.failed'));
    }
  };

  return (
    <main id="main-content">
      <FormCard onSubmit={handleSubmit} aria-labelledby="login-title">
        <div className="auth-logo-wrapper">
          <img src={logo} alt="GestMat" className="auth-logo" />
        </div>
        <h1 id="login-title" className="h1">
          {t('login.title')}
        </h1>
        <Alert type="success" message={location.state?.message} />
        <Alert message={error} />
        <div className="mb-3">
          <label className="form-label" htmlFor="username">
            {t('login.username')}
          </label>
          <input
            id="username"
            className={`form-control${errors.username ? ' is-invalid' : ''}`}
            aria-label={t('login.username')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (errors.username)
                setErrors({ ...errors, username: undefined });
            }}
            ref={userRef}
            aria-invalid={errors.username ? 'true' : undefined}
            aria-describedby={errors.username ? 'username-error' : undefined}
          />
          {errors.username && (
            <div
              className="invalid-feedback"
              id="username-error"
              role="alert"
              aria-live="polite"
            >
              {errors.username}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="password">
            {t('login.password')}
          </label>
          <input
            id="password"
            type="password"
            className={`form-control${errors.password ? ' is-invalid' : ''}`}
            aria-label={t('login.password')}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password)
                setErrors({ ...errors, password: undefined });
            }}
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
          {errors.password && (
            <div
              className="invalid-feedback"
              id="password-error"
              role="alert"
              aria-live="polite"
            >
              {errors.password}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary">
          {t('login.submit')}
        </button>
        <p className="mt-3">
          <Link to="/register">{t('register.submit')}</Link>
        </p>
      </FormCard>
    </main>
  );
}

export default Login;

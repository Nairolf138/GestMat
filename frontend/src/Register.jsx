import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api';
import Alert from './Alert.jsx';
import { GlobalContext } from './GlobalContext.jsx';
import { useTranslation } from 'react-i18next';

function Register() {
  const { roles, structures } = useContext(GlobalContext);
  const { t } = useTranslation();
  const userRef = useRef(null);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [structure, setStructure] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fieldErrors = {};
    if (!username) fieldErrors.username = t('common.required');
    if (!password) fieldErrors.password = t('common.required');
    if (!role) fieldErrors.role = t('common.required');
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      setError(t('register.fields_required'));
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
      setSuccess(t('register.success'));
      setError('');
      setUsername('');
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('');
      setRole('');
      setStructure('');
      userRef.current?.focus();
    } catch (err) {
      if (err.message === 'Username already exists') {
        setErrors({ username: t('register.user_exists') });
      } else if (err.message.includes('12 bytes') || err.message.includes('24 hex')) {
        setErrors({ structure: t('register.invalid_structure') });
      } else {
        setErrors({});
      }
      setError(err.message || t('register.failed'));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="container mt-4" aria-labelledby="register-title">
      <h1 id="register-title">{t('register.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <div className="mb-3">
        <label className="form-label" htmlFor="reg-username">{t('login.username')}</label>
        <input
          id="reg-username"
          name="username"
          className={`form-control${errors.username ? ' is-invalid' : ''}`}
          aria-label={t('login.username')}
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            if (errors.username) setErrors({ ...errors, username: undefined });
          }}
          ref={userRef}
        />
        {errors.username && (
          <div className="invalid-feedback">{errors.username}</div>
        )}
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="firstName">{t('profile.first_name')}</label>
        <input
          id="firstName"
          className="form-control"
          aria-label={t('profile.first_name')}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="lastName">{t('profile.last_name')}</label>
        <input
          id="lastName"
          className="form-control"
          aria-label={t('profile.last_name')}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="email">{t('profile.email')}</label>
        <input
          id="email"
          type="email"
          className="form-control"
          aria-label={t('profile.email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="password">{t('login.password')}</label>
        <input
          id="password"
          name="password"
          type="password"
          className={`form-control${errors.password ? ' is-invalid' : ''}`}
          aria-label={t('login.password')}
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
        <label className="form-label" htmlFor="role">{t('profile.role')}</label>
        <select
          id="role"
          name="role"
          className={`form-select${errors.role ? ' is-invalid' : ''}`}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            if (errors.role) setErrors({ ...errors, role: undefined });
          }}
        >
          <option value="">{t('common.choose')}</option>
          {roles.map((r) => (
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
        <label className="form-label" htmlFor="structure">{t('profile.structure')}</label>
        <select
          id="structure"
          name="structure"
          className={`form-select${errors.structure ? ' is-invalid' : ''}`}
          value={structure}
          onChange={(e) => {
            setStructure(e.target.value);
            if (errors.structure) setErrors({ ...errors, structure: undefined });
          }}
        >
          <option value="">{t('common.choose')}</option>
          {structures.map((s) => (
            <option key={s._id || s} value={s._id || s.name || s}>
              {s.name || s}
            </option>
          ))}
        </select>
        {errors.structure && (
          <div className="invalid-feedback">{errors.structure}</div>
        )}
      </div>
      <button type="submit" className="btn btn-primary">{t('register.submit')}</button>
    </form>
  );
}

export default Register;

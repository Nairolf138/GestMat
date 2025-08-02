import React, { useEffect, useState, useContext } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';
import { GlobalContext } from './GlobalContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import { useTranslation } from 'react-i18next';

function Profile() {
  const { t } = useTranslation();
  const { roles, structures } = useContext(GlobalContext);
  const { user, setUser } = useContext(AuthContext);
  const [form, setForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: '',
    structure: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (user) {
      const structureId = user.structure?._id || user.structure || '';
      setForm((f) => ({ ...f, ...user, structure: structureId, password: '' }));
      setError('');
    } else {
      setError(t('profile.load_error'));
    }
  }, [user, t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: undefined });
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
      setUser(u);
      setSuccess(t('profile.success'));
      setError('');
      setErrors({});
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message || t('common.error'));
      setSuccess('');
    }
  };

  return (
    <div className="container">
      <NavBar />
      <h1>{t('profile.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <form onSubmit={handleSubmit} className="mt-3">
        <div className="mb-3">
          <label className="form-label">{t('profile.username')}</label>
          <input
            name="username"
            className="form-control"
            value={form.username}
            disabled
          />
        </div>
        <div className="mb-3">
          <label className="form-label">{t('profile.first_name')}</label>
          <input
            name="firstName"
            className={`form-control${errors.firstName ? ' is-invalid' : ''}`}
            value={form.firstName}
            onChange={handleChange}
            aria-invalid={errors.firstName ? 'true' : undefined}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
          />
          {errors.firstName && (
            <div
              className="invalid-feedback"
              id="firstName-error"
              role="alert"
              aria-live="polite"
            >
              {errors.firstName}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label">{t('profile.last_name')}</label>
          <input
            name="lastName"
            className={`form-control${errors.lastName ? ' is-invalid' : ''}`}
            value={form.lastName}
            onChange={handleChange}
            aria-invalid={errors.lastName ? 'true' : undefined}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
          />
          {errors.lastName && (
            <div
              className="invalid-feedback"
              id="lastName-error"
              role="alert"
              aria-live="polite"
            >
              {errors.lastName}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label">{t('profile.email')}</label>
          <input
            type="email"
            name="email"
            className={`form-control${errors.email ? ' is-invalid' : ''}`}
            value={form.email}
            onChange={handleChange}
            aria-invalid={errors.email ? 'true' : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <div
              className="invalid-feedback"
              id="email-error"
              role="alert"
              aria-live="polite"
            >
              {errors.email}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label">{t('profile.password')}</label>
          <input
            type="password"
            name="password"
            className={`form-control${errors.password ? ' is-invalid' : ''}`}
            value={form.password}
            onChange={handleChange}
            placeholder={t('profile.password_placeholder')}
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
        <div className="mb-3">
          <label className="form-label">{t('profile.role')}</label>
          <select
            name="role"
            className="form-select"
            value={form.role}
            disabled
          >
            <option value="">{t('common.choose')}</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">{t('profile.structure')}</label>
          <select
            name="structure"
            className="form-select"
            value={form.structure}
            disabled
          >
            <option value="">{t('common.choose')}</option>
            {structures.map((s) => (
              <option key={s._id || s} value={s._id || s.name || s}>
                {s.name || s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary">
          {t('profile.save')}
        </button>
      </form>
    </div>
  );
}

export default Profile;

import React, { useEffect, useState, useContext, useMemo } from 'react';
import NavBar from './NavBar';
import { api } from './api';
import Alert from './Alert.jsx';
import { GlobalContext } from './GlobalContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import FormCard from './components/FormCard.jsx';

function Profile() {
  const { t } = useTranslation();
  const { structures } = useContext(GlobalContext);
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

  const structureName = useMemo(() => {
    if (!form.structure) return '';
    return (
      structures.find((s) => s._id === form.structure)?.name ||
      user?.structure?.name ||
      ''
    );
  }, [structures, form.structure, user]);

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
      <main id="main-content">
        <h1 className="h1">{t('profile.title')}</h1>
        <Alert message={error} />
        <Alert type="success" message={success} />
        <FormCard onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">{t('profile.username')}</label>
            <input
              name="username"
              className="form-control"
              value={form.username}
              disabled
            />
          </div>
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">{t('profile.first_name')}</label>
              <input
                name="firstName"
                className={`form-control${errors.firstName ? ' is-invalid' : ''}`}
                value={form.firstName}
                onChange={handleChange}
                aria-invalid={errors.firstName ? 'true' : undefined}
                aria-describedby={
                  errors.firstName ? 'firstName-error' : undefined
                }
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
            <div className="col-md-6 mb-3">
              <label className="form-label">{t('profile.last_name')}</label>
              <input
                name="lastName"
                className={`form-control${errors.lastName ? ' is-invalid' : ''}`}
                value={form.lastName}
                onChange={handleChange}
                aria-invalid={errors.lastName ? 'true' : undefined}
                aria-describedby={
                  errors.lastName ? 'lastName-error' : undefined
                }
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
          <div className="row">
            <div className="col-md-6 mb-3">
              <label className="form-label">{t('profile.role')}</label>
              <input
                name="role"
                className="form-control"
                value={t(`roles.${form.role}`)}
                disabled
              />
            </div>
            <div className="col-md-6 mb-3">
              <label className="form-label">{t('profile.structure')}</label>
              <input
                name="structure"
                className="form-control"
                value={structureName}
                disabled
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn"
            style={{
              backgroundColor: 'var(--color-primary)',
              borderColor: 'var(--color-primary)',
              color: '#fff',
            }}
          >
            {t('profile.save')}
          </button>
        </FormCard>
      </main>
    </div>
  );
}

export default Profile;

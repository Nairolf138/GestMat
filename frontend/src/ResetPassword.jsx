import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FormCard from './components/FormCard.jsx';
import Alert from './Alert.jsx';
import { api } from './api';

function ResetPassword() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(
    () => new URLSearchParams(location.search).get('token') || '',
    [location.search],
  );
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    const fieldErrors = {};
    if (!token) {
      setError(t('reset_password.missing_token'));
      return;
    }
    if (!password) {
      fieldErrors.password = t('reset_password.required');
    } else if (!/^.*(?=.{12,})(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/.test(password)) {
      fieldErrors.password = t('reset_password.requirements');
    }
    if (password !== confirmPassword) {
      fieldErrors.confirmPassword = t('reset_password.mismatch');
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      return;
    }
    setLoading(true);
    try {
      const data = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setStatus(data.message || t('reset_password.success'));
      setTimeout(() => navigate('/login', { state: { message: t('reset_password.success') } }), 3000);
    } catch (err) {
      setErrors(err.fieldErrors || {});
      setError(err.message || t('reset_password.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content">
      <FormCard onSubmit={handleSubmit} aria-labelledby="reset-password-title">
        <h1 id="reset-password-title" className="h1">
          {t('reset_password.title')}
        </h1>
        <p>{t('reset_password.description')}</p>
        <Alert type="success" message={status} onClose={() => setStatus('')} />
        <Alert message={error} onClose={() => setError('')} autoHideDuration={false} />
        <div className="mb-3">
          <label className="form-label" htmlFor="new-password">
            {t('reset_password.new_password')}
          </label>
          <input
            id="new-password"
            type="password"
            className={`form-control${errors.password ? ' is-invalid' : ''}`}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              if (errors.password) setErrors({ ...errors, password: undefined });
            }}
            autoComplete="new-password"
            aria-invalid={errors.password ? 'true' : undefined}
            aria-describedby={errors.password ? 'new-password-error' : undefined}
          />
          {errors.password && (
            <div
              className="invalid-feedback"
              id="new-password-error"
              role="alert"
              aria-live="polite"
            >
              {errors.password}
            </div>
          )}
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="confirm-password">
            {t('reset_password.confirm_password')}
          </label>
          <input
            id="confirm-password"
            type="password"
            className={`form-control${errors.confirmPassword ? ' is-invalid' : ''}`}
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (errors.confirmPassword)
                setErrors({ ...errors, confirmPassword: undefined });
            }}
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? 'true' : undefined}
            aria-describedby={
              errors.confirmPassword ? 'confirm-password-error' : undefined
            }
          />
          {errors.confirmPassword && (
            <div
              className="invalid-feedback"
              id="confirm-password-error"
              role="alert"
              aria-live="polite"
            >
              {errors.confirmPassword}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('common.loading') : t('reset_password.submit')}
        </button>
        <p className="mt-3">
          <Link to="/forgot-password">{t('reset_password.back_to_forgot')}</Link>
        </p>
      </FormCard>
    </main>
  );
}

export default ResetPassword;

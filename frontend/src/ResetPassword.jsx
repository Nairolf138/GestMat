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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!token) {
      setError(t('reset_password.missing_token'));
      return;
    }
    if (!password) {
      setError(t('reset_password.required'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('reset_password.mismatch'));
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
            className="form-control"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="confirm-password">
            {t('reset_password.confirm_password')}
          </label>
          <input
            id="confirm-password"
            type="password"
            className="form-control"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
          />
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

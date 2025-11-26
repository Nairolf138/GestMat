import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FormCard from './components/FormCard.jsx';
import Alert from './Alert.jsx';
import { api } from './api';

function ForgotPassword() {
  const { t } = useTranslation();
  const [identifier, setIdentifier] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    if (!identifier) {
      setError(t('forgot_password.required'));
      return;
    }
    setLoading(true);
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ identifier }),
      });
      setStatus(data.message || t('forgot_password.success'));
    } catch (err) {
      setError(err.message || t('forgot_password.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content">
      <FormCard onSubmit={handleSubmit} aria-labelledby="forgot-password-title">
        <h1 id="forgot-password-title" className="h1">
          {t('forgot_password.title')}
        </h1>
        <p>{t('forgot_password.description')}</p>
        <Alert type="success" message={status} onClose={() => setStatus('')} />
        <Alert message={error} onClose={() => setError('')} autoHideDuration={false} />
        <div className="mb-3">
          <label className="form-label" htmlFor="identifier">
            {t('forgot_password.identifier')}
          </label>
          <input
            id="identifier"
            className="form-control"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('common.loading') : t('forgot_password.submit')}
        </button>
        <p className="mt-3">
          <Link to="/login">{t('forgot_password.back_to_login')}</Link>
        </p>
      </FormCard>
    </main>
  );
}

export default ForgotPassword;

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FormCard from './components/FormCard.jsx';
import Alert from './Alert.jsx';
import { api } from './api';

function ForgotUsername() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    if (!email) {
      setError(t('forgot_username.required'));
      return;
    }

    setLoading(true);
    try {
      const data = await api('/auth/forgot-username', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatus(data.message || t('forgot_username.success'));
    } catch (err) {
      setError(err.message || t('forgot_username.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content">
      <FormCard onSubmit={handleSubmit} aria-labelledby="forgot-username-title">
        <h1 id="forgot-username-title" className="h1">
          {t('forgot_username.title')}
        </h1>
        <p>{t('forgot_username.description')}</p>
        <Alert type="success" message={status} onClose={() => setStatus('')} />
        <Alert message={error} onClose={() => setError('')} autoHideDuration={false} />
        <div className="mb-3">
          <label className="form-label" htmlFor="email">
            {t('forgot_username.email')}
          </label>
          <input
            id="email"
            type="email"
            className="form-control"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? t('common.loading') : t('forgot_username.submit')}
        </button>
        <p className="mt-3">
          <Link to="/login">{t('forgot_username.back_to_login')}</Link>
        </p>
      </FormCard>
    </main>
  );
}

export default ForgotUsername;

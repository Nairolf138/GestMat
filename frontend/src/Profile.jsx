import React, { useEffect, useState, useContext, useMemo } from 'react';
import { api } from './api';
import Alert from './Alert.jsx';
import { GlobalContext } from './GlobalContext.jsx';
import { AuthContext } from './AuthContext.jsx';
import { useTranslation } from 'react-i18next';
import FormCard from './components/FormCard.jsx';

function Profile() {
  const { t, i18n } = useTranslation();
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
    preferences: {
      emailNotifications: {
        accountUpdates: true,
        loanRequests: true,
        loanStatusChanges: true,
        returnReminders: true,
        systemAlerts: true,
        structureUpdates: true,
      },
    },
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState({});
  const [language, setLanguage] = useState(
    () => localStorage.getItem('language') || i18n.language || 'fr',
  );

  const defaultPreferences = useMemo(
    () => ({
      emailNotifications: {
        accountUpdates: true,
        loanRequests: true,
        loanStatusChanges: true,
        returnReminders: true,
        systemAlerts: true,
        structureUpdates: true,
      },
    }),
    [],
  );

  useEffect(() => {
    if (user) {
      const structureId = user.structure?._id || user.structure || '';
      const preferences = {
        ...defaultPreferences,
        ...(user.preferences || {}),
        emailNotifications: {
          ...defaultPreferences.emailNotifications,
          ...(user.preferences?.emailNotifications || {}),
        },
      };

      const { structureUpdates, ...emailNotifications } =
        preferences.emailNotifications;

      if (structureUpdates !== undefined) {
        ['loanRequests', 'loanStatusChanges', 'returnReminders'].forEach((key) => {
          if (emailNotifications[key] === undefined) {
            emailNotifications[key] = structureUpdates;
          }
        });
      }

      preferences.emailNotifications = emailNotifications;
      setForm((f) => ({
        ...f,
        ...user,
        structure: structureId,
        password: '',
        preferences,
      }));
      setError('');
    } else {
      setError(t('profile.load_error'));
    }
  }, [user, t, defaultPreferences]);

  const structureName = useMemo(() => {
    if (!form.structure) return '';
    return (
      structures.find((s) => s._id === form.structure)?.name ||
      user?.structure?.name ||
      ''
    );
  }, [structures, form.structure, user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;
    const path = name.split('.');

    setForm((prevForm) => {
      const updatedForm = { ...prevForm };
      let cursor = updatedForm;
      for (let i = 0; i < path.length - 1; i += 1) {
        const key = path[i];
        cursor[key] = { ...(cursor[key] || {}) };
        cursor = cursor[key];
      }
    
      cursor[path[path.length - 1]] = inputValue;
      return updatedForm;
    });

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

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;
    setLanguage(newLanguage);
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [i18n, language]);

  return (
    <>
      <h1 className="h1">{t('profile.title')}</h1>
      <Alert message={error} />
      <Alert type="success" message={success} />
      <FormCard onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="form-label">{t('profile.username')}</label>
          <input name="username" className="form-control" value={form.username} disabled />
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
              aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            />
            {errors.firstName && (
              <div className="invalid-feedback" id="firstName-error" role="alert" aria-live="polite">
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
              aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            />
            {errors.lastName && (
              <div className="invalid-feedback" id="lastName-error" role="alert" aria-live="polite">
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
            <div className="invalid-feedback" id="email-error" role="alert" aria-live="polite">
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
            <div className="invalid-feedback" id="password-error" role="alert" aria-live="polite">
              {errors.password}
            </div>
          )}
        </div>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label">{t('profile.role')}</label>
            <input name="role" className="form-control" value={t(`roles.${form.role}`)} disabled />
          </div>
          <div className="col-md-6 mb-3">
            <label className="form-label">{t('profile.structure')}</label>
            <input name="structure" className="form-control" value={structureName} disabled />
          </div>
        </div>
        <div className="mt-4">
          <h2 className="h5">{t('profile.preferences.title')}</h2>
          <div className="mb-3">
            <h3 className="h6">{t('profile.preferences.email_notifications.title')}</h3>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="account-updates"
                name="preferences.emailNotifications.accountUpdates"
                checked={form.preferences.emailNotifications.accountUpdates}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="account-updates">
                {t('profile.preferences.email_notifications.account_updates')}
              </label>
              <div className="form-text">
                {t('profile.preferences.email_notifications.account_updates_help')}
              </div>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="loan-requests"
                name="preferences.emailNotifications.loanRequests"
                checked={form.preferences.emailNotifications.loanRequests}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="loan-requests">
                {t('profile.preferences.email_notifications.loan_requests')}
              </label>
              <div className="form-text">
                {t('profile.preferences.email_notifications.loan_requests_help')}
              </div>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="loan-status-changes"
                name="preferences.emailNotifications.loanStatusChanges"
                checked={form.preferences.emailNotifications.loanStatusChanges}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="loan-status-changes">
                {t('profile.preferences.email_notifications.loan_status_changes')}
              </label>
              <div className="form-text">
                {t('profile.preferences.email_notifications.loan_status_changes_help')}
              </div>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="return-reminders"
                name="preferences.emailNotifications.returnReminders"
                checked={form.preferences.emailNotifications.returnReminders}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="return-reminders">
                {t('profile.preferences.email_notifications.return_reminders')}
              </label>
              <div className="form-text">
                {t('profile.preferences.email_notifications.return_reminders_help')}
              </div>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="system-alerts"
                name="preferences.emailNotifications.systemAlerts"
                checked={form.preferences.emailNotifications.systemAlerts}
                onChange={handleChange}
              />
              <label className="form-check-label" htmlFor="system-alerts">
                {t('profile.preferences.email_notifications.system_alerts')}
              </label>
              <div className="form-text">
                {t('profile.preferences.email_notifications.system_alerts_help')}
              </div>
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="language-select">
              {t('profile.preferences.language')}
            </label>
            <select
              id="language-select"
              className="form-select"
              value={language}
              onChange={handleLanguageChange}
              aria-label={t('profile.preferences.language')}
            >
              <option value="fr">{t('profile.preferences.languages.fr')}</option>
              <option value="en">{t('profile.preferences.languages.en')}</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary">
          {t('profile.save')}
        </button>
      </FormCard>
    </>
  );
}

export default Profile;

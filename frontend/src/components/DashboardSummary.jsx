import React, { useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { AuthContext } from '../AuthContext.jsx';
import { ADMIN_ROLE } from '../../../roles';

function DashboardSummary() {
  const { t } = useTranslation();
  const { user } = useContext(AuthContext);
  const [counts, setCounts] = useState({ pending: 0, ongoing: 0, upcoming: 0 });
  const [error, setError] = useState('');
  const isAdmin = user?.role === ADMIN_ROLE;

  useEffect(() => {
    if (!isAdmin) return undefined;

    let isMounted = true;
    const controller = new AbortController();
    setError('');
    api('/stats/loans', { signal: controller.signal })
      .then((data) => {
        if (!isMounted) return;
        const map = data.reduce((acc, { _id, count }) => {
          acc[_id] = count;
          return acc;
        }, {});
        setCounts({
          pending: map.pending || 0,
          ongoing: map.ongoing || 0,
          upcoming: map.upcoming || 0,
        });
      })
      .catch(() => {
        if (!isMounted) return;
        setError(t('common.error'));
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [isAdmin, t]);

  if (!isAdmin) return null;

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.pending')}</h5>
          <p className="card-text">{counts.pending}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.ongoing')}</h5>
          <p className="card-text">{counts.ongoing}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.upcoming')}</h5>
          <p className="card-text">{counts.upcoming}</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;

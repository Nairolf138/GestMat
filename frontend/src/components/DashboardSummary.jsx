import React from 'react';
import { useTranslation } from 'react-i18next';

const defaultCounts = { pending: 0, ongoing: 0, upcoming: 0 };

function DashboardSummary({ counts = defaultCounts }) {
  const { t } = useTranslation();
  const { pending = 0, ongoing = 0, upcoming = 0 } = counts || defaultCounts;

  return (
    <div className="card-grid" style={{ marginBottom: 'var(--spacing-xl)' }}>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.pending')}</h5>
          <p className="card-text">{pending}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.ongoing')}</h5>
          <p className="card-text">{ongoing}</p>
        </div>
      </div>
      <div className="card">
        <div className="card-body">
          <h5 className="card-title h5">{t('dashboard.upcoming')}</h5>
          <p className="card-text">{upcoming}</p>
        </div>
      </div>
    </div>
  );
}

export default DashboardSummary;

import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n.js';

function ActivityRail({ items = [] }) {
  const { t } = useTranslation();

  if (!items.length) {
    return (
      <div className="activity-rail card">
        <div className="activity-rail-header">
          <h3 className="h4">{t('home.activity.title')}</h3>
        </div>
        <p className="muted">{t('home.activity.empty')}</p>
      </div>
    );
  }

  return (
    <div className="activity-rail card">
      <div className="activity-rail-header">
        <h3 className="h4">{t('home.activity.title')}</h3>
        <span className="activity-count">{items.length}</span>
      </div>
      <ul className="activity-list">
        {items.map((item) => {
          const formattedDate = item.date
            ? new Date(item.date).toLocaleString(i18n.language, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '';
          return (
            <li key={item.id} className="activity-item">
              <div className="activity-meta">
                <span className={`status-chip ${item.tone || 'info'}`}>
                  {item.label}
                </span>
                <span className="activity-date">{formattedDate}</span>
              </div>
              <Link to={item.href} className="activity-title">
                {item.title}
              </Link>
              {item.description && <p className="muted">{item.description}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ActivityRail;

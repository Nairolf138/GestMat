import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n.js';

const EVENT_ICONS = {
  success: 'fa-circle-check',
  warning: 'fa-triangle-exclamation',
  danger: 'fa-circle-xmark',
  info: 'fa-circle-info',
};

function ActivityRail({ items = [], totalCount = 0, seeAllHref }) {
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
        <div className="d-flex align-items-center gap-2">
          <h3 className="h4 mb-0">{t('home.activity.title')}</h3>
          <span className="activity-count">{totalCount || items.length}</span>
        </div>
        {seeAllHref && totalCount > items.length && (
          <Link className="small" to={seeAllHref}>
            {t('home.activity.view_all')}
          </Link>
        )}
      </div>
      <ul className="activity-list" aria-label={t('home.activity.list_label')}>
        {items.map((item) => {
          const formattedDate = item.date
            ? new Intl.DateTimeFormat(i18n.language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(item.date))
            : '';
          const icon = item.icon || EVENT_ICONS[item.tone] || EVENT_ICONS.info;
          return (
            <li key={item.id} className="activity-item">
              <div className="activity-meta">
                <span className={`status-chip ${item.tone || 'info'}`}>
                  <i className={`fa-solid ${icon}`} aria-hidden="true"></i>
                  <span>{item.label}</span>
                </span>
                <time className="activity-date" dateTime={item.date}>
                  {formattedDate || t('home.activity.date_unknown')}
                </time>
              </div>
              <Link to={item.href} className="activity-title">
                {item.title}
              </Link>
              {item.description && (
                <p className="muted" aria-label={t('home.activity.description_label')}>
                  {item.description}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ActivityRail;

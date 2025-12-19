import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function HomeHeader({ user, counts, onPrimaryAction }) {
  const { t } = useTranslation();
  const name = user?.firstName || user?.username || '';
  const structureName =
    user?.structure?.name || user?.structure?.label || user?.structureName;
  const primaryPath = user?.structure ? '/catalog' : '/loans/new';

  return (
    <div className="home-header card">
      <div className="home-hero">
        <p className="eyebrow">{t('home.hero.title')}</p>
        <h1 className="h1">{t('home.greeting', { name })}</h1>
        {structureName && <p className="muted">{structureName}</p>}
        <div className="hero-actions">
          <Link
            to={primaryPath}
            className="btn btn-primary"
            onClick={onPrimaryAction}
          >
            {t('home.hero.primary_action')}
          </Link>
          <Link className="btn btn-outline-secondary" to="/loans/new">
            {t('home.hero.secondary_action')}
          </Link>
        </div>
      </div>
      <div className="home-badges">
        <div className="badge-card">
          <span className="badge-count">{counts.pending || 0}</span>
          <span className="badge-label">{t('home.badges.pending')}</span>
        </div>
        <div className="badge-card">
          <span className="badge-count">{counts.ongoing || 0}</span>
          <span className="badge-label">{t('home.badges.ongoing')}</span>
        </div>
        <div className="badge-card">
          <span className="badge-count">{counts.upcoming || 0}</span>
          <span className="badge-label">{t('home.badges.upcoming')}</span>
        </div>
      </div>
    </div>
  );
}

export default HomeHeader;

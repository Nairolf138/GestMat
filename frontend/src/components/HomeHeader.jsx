import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function HomeHeader({ user, counts, onPrimaryAction }) {
  const { t } = useTranslation();
  const name = user?.firstName || user?.username || '';
  const structureName =
    user?.structure?.name || user?.structure?.label || user?.structureName;
  const primaryPath = user?.structure ? '/catalog' : '/loans/new';
  const directLoanPath = '/loans/new?mode=direct';
  const buildLoansLink = (tab, status) => {
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (status) params.set('status', status);
    return `/loans?${params.toString()}`;
  };

  const badgeItems = [
    {
      key: 'pendingApprovals',
      label: t('home.badges.pending_approvals'),
      count: counts?.pendingApprovals || 0,
      to: buildLoansLink('owner', 'pending'),
      icon: 'fa-inbox',
      tone: 'owner',
    },
    {
      key: 'pendingUnderReview',
      label: t('home.badges.pending_under_review'),
      count: counts?.pendingUnderReview || 0,
      to: buildLoansLink('borrower', 'pending'),
      icon: 'fa-magnifying-glass',
      tone: 'borrower',
    },
    {
      key: 'ownerActiveUpcoming',
      label: t('home.badges.owner_active_upcoming'),
      count: counts?.ownerActiveUpcoming || 0,
      to: buildLoansLink('owner', 'active_upcoming'),
      icon: 'fa-building-columns',
      tone: 'owner',
    },
    {
      key: 'borrowerActiveUpcoming',
      label: t('home.badges.borrower_active_upcoming'),
      count: counts?.borrowerActiveUpcoming || 0,
      to: buildLoansLink('borrower', 'active_upcoming'),
      icon: 'fa-arrow-right-arrow-left',
      tone: 'borrower',
    },
  ];

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
          <Link className="btn btn-outline-secondary" to={directLoanPath}>
            {t('home.hero.secondary_action')}
          </Link>
        </div>
      </div>
      <div className="home-badges">
        {badgeItems.map((badge) => (
          <Link
            key={badge.key}
            to={badge.to}
            className={`badge-card ${badge.tone}`}
            aria-label={`${badge.label} – ${badge.count}`}
          >
            <span className={`badge-icon ${badge.tone}`} aria-hidden="true">
              <i className={`fa-solid ${badge.icon}`}></i>
            </span>
            <span className="badge-meta">
              <span className="badge-count">{badge.count}</span>
              <span className="badge-label">{badge.label}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default HomeHeader;

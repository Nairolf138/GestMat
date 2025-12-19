import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoanSummaryItem from '../LoanSummaryItem.jsx';
import LoanPreviewSkeleton from './LoanPreviewSkeleton.jsx';

function LoanPreviewSection({
  title,
  loans = [],
  emptyMessage,
  previewCount = 5,
  counterLabel,
  onAccept,
  onDecline,
  actionInProgressId,
  loading = false,
}) {
  const { t } = useTranslation();
  const visibleLoans = loans.slice(0, previewCount);

  return (
    <section className="loan-section">
      <div className="loan-section-header">
        <h2 className="h2">{title}</h2>
        {counterLabel && loans.length > previewCount && (
          <span className="muted small">{counterLabel}</span>
        )}
      </div>
      <div className="card-grid loan-preview-grid">
        {loading &&
          Array.from({ length: previewCount }).map((_, idx) => (
            <LoanPreviewSkeleton key={`skeleton-${idx}`} />
          ))}
        {!loading &&
          visibleLoans.map((l) => (
            <LoanSummaryItem
              key={l._id}
              loan={l}
              onAccept={onAccept}
              onDecline={onDecline}
              actionInProgressId={actionInProgressId}
            />
          ))}
        {!loading && !loans.length && <div className="card">{emptyMessage}</div>}
      </div>
      <p className="loan-section-footer">
        <Link to="/loans">{t('home.view_all')}</Link>
      </p>
    </section>
  );
}

export default LoanPreviewSection;

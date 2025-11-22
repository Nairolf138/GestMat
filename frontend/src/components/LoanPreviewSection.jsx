import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoanSummaryItem from '../LoanSummaryItem.jsx';

function LoanPreviewSection({
  title,
  loans,
  emptyMessage,
  previewCount,
  counterLabel,
  onAccept,
  onDecline,
  actionInProgressId,
}) {
  const { t } = useTranslation();

  return (
    <>
      <h2 className="h2">{title}</h2>
      <div className="card-grid" style={{ marginBottom: 'var(--spacing-lg)' }}>
        {loans.slice(0, previewCount).map((l) => (
          <LoanSummaryItem
            key={l._id}
            loan={l}
            onAccept={onAccept}
            onDecline={onDecline}
            actionInProgressId={actionInProgressId}
          />
        ))}
        {!loans.length && <div className="card">{emptyMessage}</div>}
      </div>
      <p>
        {loans.length > previewCount && <span>{counterLabel} </span>}
        <Link to="/loans">{t('home.view_all')}</Link>
      </p>
    </>
  );
}

export default LoanPreviewSection;
